import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminSupabaseClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

function toNumber(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
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
    const hasServiceKey = hasSupabaseAdminEnv();
    console.log("[admin99] env", { route: "orders", hasUrl, hasAnon, hasServiceKey });

    const admin = await getAdminSupabaseClient();
    if ("error" in admin) return admin.error;
    const { supabase, mode } = admin;
    const useService = mode === "service";
    const { searchParams } = new URL(req.url ?? "", "http://localhost");
    const page = toNumber(searchParams.get("page"), 1);
    const limit = Math.min(200, toNumber(searchParams.get("limit"), 50));
    const q = (searchParams.get("q") ?? "").trim();
    const symbol = (searchParams.get("symbol") ?? "").trim().toUpperCase();
    const status = (searchParams.get("status") ?? "").trim();

    let userIds: string[] | null = null;
    if (q) {
      if (useService) {
        const usersRes = await supabase.schema("auth").from("users").select("id").or(`email.ilike.%${q}%,id.eq.${q}`);
        if (!usersRes.error) {
          userIds = (usersRes.data ?? []).map((u) => u.id);
        } else {
          const listRes = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
          if (listRes.error) {
            return NextResponse.json({ error: listRes.error.message }, { status: 500 });
          }
          userIds = (listRes.data.users ?? [])
            .filter((u) => {
              const email = u.email ?? "";
              return email.toLowerCase().includes(q.toLowerCase()) || u.id === q;
            })
            .map((u) => u.id);
        }
      } else {
        const usersRes = await supabase
          .from("profiles")
          .select("id")
          .or(`email.ilike.%${q}%,id.eq.${q}`);
        if (usersRes.error) {
          return NextResponse.json({ error: usersRes.error.message }, { status: 500 });
        }
        userIds = (usersRes.data ?? []).map((u) => u.id);
      }
      if (!userIds.length) return NextResponse.json({ orders: [], page, limit, total: 0 });
    }

    let query = supabase
      .from("demo_orders")
      .select("id, user_id, symbol, side, order_type, type, quantity, qty, price, status, created_at, realized_pnl", { count: "exact" })
      .order("created_at", { ascending: false });

    if (symbol) query = query.eq("symbol", symbol);
    if (status) query = query.eq("status", status);
    if (userIds) query = query.in("user_id", userIds);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data: orders, count, error } = await query.range(from, to);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[admin99:orders] counts", { total: count ?? 0, returned: (orders ?? []).length });

    const ids = (orders ?? []).map((o) => o.user_id).filter(Boolean);
    let emailMap: Record<string, string | null> = {};
    if (ids.length > 0) {
      if (useService) {
        const usersRes = await supabase.schema("auth").from("users").select("id, email").in("id", ids);
        if (!usersRes.error) {
          emailMap = Object.fromEntries(
            (usersRes.data ?? []).map((u) => [String(u.id), u.email ?? null])
          );
        } else {
          const listRes = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
          if (!listRes.error) {
            const set = new Set(ids.map((id) => String(id)));
            emailMap = Object.fromEntries(
              (listRes.data.users ?? [])
                .filter((u) => set.has(String(u.id)))
                .map((u) => [String(u.id), u.email ?? null])
            );
          }
        }
      } else {
        const usersRes = await supabase.from("profiles").select("id, email").in("id", ids);
        if (!usersRes.error) {
          emailMap = Object.fromEntries(
            (usersRes.data ?? []).map((u) => [String(u.id), u.email ?? null])
          );
        }
      }
    }

    const normalized = (orders ?? []).map((o) => ({
      id: o.id,
      user_id: o.user_id,
      user_email: emailMap[String(o.user_id)] ?? null,
      symbol: o.symbol,
      side: o.side ?? null,
      order_type: o.order_type ?? o.type ?? "market",
      quantity: Number(o.quantity ?? o.qty ?? 0),
      price: o.price == null ? null : Number(o.price),
      status: o.status ?? null,
      created_at: o.created_at,
      realized_pnl: o.realized_pnl == null ? null : Number(o.realized_pnl),
    }));

    return NextResponse.json({
      orders: normalized,
      page,
      limit,
      total: count ?? 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load orders." },
      { status: 500 }
    );
  }
}
