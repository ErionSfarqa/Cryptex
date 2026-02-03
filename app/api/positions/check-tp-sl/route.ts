import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { ensureProfileAndSettings } from "@/lib/supabase/ensure";
import { fetchLatestPrice, toMarketSymbol } from "@/lib/market";

export async function POST() {
  try {
    const supabase = await createSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await ensureProfileAndSettings(supabase, user);

    const { data: positionsRows, error: posErr } = await supabase
      .from("demo_positions")
      .select("id, symbol, quantity, avg_price, sl, tp")
      .eq("user_id", user.id)
      .neq("quantity", 0);

    if (posErr?.code === "42P01") {
      return NextResponse.json({ ok: false, message: "Positions table missing." }, { status: 503 });
    }

    const openPositions = (positionsRows ?? []).filter((p) => {
      const q = Number((p as { quantity?: number }).quantity ?? (p as { qty?: number }).qty ?? 0);
      return Number.isFinite(q) && q !== 0;
    });

    const results: Array<{ id: string; symbol: string; closed: boolean; reason?: string }> = [];

    for (const p of openPositions) {
      const id = String((p as { id?: string }).id ?? "");
      const symbol = toMarketSymbol(String(p.symbol));
      const qty = Number((p as { quantity?: number }).quantity ?? (p as { qty?: number }).qty ?? 0);
      const sl = (p as { sl?: number | null }).sl ?? null;
      const tp = (p as { tp?: number | null }).tp ?? null;

      if (!id || !Number.isFinite(qty) || qty === 0) continue;
      if (sl == null && tp == null) {
        results.push({ id, symbol, closed: false });
        continue;
      }

      const latest = await fetchLatestPrice(symbol);
      if (latest == null) {
        results.push({ id, symbol, closed: false });
        continue;
      }

      const isLong = qty > 0;
      let trigger = false;
      let reason: "Stop Loss" | "Take Profit" | undefined = undefined;

      if (isLong) {
        if (sl != null && latest <= sl) {
          trigger = true;
          reason = "Stop Loss";
        } else if (tp != null && latest >= tp) {
          trigger = true;
          reason = "Take Profit";
        }
      } else {
        if (sl != null && latest >= sl) {
          trigger = true;
          reason = "Stop Loss";
        } else if (tp != null && latest <= tp) {
          trigger = true;
          reason = "Take Profit";
        }
      }

      if (!trigger || !reason) {
        results.push({ id, symbol, closed: false });
        continue;
      }

      const closeQty = Math.abs(qty);
      const prevAvg = Number((p as { avg_price?: number }).avg_price ?? 0);
      const side = isLong ? "sell" : "buy";
      const realized = isLong ? closeQty * (latest - prevAvg) : closeQty * (prevAvg - latest);

      const { data: updated } = await supabase
        .from("demo_positions")
        .update({
          quantity: 0,
          qty: 0,
          avg_price: 0,
          unrealized_pnl: 0,
          sl: null,
          tp: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .neq("quantity", 0)
        .select("id")
        .maybeSingle();

      if (!updated) {
        results.push({ id, symbol, closed: false });
        continue;
      }

      await supabase.from("demo_orders").insert({
        user_id: user.id,
        symbol,
        side,
        order_type: "market",
        quantity: closeQty,
        price: latest,
        status: "filled",
        realized_pnl: realized,
      });

      try {
        const { data: settings } = await supabase
          .from("account_settings")
          .select("demo_balance")
          .eq("user_id", user.id)
          .maybeSingle();
        const currentBalance = Number(settings?.demo_balance ?? 10000);
        const notional = Number(closeQty) * Number(latest ?? 0);
        const balanceChange = side === "buy" ? -notional : notional;
        const newBalance = currentBalance + balanceChange;
        await supabase
          .from("account_settings")
          .upsert({ user_id: user.id, demo_balance: newBalance }, { onConflict: "user_id" });
      } catch {
        // ignore balance update errors
      }

      await supabase.from("notifications").insert({
        user_id: user.id,
        title: `${reason} Triggered`,
        message: `${symbol} position closed at ${latest} (${reason}). PnL: ${realized.toFixed(2)}`,
        type: realized >= 0 ? "success" : "warning",
      });

      results.push({ id, symbol, closed: true, reason });
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to check TP/SL." },
      { status: 500 }
    );
  }
}
