import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminSupabaseClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const unlocked = cookieStore.get("admin99")?.value === "1";
    if (!unlocked) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const hasUrl = Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
    const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const hasServiceRole = hasSupabaseAdminEnv();
    console.log("[admin99] env", { route: "debug", hasUrl, hasAnon, hasServiceRole });

    const admin = await getAdminSupabaseClient();
    if ("error" in admin) return admin.error;
    const { supabase } = admin;

    const [ordersCountRes, positionsCountRes, ordersRes, positionsRes] = await Promise.all([
      supabase.from("demo_orders").select("id", { count: "exact", head: true }),
      supabase.from("demo_positions").select("id", { count: "exact", head: true }),
      supabase
        .from("demo_orders")
        .select("id, user_id, symbol, side, order_type, type, quantity, qty, price, status, realized_pnl, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("demo_positions")
        .select("id, user_id, symbol, quantity, qty, avg_price, unrealized_pnl, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

    if (ordersCountRes.error) console.log("[admin99:debug] ordersCount error", ordersCountRes.error.message);
    if (positionsCountRes.error) console.log("[admin99:debug] positionsCount error", positionsCountRes.error.message);
    if (ordersRes.error) console.log("[admin99:debug] orders error", ordersRes.error.message);
    if (positionsRes.error) console.log("[admin99:debug] positions error", positionsRes.error.message);

    const sampleOrders = (ordersRes.data ?? []).map((o) => ({
      id: o.id,
      user_id: o.user_id,
      symbol: o.symbol,
      side: o.side ?? null,
      order_type: o.order_type ?? o.type ?? null,
      quantity: Number(o.quantity ?? o.qty ?? 0),
      price: o.price == null ? null : Number(o.price),
      status: o.status ?? null,
      realized_pnl: o.realized_pnl == null ? null : Number(o.realized_pnl),
      created_at: o.created_at ?? null,
    }));

    const samplePositions = (positionsRes.data ?? []).map((p) => ({
      id: p.id,
      user_id: p.user_id,
      symbol: p.symbol,
      quantity: Number(p.quantity ?? p.qty ?? 0),
      avg_price: p.avg_price == null ? null : Number(p.avg_price),
      unrealized_pnl: p.unrealized_pnl == null ? null : Number(p.unrealized_pnl),
      updated_at: p.updated_at ?? null,
    }));

    const counts = {
      orders: ordersCountRes.count ?? 0,
      positions: positionsCountRes.count ?? 0,
    };
    console.log("[admin99:debug] counts", counts);

    return NextResponse.json({
      env: { hasUrl, hasAnon, hasServiceRole },
      counts,
      sampleOrders,
      samplePositions,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load debug." },
      { status: 500 }
    );
  }
}
