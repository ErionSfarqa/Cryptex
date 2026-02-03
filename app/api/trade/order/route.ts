import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { ensureProfileAndSettings } from "@/lib/supabase/ensure";
import { fetchLatestPrice, toMarketSymbol } from "@/lib/market";
import type { PostgrestError } from "@supabase/supabase-js";

const ALLOWED_SYMBOLS = new Set(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be signed in to place orders." }, { status: 401 });
    }

    await ensureProfileAndSettings(supabase, user);
    try {
      const { data: as } = await supabase
        .from("account_settings")
        .select("trading_disabled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (Boolean(as?.trading_disabled)) {
        return NextResponse.json({ error: "Trading disabled by admin." }, { status: 403 });
      }
    } catch {}

    const body = await req.json().catch(() => ({}));
    const symbol = typeof body.symbol === "string" ? body.symbol.trim() : "";

    function normalizeSide(v: unknown): "buy" | "sell" | null {
      const s = String(v ?? "").trim().toLowerCase();
      if (s === "buy" || s === "b" || s === "long") return "buy";
      if (s === "sell" || s === "s" || s === "short") return "sell";
      if (s === "buy") return "buy";
      if (s === "sell") return "sell";
      return null;
    }
    function normalizeOrderType(v: unknown): "market" | "limit" {
      const t = String(v ?? "").trim().toLowerCase();
      if (t === "limit" || t === "l") return "limit";
      return "market";
    }

    const side = normalizeSide(body.side ?? body.sideValue ?? body.sideType);
    const orderType = normalizeOrderType(body.order_type ?? body.orderType);
    const quantity = Number(body.quantity ?? body.q);
    const limitPrice = body.limitPrice != null ? Number(body.limitPrice) : null;
    const sl = body.sl ?? body.stopLoss ?? body.stop_loss ?? null;
    const tp = body.tp ?? body.takeProfit ?? body.take_profit ?? null;
    const slValue = sl != null ? Number(sl) : null;
    const tpValue = tp != null ? Number(tp) : null;

    const marketSymbol = toMarketSymbol(symbol || "BTC");
    if (!ALLOWED_SYMBOLS.has(marketSymbol)) {
      return NextResponse.json({ error: "Unsupported symbol. Use BTC, ETH, or SOL." }, { status: 400 });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be a number greater than 0." }, { status: 400 });
    }

    if (!side) {
      return NextResponse.json({ error: "Side must be BUY or SELL." }, { status: 400 });
    }

    let fillPrice: number | null = null;
    if (orderType === "limit") {
      const lp = limitPrice ?? 0;
      if (!Number.isFinite(lp) || lp <= 0) {
        return NextResponse.json({ error: "Limit orders require a valid limitPrice." }, { status: 400 });
      }
      fillPrice = lp;
    } else {
      const latest = await fetchLatestPrice(marketSymbol);
      if (latest == null || !Number.isFinite(latest)) {
        return NextResponse.json(
          { error: "Could not get latest price. Try again in a moment." },
          { status: 502 }
        );
      }
      fillPrice = latest;
    }
    
    // SL/TP Validation
    if (slValue !== null && !Number.isFinite(slValue)) return NextResponse.json({ error: "Invalid SL price." }, { status: 400 });
    if (tpValue !== null && !Number.isFinite(tpValue)) return NextResponse.json({ error: "Invalid TP price." }, { status: 400 });
    if (slValue !== null && slValue <= 0) return NextResponse.json({ error: "Stop Loss must be greater than 0." }, { status: 400 });
    if (tpValue !== null && tpValue <= 0) return NextResponse.json({ error: "Take Profit must be greater than 0." }, { status: 400 });

    if (side === "buy") {
      if (slValue !== null && slValue >= fillPrice) return NextResponse.json({ error: "Stop Loss must be below entry price for Buy." }, { status: 400 });
      if (tpValue !== null && tpValue <= fillPrice) return NextResponse.json({ error: "Take Profit must be above entry price for Buy." }, { status: 400 });
    } else {
      if (slValue !== null && slValue <= fillPrice) return NextResponse.json({ error: "Stop Loss must be above entry price for Sell." }, { status: 400 });
      if (tpValue !== null && tpValue >= fillPrice) return NextResponse.json({ error: "Take Profit must be below entry price for Sell." }, { status: 400 });
    }

    // Insert Order (History)
    const orderPayload: Record<string, unknown> = {
      user_id: user.id,
      symbol: marketSymbol,
      side,
      order_type: orderType,
      quantity,
      price: fillPrice,
      status: "filled",
      realized_pnl: 0, // Opening new position, no realized PnL yet
      sl: slValue,
      tp: tpValue,
    };

    let attempt = await supabase.from("demo_orders").insert(orderPayload).select("*").single();
    let order = attempt.data ?? null;
    let orderError = attempt.error;

    if (orderError) {
      const msg = String(orderError.message ?? "");
      const m = msg.toLowerCase();
      if (
        m.includes("schema cache") ||
        msg.includes('column "sl"') ||
        msg.includes("column \"sl\"") ||
        msg.includes('column "tp"') ||
        msg.includes("column \"tp\"")
      ) {
        const payloadNoStops = { ...orderPayload };
        delete payloadNoStops.sl;
        delete payloadNoStops.tp;
        attempt = await supabase.from("demo_orders").insert(payloadNoStops).select("*").single();
        order = attempt.data ?? null;
        orderError = attempt.error;
      }
      if (orderError) {
        return NextResponse.json({ error: orderError.message }, { status: 500 });
      }
    }

    // Insert Position (always new row, separate position per order)
    const { error: posError } = await supabase.from("demo_positions").insert({
      user_id: user.id,
      symbol: marketSymbol,
      // write both fields for compatibility
      quantity: side === "buy" ? quantity : -quantity,
      qty: side === "buy" ? quantity : -quantity,
      avg_price: fillPrice,
      unrealized_pnl: 0,
      updated_at: new Date().toISOString(),
      sl: slValue,
      tp: tpValue,
    });

    if (posError) {
      // If SL/TP columns don't exist yet, retry without them
      if (posError.message?.includes("column \"sl\" does not exist")) {
         await supabase.from("demo_positions").insert({
            user_id: user.id,
            symbol: marketSymbol,
            quantity: side === "buy" ? quantity : -quantity,
            qty: side === "buy" ? quantity : -quantity,
            avg_price: fillPrice,
            unrealized_pnl: 0,
            updated_at: new Date().toISOString(),
          });
      } else if (posError.code === "42P01") {
        return NextResponse.json(
          { error: "Trading is not set up. Run the Supabase schema to create demo_positions." },
          { status: 503 }
        );
      } else {
        return NextResponse.json(
          { error: posError.message || "Order saved but position update failed." },
          { status: 500 }
        );
      }
    }

    // Update demo_balance: subtract for buys, add for sells (single source of truth: account_settings.demo_balance)
    try {
      const { data: settings } = await supabase
        .from("account_settings")
        .select("demo_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      const currentBalance = Number(settings?.demo_balance ?? 10000);
      const notional = Number(quantity) * Number(fillPrice ?? 0);
      const balanceChange = side === "buy" ? -notional : notional;
      const newBalance = currentBalance + balanceChange;
      await supabase.from("account_settings").upsert({ user_id: user.id, demo_balance: newBalance }, { onConflict: "user_id" });
    } catch (err) {
      console.error("Failed to update demo balance", err);
    }

    return NextResponse.json({
      ok: true,
      filled: true,
      orderId: order?.id,
      symbol: marketSymbol,
      side,
      quantity,
      price: fillPrice,
      status: "filled",
      sl: slValue,
      tp: tpValue
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Order failed." },
      { status: 500 }
    );
  }
}
