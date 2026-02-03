import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { ensureProfileAndSettings } from "@/lib/supabase/ensure";
import { fetchLatestPrice, toMarketSymbol } from "@/lib/market";

export async function POST() {
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
    .eq("user_id", user.id);

  if (posErr?.code === "42P01") {
    return NextResponse.json({ ok: false, message: "Positions table missing." }, { status: 503 });
  }

  const openPositions = (positionsRows ?? []).filter((p) => Number((p as { quantity?: number }).quantity ?? (p as { qty?: number }).qty ?? 0) !== 0);

  const results: Array<{ symbol: string; closed: boolean; reason?: string }> = [];

  for (const p of openPositions) {
    const symbol = toMarketSymbol(String(p.symbol));
    const qty = Number((p as { quantity?: number }).quantity ?? (p as { qty?: number }).qty ?? 0);
    const sl = (p as { sl?: number | null }).sl ?? null;
    const tp = (p as { tp?: number | null }).tp ?? null;

    if (!Number.isFinite(qty) || qty === 0) continue;
    if (sl == null && tp == null) {
      results.push({ symbol, closed: false });
      continue;
    }

    const latest = await fetchLatestPrice(symbol);
    if (latest == null) {
      results.push({ symbol, closed: false });
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

    if (!trigger) {
      results.push({ symbol, closed: false });
      continue;
    }

    const side = isLong ? "sell" : "buy";
    const closeQty = Math.abs(qty);
    const prevAvg = Number((p as { avg_price?: number }).avg_price ?? 0);
    let realized = 0;
    if (isLong && side === "sell") realized = closeQty * (latest - prevAvg);
    if (!isLong && side === "buy") realized = closeQty * (prevAvg - latest);

    const insertOrder = {
      user_id: user.id,
      symbol,
      side,
      order_type: "market",
      quantity: closeQty,
      price: latest,
      status: "filled",
      realized_pnl: realized,
    } as Record<string, unknown>;

    await supabase.from("demo_orders").insert(insertOrder);

    await supabase.from("demo_positions").update(
      {
        quantity: 0,
        qty: 0,
        avg_price: 0,
        unrealized_pnl: 0,
        sl: null,
        tp: null,
        updated_at: new Date().toISOString(),
      }
    ).eq("id", p.id);

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
      await supabase.from("account_settings").upsert({ user_id: user.id, demo_balance: newBalance }, { onConflict: "user_id" });
    } catch {
      // ignore balance update errors
    }

    results.push({ symbol, closed: true, reason });
  }

  return NextResponse.json({ ok: true, results });
}
