import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function POST(req: Request) {
  const { supabase, error, user } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "");
  if (code !== "admin515") {
    const res = NextResponse.json({ error: "Invalid code" }, { status: 401 });
    return res;
  }

  const cookieStore = await cookies();
  cookieStore.set("admin_unlocked", "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({ ok: true });
}
