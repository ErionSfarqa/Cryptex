import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminSupabaseClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const unlocked = cookieStore.get("admin99")?.value === "1";
    if (!unlocked) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const hasUrl = Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
    const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const hasServiceKey = hasSupabaseAdminEnv();
    console.log("[admin99] env", { route: "overview", hasUrl, hasAnon, hasServiceKey });

    const admin = await getAdminSupabaseClient();
    if ("error" in admin) return admin.error;
    const { supabase, mode } = admin;
    const useService = mode === "service";
    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [ordersUsersFallback, positionsUsersFallback] = await Promise.all([
      supabase.from("demo_orders").select("user_id"),
      supabase.from("demo_positions").select("user_id"),
    ]);

    let usersCount = 0;
    let users30dData: { created_at?: string | null }[] = [];

    if (useService) {
      const [usersListRes, users30dRes, users30dResAuth] = await Promise.all([
        supabase.auth.admin.listUsers({ page: 1, perPage: 1 }),
        supabase
          .schema("auth")
          .from("users")
          .select("id, created_at")
          .gte("created_at", since30d.toISOString()),
        supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);
      const total = (usersListRes.data as unknown as { total?: number } | null)?.total;
      usersCount = typeof total === "number" ? total : 0;
      users30dData =
        users30dRes.error == null && users30dRes.data != null
          ? users30dRes.data
          : (users30dResAuth.data?.users ?? []) as { created_at?: string | null }[];
    } else {
      const [usersCountRes, users30dRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id, created_at")
          .gte("created_at", since30d.toISOString()),
      ]);
      usersCount = usersCountRes.count ?? 0;
      users30dData = users30dRes.data ?? [];
    }

    if (!usersCount) {
      const ids = new Set(
        [...(ordersUsersFallback.data ?? []), ...(positionsUsersFallback.data ?? [])]
          .map((r: { user_id?: string | null }) => String(r.user_id ?? ""))
          .filter(Boolean)
      );
      usersCount = ids.size;
    }

    const [
      ordersCountRes,
      positionsCountRes,
      openPositionsCountRes,
      closedTradesRes,
      realizedPnlRes,
      orders24hRes,
      recentOrdersRes,
      orders30dRes,
    ] = await Promise.all([
      supabase.from("demo_orders").select("id", { count: "exact", head: true }),
      supabase.from("demo_positions").select("id", { count: "exact", head: true }),
      supabase
        .from("demo_positions")
        .select("id", { count: "exact", head: true })
        .or("quantity.neq.0,qty.neq.0"),
      supabase.from("demo_orders").select("id", { count: "exact", head: true }).eq("status", "filled"),
      supabase.from("demo_orders").select("realized_pnl"),
      supabase
        .from("demo_orders")
        .select("symbol, quantity, qty, price, realized_pnl, created_at")
        .gte("created_at", since24h),
      supabase
        .from("demo_orders")
        .select("id, user_id, symbol, side, order_type, quantity, qty, price, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("demo_orders")
        .select("price, quantity, qty, realized_pnl, created_at")
        .gte("created_at", since30d.toISOString()),
    ]);
    const ordersCount = ordersCountRes.count ?? 0;
    const totalPositions = positionsCountRes.count ?? 0;
    const openPositionsCount = openPositionsCountRes.count ?? 0;
    const closedTradesCount = closedTradesRes.count ?? 0;
    const totalRealizedPnl = (realizedPnlRes.data ?? []).reduce(
      (acc, row) => acc + Number((row as { realized_pnl?: number | null }).realized_pnl ?? 0),
      0
    );

    console.log("[admin99:overview] counts", {
      usersCount,
      ordersCount,
      totalPositions,
      openPositionsCount,
      closedTradesCount,
      totalRealizedPnl,
    });

    let volume24h = 0;
    let pnl24h = 0;
    const symbolCounts: Record<string, { count: number; volume: number }> = {};
    for (const o of (orders24hRes.data ?? [])) {
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

    const days: string[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days.push(dateKey(d));
    }

    const usersPerDayMap: Record<string, number> = {};
    for (const u of users30dData ?? []) {
      const created = (u as { created_at?: string | null }).created_at;
      if (!created) continue;
      const key = dateKey(new Date(created));
      usersPerDayMap[key] = (usersPerDayMap[key] ?? 0) + 1;
    }

    const ordersPerDayMap: Record<string, number> = {};
    const pnlPerDayMap: Record<string, number> = {};
    for (const o of orders30dRes.data ?? []) {
      const key = dateKey(new Date(o.created_at as string));
      ordersPerDayMap[key] = (ordersPerDayMap[key] ?? 0) + 1;
      pnlPerDayMap[key] = (pnlPerDayMap[key] ?? 0) + Number(o.realized_pnl ?? 0);
    }

    const usersPerDay = days.map((d) => ({ date: d, value: usersPerDayMap[d] ?? 0 }));
    const ordersPerDay = days.map((d) => ({ date: d, value: ordersPerDayMap[d] ?? 0 }));
    const pnlPerDay = days.map((d) => ({ date: d, value: pnlPerDayMap[d] ?? 0 }));

    return NextResponse.json({
      totalUsers: usersCount,
      totalOrders: ordersCount,
      totalPositions,
      openPositions: openPositionsCount,
      totalPositionsOpen: openPositionsCount,
      totalClosedTrades: closedTradesCount,
      totalRealizedPnl,
      totalVolume24h: volume24h,
      totalPnL24h: pnl24h,
      topSymbols,
      recentOrders: recentOrdersRes.data ?? [],
      usersPerDay,
      ordersPerDay,
      pnlPerDay,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load overview." },
      { status: 500 }
    );
  }
}
