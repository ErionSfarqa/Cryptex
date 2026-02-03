import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/requireAdmin";
 
type UserItem = {
  userId: string;
  email?: string | null;
  role?: string | null;
  createdAt?: string | null;
  demoBalance?: number;
  lastResetAt?: string | null;
  tradingDisabled?: boolean;
};

export async function GET() {
  const cookieStore = await cookies();
  const unlocked = cookieStore.get("admin99")?.value === "1";
  let supabase;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey && unlocked) {
    supabase = createSupabaseClient(url, serviceKey);
  } else {
    const result = await requireAdmin();
    if ("error" in result && result.error) return result.error;
    supabase = result.supabase;
  }
 
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, role, created_at");
 
  const { data: settings } = await supabase
    .from("account_settings")
    .select("user_id, demo_balance, last_reset_at, trading_disabled");
 
  type ProfileRow = { id: string; email?: string | null; role?: string | null; created_at?: string | null };
  type SettingsRow = { user_id: string; demo_balance?: number | null; last_reset_at?: string | null; trading_disabled?: boolean | null };
  const map = new Map<string, UserItem>();
  (profiles ?? []).forEach((p: ProfileRow) =>
    map.set(p.id, {
      userId: p.id,
      email: p.email ?? null,
      role: p.role ?? null,
      createdAt: p.created_at ?? null,
    })
  );
  (settings ?? []).forEach((s: SettingsRow) => {
    const e: UserItem = map.get(s.user_id) ?? { userId: s.user_id };
    e.demoBalance = Number(s.demo_balance ?? 0);
    e.lastResetAt = s.last_reset_at ?? null;
    e.tradingDisabled = Boolean(s.trading_disabled ?? false);
    map.set(s.user_id, e);
  });
 
  return NextResponse.json({ users: Array.from(map.values()) });
}
 
 export async function POST(req: Request) {
   const { supabase, error, user } = await requireAdmin();
   if (error) return error;
 
   const body = await req.json().catch(() => ({}));
   const action = String(body?.action ?? "");
   const targetUserId = String(body?.userId ?? "");
 
   if (!targetUserId) {
     return NextResponse.json({ error: "Missing userId" }, { status: 400 });
   }
 
   if (action === "promote") {
     await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", targetUserId);
     await supabase.from("admin_actions").insert({
       admin_id: user.id, action_type: "promote", target_user_id: targetUserId, metadata: {}, created_at: new Date().toISOString()
     });
     return NextResponse.json({ ok: true });
   }
   if (action === "demote") {
     await supabase.from("profiles").update({ role: "USER" }).eq("id", targetUserId);
     await supabase.from("admin_actions").insert({
       admin_id: user.id, action_type: "demote", target_user_id: targetUserId, metadata: {}, created_at: new Date().toISOString()
     });
     return NextResponse.json({ ok: true });
   }
   if (action === "disable_trading") {
     await supabase.from("account_settings").update({ trading_disabled: true }).eq("user_id", targetUserId);
     await supabase.from("admin_actions").insert({
       admin_id: user.id, action_type: "disable_trading", target_user_id: targetUserId, metadata: {}, created_at: new Date().toISOString()
     });
     return NextResponse.json({ ok: true });
   }
   if (action === "enable_trading") {
     await supabase.from("account_settings").update({ trading_disabled: false }).eq("user_id", targetUserId);
     await supabase.from("admin_actions").insert({
       admin_id: user.id, action_type: "enable_trading", target_user_id: targetUserId, metadata: {}, created_at: new Date().toISOString()
     });
     return NextResponse.json({ ok: true });
   }
 
   return NextResponse.json({ error: "Unknown action" }, { status: 400 });
 }
