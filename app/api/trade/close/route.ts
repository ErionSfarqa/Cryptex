import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { ensureProfileAndSettings } from "@/lib/supabase/ensure";
import { fetchLatestPrice, toMarketSymbol } from "@/lib/market";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureProfileAndSettings(supabase, user);

    const body = await req.json().catch(() => ({}));
    const symbol = toMarketSymbol(String(body?.symbol ?? ""));
    const quantity = Number(body?.quantity ?? 0);
    const closeType = String(body?.order_type ?? body?.type ?? "").toLowerCase(); // 'market' | 'limit' | 'sl' | 'tp'
    const positionId = body?.id;

    const marketSymbol = symbol;
    const latestPrice = await fetchLatestPrice(marketSymbol);

    if (!latestPrice) {
      return NextResponse.json({ error: "Market data unavailable" }, { status: 502 });
    }

    // Load position
    type PositionRow = {
      id: string;
      quantity: number;
      avg_price: number;
      sl: number | null;
      tp: number | null;
      symbol: string;
    };
    let position: PositionRow | null = null;

    if (positionId) {
      const { data } = await supabase
        .from("demo_positions")
        .select("*")
        .eq("id", positionId)
        .single();
      position = data as PositionRow | null;
    } else {
      // Fallback: try to find one by symbol (legacy behavior)
      const { data } = await supabase
        .from("demo_positions")
        .select("*")
        .eq("user_id", user.id)
        .eq("symbol", marketSymbol)
        .neq("quantity", 0)
        .limit(1)
        .maybeSingle();
      position = data as PositionRow | null;
    }

    if (!position || Number(position.quantity) === 0) {
      return NextResponse.json({ error: "No open position found." }, { status: 400 });
    }

    const qty = Number(position.quantity);
    const isLong = qty > 0;
    const sl = position.sl ? Number(position.sl) : null;
    const tp = position.tp ? Number(position.tp) : null;

    let hit = false;
    let reason = "";

    // Market close: allow ANY TIME
    if (closeType === "market" || !closeType) {
      hit = true;
      reason = "Market Close";
    } else {
      // Conditional close: verify SL/TP hit
      if (closeType === "sl" && sl) {
        if (isLong && latestPrice <= sl * 1.005) hit = true; 
        if (!isLong && latestPrice >= sl * 0.995) hit = true;
        reason = "Stop Loss";
      } else if (closeType === "tp" && tp) {
        if (isLong && latestPrice >= tp * 0.995) hit = true;
        if (!isLong && latestPrice <= tp * 1.005) hit = true;
        reason = "Take Profit";
      }
    }

    if (!hit) {
      // Strict confirmation on current price for conditional closes
      if (isLong) {
        if (sl && latestPrice <= sl) { hit = true; reason = "Stop Loss"; }
        else if (tp && latestPrice >= tp) { hit = true; reason = "Take Profit"; }
      } else {
        if (sl && latestPrice >= sl) { hit = true; reason = "Stop Loss"; }
        else if (tp && latestPrice <= tp) { hit = true; reason = "Take Profit"; }
      }
    }

    if (!hit) {
      return NextResponse.json({ error: "Condition not met based on current price " + latestPrice }, { status: 400 });
    }

    const side = isLong ? "sell" : "buy";
    // If closing via ID, we close up to the full amount of THIS position.
    // If user requested more than this position has, we clamp it.
    const closeQty = quantity > 0 ? Math.min(Math.abs(qty), Math.abs(quantity)) : Math.abs(qty);
    const avgEntry = Number(position.avg_price);
    
    // Realized PnL
    let realized = 0;
    if (isLong) {
      realized = closeQty * (latestPrice - avgEntry);
    } else {
      realized = closeQty * (avgEntry - latestPrice);
    }

    // 1. Insert Order (History)
    const { error: orderErr } = await supabase.from("demo_orders").insert({
      user_id: user.id,
      symbol: marketSymbol,
      side: side,
      order_type: "market",
      quantity: closeQty,
      price: latestPrice,
      status: "filled",
      realized_pnl: realized,
    });

    if (orderErr) throw orderErr;

    // 2. Update Position (Reduce qty or Close)
    const newQty = qty - (isLong ? closeQty : -closeQty);
    
    // Check if fully closed (approx 0 due to float)
    const isFullyClosed = Math.abs(newQty) < 0.00000001;

    const { error: posErr } = await supabase.from("demo_positions").update({
      quantity: isFullyClosed ? 0 : newQty,
      qty: isFullyClosed ? 0 : newQty,
      unrealized_pnl: 0,
      updated_at: new Date().toISOString(),
      sl: isFullyClosed ? null : position.sl,
      tp: isFullyClosed ? null : position.tp
    }).eq("id", position.id);

    if (posErr) throw posErr;

    // 3. Update Balance
    const { data: settings } = await supabase.from("account_settings").select("demo_balance").eq("user_id", user.id).maybeSingle();
    const currentBalance = Number(settings?.demo_balance ?? 10000);
    // When opening, we subtracted Notional.
    // When closing, we add back Notional + PnL = (Entry + (Exit-Entry)) * Qty = Exit * Qty
    // So we just add Exit Value back to balance?
    // Wait.
    // Balance Logic:
    // Open Long: Balance -= Price * Qty.
    // Close Long: Balance += Price * Qty.
    // PnL is implicit in the difference.
    // This logic holds for simple spot-like balance tracking.
    const notional = closeQty * latestPrice;
    const balanceChange = side === "buy" ? -notional : notional; // If we are SELLING (closing long), we add. If BUYING (closing short), we subtract?
    // Wait. If Closing Short (Buying), we pay money.
    // Short Open: Balance += Price * Qty (Borrow and sell).
    // Short Close: Balance -= Price * Qty (Buy back).
    // Correct.
    
    const newBalance = currentBalance + balanceChange;
    
    await supabase.from("account_settings").update({ demo_balance: newBalance }).eq("user_id", user.id);

    // 4. Create Notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: `${reason} Triggered`,
      message: `${marketSymbol} position closed at ${latestPrice} (${reason}). PnL: ${realized.toFixed(2)}`,
      type: realized >= 0 ? "success" : "warning"
    });

    return NextResponse.json({ ok: true, realizedPnl: realized });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
