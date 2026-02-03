import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchLatestPrice, toMarketSymbol } from "@/lib/market";
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
    console.log("[admin99] env", { route: "positions", hasUrl, hasAnon, hasServiceKey });

    const admin = await getAdminSupabaseClient();
    if ("error" in admin) return admin.error;
    const { supabase, mode } = admin;
    const useService = mode === "service";
    const { searchParams } = new URL(req.url ?? "", "http://localhost");
    const page = toNumber(searchParams.get("page"), 1);
    const limit = Math.min(200, toNumber(searchParams.get("limit"), 50));
    const q = (searchParams.get("q") ?? "").trim();
    const symbol = (searchParams.get("symbol") ?? "").trim().toUpperCase();
    const status = (searchParams.get("status") ?? "").trim().toLowerCase();

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
      if (!userIds.length) return NextResponse.json({ positions: [], page, limit, total: 0 });
    }

    let query = supabase
      .from("demo_positions")
      .select("id, user_id, symbol, quantity, qty, avg_price, unrealized_pnl, updated_at", { count: "exact" })
      .order("updated_at", { ascending: false });

    if (symbol) query = query.eq("symbol", symbol);
    if (status === "open") query = query.or("quantity.neq.0,qty.neq.0");
    if (status === "closed") query = query.or("quantity.eq.0,qty.eq.0");
    if (userIds) query = query.in("user_id", userIds);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data: positions, count, error } = await query.range(from, to);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[admin99:positions] counts", { total: count ?? 0, returned: (positions ?? []).length });

    const ids = (positions ?? []).map((p) => p.user_id).filter(Boolean);
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

    const normalized = (positions ?? []).map((p) => ({
      id: p.id,
      user_id: p.user_id,
      user_email: emailMap[String(p.user_id)] ?? null,
      symbol: p.symbol,
      quantity: Number(p.quantity ?? p.qty ?? 0),
      avg_price: p.avg_price == null ? null : Number(p.avg_price),
      unrealized_pnl: p.unrealized_pnl == null ? null : Number(p.unrealized_pnl),
      updated_at: p.updated_at ?? null,
    }));

    return NextResponse.json({
      positions: normalized,
      page,
      limit,
      total: count ?? 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load positions." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const unlocked = cookieStore.get("admin99")?.value === "1";
    if (!unlocked) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const hasUrl = Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
    const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const hasServiceKey = hasSupabaseAdminEnv();
    console.log("[admin99] env", { route: "positions:post", hasUrl, hasAnon, hasServiceKey });

    const admin = await getAdminSupabaseClient();
    if ("error" in admin) return admin.error;
    const { supabase } = admin;
    const body = await req.json().catch(() => ({}));
    const positionId = String(body?.positionId ?? "");
    if (!positionId) {
      return NextResponse.json({ error: "Missing positionId" }, { status: 400 });
    }

    const { data: position, error: positionError } = await supabase
      .from("demo_positions")
      .select("*")
      .eq("id", positionId)
      .single();
    if (positionError || !position) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }
    if (Number(position.quantity ?? 0) === 0) {
      return NextResponse.json({ error: "Already closed" }, { status: 400 });
    }

    const symbol = toMarketSymbol(String(position.symbol ?? ""));
    const latest = await fetchLatestPrice(symbol);
    if (latest == null || !Number.isFinite(latest) || latest <= 0) {
      return NextResponse.json({ error: "Price unavailable" }, { status: 502 });
    }

    const qty = Number(position.quantity ?? 0);
    const isLong = qty > 0;
    const side = isLong ? "sell" : "buy";
    const closeQty = Math.abs(qty);
    const avg = Number(position.avg_price ?? 0);
    const realized = isLong ? closeQty * (latest - avg) : closeQty * (avg - latest);

    await supabase.from("demo_orders").insert({
      user_id: position.user_id,
      symbol,
      side,
      order_type: "market",
      quantity: closeQty,
      price: latest,
      status: "filled",
      realized_pnl: realized,
    });

    await supabase.from("demo_positions").update({
      quantity: 0,
      qty: 0,
      unrealized_pnl: 0,
      updated_at: new Date().toISOString(),
      sl: null,
      tp: null,
    }).eq("id", position.id);

    const { data: settings } = await supabase
      .from("account_settings")
      .select("demo_balance")
      .eq("user_id", position.user_id)
      .maybeSingle();
    const current = Number(settings?.demo_balance ?? 10000);
    const notional = closeQty * latest;
    const newBalance = isLong ? current + notional : current - notional;
    await supabase.from("account_settings").update({ demo_balance: newBalance }).eq("user_id", position.user_id);

    return NextResponse.json({ ok: true, realizedPnl: realized });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to close position." },
      { status: 500 }
    );
  }
}
