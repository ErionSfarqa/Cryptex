import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { ensureProfileAndSettings } from "@/lib/supabase/ensure";
import { fetchLatestPrice } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await ensureProfileAndSettings(supabase, user);

  const { data: settings } = await supabase
    .from("account_settings")
    .select("demo_balance")
    .eq("user_id", user.id)
    .maybeSingle();

  // Balance: single source of truth in account_settings.demo_balance; default 10,000 for new users
  const balance = Number(settings?.demo_balance ?? 10000);

  const { data: positionsRows, error: posErr } = await supabase
    .from("demo_positions")
    .select("id, symbol, quantity, avg_price, unrealized_pnl, updated_at, sl, tp")
    .eq("user_id", user.id);

  // Only open positions: quantity !== 0 (closed positions excluded)
  const openRows = (posErr?.code === "42P01" ? [] : positionsRows ?? []).filter((p) => {
    const q = Number((p as { quantity?: number }).quantity ?? (p as { qty?: number }).qty ?? 0);
    return q !== 0;
  });

  const enriched = await Promise.all(
    openRows.map(async (p) => {
      const quantity = Number((p as { quantity?: number }).quantity ?? (p as { qty?: number }).qty ?? 0);
      const avg = Number((p as { avg_price?: number }).avg_price ?? 0);
      
      const latestPrice = await fetchLatestPrice(p.symbol) ?? 0;

      const marketValue = Math.abs(quantity) * latestPrice;
      // unrealized_pnl = (current_market_price - avg_entry_price) * quantity
      // For LONG (qty > 0): (price - avg) * qty
      // For SHORT (qty < 0): (price - avg) * qty => (price - avg) * -abs(qty) => (avg - price) * abs(qty)
      const unrealized = latestPrice > 0 ? quantity * (latestPrice - avg) : 0;

      return {
        id: (p as { id?: string }).id,
        assetSymbol: p.symbol,
        qty: quantity,
        avgEntry: avg,
        unrealizedPnl: unrealized,
        latestPrice,
        marketValue,
        updated_at: p.updated_at,
        sl: (p as { sl?: number | null }).sl ?? null,
        tp: (p as { tp?: number | null }).tp ?? null,
      } as const;
    })
  );

  const positions = enriched;
  // equity = balance + sum(unrealized PnL of all open positions)
  // Wait, equity = balance + unrealized PnL.
  // "Balance" usually means "Cash Balance".
  // "Equity" = Cash Balance + Unrealized PnL.
  // The previous code was: equity = balance + positions.reduce((acc, p) => acc + (p.marketValue ?? 0), 0);
  // That's WRONG. Market Value is the total value of the assets.
  // If I have $10k cash and buy 1 BTC at $50k. Cash becomes -$40k (if margin) or $0 (if spot).
  // If this is a SPOT trading app (which it seems to be, no margin logic explicitly seen besides negative balance potential):
  // If I buy 1 BTC for $10k. Balance becomes $0. Equity is $10k (1 BTC value).
  // So Equity = Balance + Market Value (for Longs).
  // But for Shorts?
  // If I short 1 BTC at $50k. Balance increases by $50k? Or is it margin?
  // The `demo_balance` update logic in `api/trade/order/route.ts` says:
  // `balanceChange = side === "buy" ? -notional : notional;`
  // So if I buy $10k worth, balance drops by $10k.
  // If I sell (short) $10k worth, balance increases by $10k.
  // So `balance` represents "Cash".
  // For Longs: Equity = Cash + Market Value.
  // For Shorts: Equity = Cash - Market Liability?
  // Let's trace:
  // Start $10k. Short 1 BTC at $10k. Balance = $20k.
  // Price stays $10k. Liability = $10k. Equity = $20k - $10k = $10k. Correct.
  // Price goes to $11k. Liability = $11k. Equity = $20k - $11k = $9k. Loss $1k. Correct.
  // So Equity = Balance + Sum(Signed Market Value)?
  // Long: qty > 0. Market Value = qty * price.
  // Short: qty < 0. Market Value = qty * price (negative).
  // So Equity = Balance + Sum(qty * price).
  
  const totalMarketValue = positions.reduce((acc, p) => acc + (p.qty * p.latestPrice), 0);
  const equity = balance + totalMarketValue;

  return NextResponse.json({
    balance,
    equity,
    positions,
  });
}
