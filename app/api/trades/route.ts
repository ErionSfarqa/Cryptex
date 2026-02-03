import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { ensureProfileAndSettings } from "@/lib/supabase/ensure";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await ensureProfileAndSettings(supabase, user);

  const { searchParams } = new URL(req.url ?? "", "http://localhost");
  const symbol = searchParams.get("symbol")?.trim().toUpperCase();

  let query = supabase
    .from("demo_orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (symbol) {
    const marketSymbol = symbol.endsWith("USDT") ? symbol : `${symbol}USDT`;
    query = query.eq("symbol", marketSymbol);
  }

  const { data: orders, error: ordersErr } = await query;

  const trades = (ordersErr?.code === "42P01" ? [] : orders ?? []).map((o) => ({
    id: o.id,
    symbol: o.symbol,
    side: String((o as { side?: string }).side ?? "").toUpperCase(),
    type: String((o as { order_type?: string }).order_type ?? "").toUpperCase(),
    qty: Number((o as { quantity?: number }).quantity ?? 0),
    fillPrice: Number(o.price ?? 0),
    realizedPnl: o.realized_pnl != null ? Number(o.realized_pnl) : null,
    status: String(o.status ?? "").toUpperCase(),
    createdAt: o.created_at,
    filledAt: o.created_at,
  }));
  return NextResponse.json({ trades });
}
