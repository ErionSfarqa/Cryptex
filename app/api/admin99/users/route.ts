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
    console.log("[admin99] env", { route: "users", hasUrl, hasAnon, hasServiceKey });

    const admin = await getAdminSupabaseClient();
    if ("error" in admin) return admin.error;
    const { supabase, mode } = admin;
    const useService = mode === "service";
    const { searchParams } = new URL(req.url ?? "", "http://localhost");
    const page = toNumber(searchParams.get("page"), 1);
    const limit = Math.min(200, toNumber(searchParams.get("limit"), 50));
    const q = (searchParams.get("q") ?? "").trim();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let users: { id: string; email: string | null; created_at: string | null; last_sign_in_at: string | null }[] =
      [];
    let count = 0;

    if (q) {
      if (useService) {
        const query = supabase
          .schema("auth")
          .from("users")
          .select("id, email, created_at, last_sign_in_at", { count: "exact" })
          .or(`email.ilike.%${q}%,id.eq.${q}`)
          .order("created_at", { ascending: false });
        const res = await query.range(from, to);
        if (!res.error) {
          users = res.data ?? [];
          count = res.count ?? 0;
        } else {
          const listRes = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
          if (listRes.error) {
            return NextResponse.json({ error: listRes.error.message }, { status: 500 });
          }
          const filtered = (listRes.data.users ?? []).filter((u) => {
            const email = u.email ?? "";
            return email.toLowerCase().includes(q.toLowerCase()) || u.id === q;
          });
          count = filtered.length;
          users = filtered.slice(from, to + 1).map((u) => ({
            id: u.id,
            email: u.email ?? null,
            created_at: u.created_at ?? null,
            last_sign_in_at: u.last_sign_in_at ?? null,
          }));
        }
      } else {
        const res = await supabase
          .from("profiles")
          .select("id, email, created_at", { count: "exact" })
          .or(`email.ilike.%${q}%,id.eq.${q}`)
          .order("created_at", { ascending: false })
          .range(from, to);
        if (res.error) {
          return NextResponse.json({ error: res.error.message }, { status: 500 });
        }
        users = (res.data ?? []).map((u) => ({
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at ?? null,
          last_sign_in_at: null,
        }));
        count = res.count ?? 0;
      }
    } else if (useService) {
      const listRes = await supabase.auth.admin.listUsers({ page, perPage: limit });
      if (listRes.error) {
        return NextResponse.json({ error: listRes.error.message }, { status: 500 });
      }
      users = (listRes.data.users ?? []).map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
      }));
      count = listRes.data.total ?? users.length;
    } else {
      const res = await supabase
        .from("profiles")
        .select("id, email, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (res.error) {
        return NextResponse.json({ error: res.error.message }, { status: 500 });
      }
      users = (res.data ?? []).map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at ?? null,
        last_sign_in_at: null,
      }));
      count = res.count ?? 0;
    }

    console.log("[admin99:users] counts", { usersCount: count });

    const ids = (users ?? []).map((u) => u.id);
    const rolesMap: Record<string, string | null> = {};
    const balancesMap: Record<string, number | null> = {};
    const lastResetMap: Record<string, string | null> = {};
    const tradingDisabledMap: Record<string, boolean | null> = {};

    if (ids.length > 0) {
      const profilesRes = await supabase
        .from("profiles")
        .select("id, role")
        .in("id", ids);
      if (!profilesRes.error) {
        for (const p of profilesRes.data ?? []) {
          rolesMap[String(p.id)] = p.role ?? null;
        }
      }

      const settingsRes = await supabase
        .from("account_settings")
        .select("user_id, demo_balance, last_reset_at, trading_disabled")
        .in("user_id", ids);
      if (!settingsRes.error) {
        for (const s of settingsRes.data ?? []) {
          const id = String(s.user_id);
          balancesMap[id] = s.demo_balance == null ? null : Number(s.demo_balance);
          lastResetMap[id] = s.last_reset_at ?? null;
          tradingDisabledMap[id] = s.trading_disabled == null ? null : Boolean(s.trading_disabled);
        }
      }
    }

    const normalized = (users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
      role: rolesMap[u.id] ?? null,
      demo_balance: balancesMap[u.id] ?? null,
      last_reset_at: lastResetMap[u.id] ?? null,
      trading_disabled: tradingDisabledMap[u.id] ?? null,
    }));

    return NextResponse.json({
      users: normalized,
      page,
      limit,
      total: count ?? 0,
      source: useService ? "auth" : "profiles",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load users." },
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
    console.log("[admin99] env", { route: "users:post", hasUrl, hasAnon, hasServiceKey });

    const admin = await getAdminSupabaseClient();
    if ("error" in admin) return admin.error;
    const { supabase } = admin;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const targetUserId = String(body?.userId ?? "");
    if (!targetUserId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (action === "promote") {
      await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", targetUserId);
      return NextResponse.json({ ok: true });
    }
    if (action === "demote") {
      await supabase.from("profiles").update({ role: "USER" }).eq("id", targetUserId);
      return NextResponse.json({ ok: true });
    }
    if (action === "disable_trading") {
      await supabase.from("account_settings").update({ trading_disabled: true }).eq("user_id", targetUserId);
      return NextResponse.json({ ok: true });
    }
    if (action === "enable_trading") {
      await supabase.from("account_settings").update({ trading_disabled: false }).eq("user_id", targetUserId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update user." },
      { status: 500 }
    );
  }
}
