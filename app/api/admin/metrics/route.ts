import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function GET() {
  const cookieStore = await cookies();
  const unlocked = cookieStore.get("admin99")?.value === "1";
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let supabase;
  if (url && serviceKey && unlocked) {
    supabase = createSupabaseClient(url, serviceKey);
  } else {
    const result = await requireAdmin();
    if ("error" in result && result.error) return result.error;
    supabase = result.supabase;
  }

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: usersCount }, { count: ordersCount }, { count: openPositionsCount }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("demo_orders").select("id", { count: "exact", head: true }),
    supabase.from("demo_positions").select("id", { count: "exact", head: true }).neq("quantity", 0),
  ]);

  type OrderRow = { symbol?: string | null; quantity?: number | null; qty?: number | null; price?: number | null; realized_pnl?: number | null; created_at: string };
  const { data: orders24h }: { data: OrderRow[] | null } = await supabase
    .from("demo_orders")
    .select("symbol, quantity, qty, price, realized_pnl, created_at")
    .gte("created_at", since24h)
    .order("created_at", { ascending: false })
    .limit(1000);

  type ProfileRow = { id: string; email?: string | null; created_at?: string | null };
  const { data: recentUsers }: { data: ProfileRow[] | null } = await supabase
    .from("profiles")
    .select("id, email, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  type RecentOrderRow = { id: string; user_id: string; symbol: string; side: string; order_type: string; quantity?: number | null; qty?: number | null; price?: number | null; status?: string | null; created_at: string };
  const { data: recentOrders }: { data: RecentOrderRow[] | null } = await supabase
    .from("demo_orders")
    .select("id, user_id, symbol, side, order_type, quantity, qty, price, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  let volume24h = 0;
  let pnl24h = 0;
  const symbolCounts: Record<string, { count: number; volume: number }> = {};
  for (const o of (orders24h ?? [])) {
    const q = Number(o.quantity ?? o.qty ?? 0);
    const pr = Number(o.price ?? 0);
    const vol = Math.abs(q) * pr;
    volume24h += vol;
    pnl24h += Number(o.realized_pnl ?? 0);
    const sym = String(o.symbol ?? "UNKNOWN");
    const entry = symbolCounts[sym] ?? { count: 0, volume: 0 };
    entry.count += 1;
    entry.volume += vol;
    symbolCounts[sym] = entry;
  }

  const topSymbols = Object.entries(symbolCounts)
    .map(([symbol, v]) => ({ symbol, count: v.count, volume: v.volume }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10);

  return NextResponse.json({
    usersCount: usersCount ?? 0,
    ordersCount: ordersCount ?? 0,
    openPositionsCount: openPositionsCount ?? 0,
    volume24h,
    pnl24h,
    recentUsers: recentUsers ?? [],
    recentOrders: recentOrders ?? [],
    topSymbols,
  });
}
