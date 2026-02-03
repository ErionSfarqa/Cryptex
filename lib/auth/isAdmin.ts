import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
 
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return (profile?.role ?? null) as string | null;
}

export async function isAdminServer() {
  const supabase = await createSupabaseServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null, isAdmin: false, role: null, reason: "no_user" };
  }
  const role = await getUserRole(supabase, user.id);
  const isAdmin = isAdminRole(role);
  return { supabase, user, isAdmin, role: role ?? null, reason: isAdmin ? "ok" : "not_admin" };
}

export function isAdminRole(role: unknown) {
  const r = String(role ?? "").trim();
  return r.toLowerCase() === "admin" || r.toUpperCase() === "ADMIN";
}
