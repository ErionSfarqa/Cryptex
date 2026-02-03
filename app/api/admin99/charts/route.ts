import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminSupabaseClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

function dateKeyFromIso(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const unlocked = cookieStore.get("admin99")?.value === "1";
    if (!unlocked) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const hasUrl = Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
    const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const hasServiceRole = hasSupabaseAdminEnv();
    console.log("[admin99] env", { route: "charts", hasUrl, hasAnon, hasServiceRole });

    const admin = await getAdminSupabaseClient();
    if ("error" in admin) return admin.error;
    const { supabase, mode } = admin;
    const useService = mode === "service";
    const { searchParams } = new URL(req.url ?? "", "http://localhost");
    const days = Math.max(1, Math.min(90, Number(searchParams.get("days") ?? 30) || 30));

    const now = new Date();
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

    const [ordersRes, positionsRes] = await Promise.all([
      supabase
        .from("demo_orders")
        .select("created_at, realized_pnl, quantity, qty, price")
        .gte("created_at", since)
        .order("created_at", { ascending: true }),
      supabase
        .from("demo_positions")
        .select("symbol, quantity, qty")
        .order("updated_at", { ascending: false })
        .limit(2000),
    ]);

    if (ordersRes.error) console.log("[admin99:charts] orders error", ordersRes.error.message);
    if (positionsRes.error) console.log("[admin99:charts] positions error", positionsRes.error.message);

    let users: Array<{ created_at?: string | null }> = [];
    if (useService) {
      const usersRes = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersRes.error) console.log("[admin99:charts] users error", usersRes.error.message);
      users = (usersRes.data?.users ?? []) as Array<{ created_at?: string | null }>;
    } else {
      const usersRes = await supabase.from("profiles").select("created_at").gte("created_at", since);
      if (usersRes.error) console.log("[admin99:charts] users error", usersRes.error.message);
      users = (usersRes.data ?? []) as Array<{ created_at?: string | null }>;
    }

    const dayLabels: string[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayLabels.push(d.toISOString().slice(0, 10));
    }

    const ordersPerDayMap: Record<string, number> = {};
    const pnlPerDayMap: Record<string, number> = {};
    for (const o of ordersRes.data ?? []) {
      const createdAt = (o as { created_at?: string | null }).created_at;
      if (!createdAt) continue;
      const key = dateKeyFromIso(createdAt);
      ordersPerDayMap[key] = (ordersPerDayMap[key] ?? 0) + 1;
      pnlPerDayMap[key] = (pnlPerDayMap[key] ?? 0) + Number((o as { realized_pnl?: number | null }).realized_pnl ?? 0);
    }

    const ordersPerDay = dayLabels.map((d) => ({ t: `${d}T00:00:00.000Z`, v: Number(ordersPerDayMap[d] ?? 0) }));
    const pnlPerDay = dayLabels.map((d) => ({ t: `${d}T00:00:00.000Z`, v: Number(pnlPerDayMap[d] ?? 0) }));

    const usersPerDayMap: Record<string, number> = {};
    for (const u of users) {
      const createdAt = (u as { created_at?: string | null }).created_at;
      if (!createdAt) continue;
      if (createdAt < since) continue;
      const key = dateKeyFromIso(createdAt);
      usersPerDayMap[key] = (usersPerDayMap[key] ?? 0) + 1;
    }
    const usersPerDay = dayLabels.map((d) => ({ t: `${d}T00:00:00.000Z`, v: Number(usersPerDayMap[d] ?? 0) }));

    // A simple equity curve (cumulative pnl over the window).
    let cum = 0;
    const equitySeries = pnlPerDay.map((p) => {
      cum += Number(p.v ?? 0);
      return { t: p.t, v: Number(cum) };
    });

    const openPositionsBySymbolMap: Record<string, number> = {};
    for (const p of positionsRes.data ?? []) {
      const sym = String((p as { symbol?: string | null }).symbol ?? "").trim();
      if (!sym) continue;
      const qty = Number((p as { quantity?: number | null; qty?: number | null }).quantity ?? (p as { qty?: number | null }).qty ?? 0);
      if (qty === 0) continue;
      openPositionsBySymbolMap[sym] = (openPositionsBySymbolMap[sym] ?? 0) + 1;
    }
    const openPositionsBySymbol = Object.entries(openPositionsBySymbolMap)
      .map(([label, v]) => ({ label, v: Number(v) }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 20);

    console.log("[admin99:charts] sizes", {
      days,
      orders: (ordersRes.data ?? []).length,
      positions: (positionsRes.data ?? []).length,
      users: users.length,
    });

    return NextResponse.json({
      equitySeries,
      usersPerDay,
      ordersPerDay,
      pnlPerDay,
      openPositionsBySymbol,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load charts." },
      { status: 500 }
    );
  }
}
