import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const inputCode = String(body?.code ?? "").trim();
  const expected = String(process.env.ADMIN_ACCESS_CODE ?? "").trim();
  if (!expected) {
    return NextResponse.json({ error: "ADMIN_ACCESS_CODE not set." }, { status: 500 });
  }
  if (inputCode !== expected) {
    return NextResponse.json({ error: "Invalid access code." }, { status: 403 });
  }
  const cookieStore = await cookies();
  // 12 hours
  cookieStore.set("admin_override", "true", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === "production",
  });

  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("account_settings")
      .update({ role: "admin" })
      .eq("user_id", user.id);
  }
  return NextResponse.json({ ok: true });
}
