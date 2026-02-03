import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "");
  const expected = String(process.env.ADMIN_ACCESS_CODE ?? "");
  if (!expected) {
    return NextResponse.json({ error: "Admin code not configured." }, { status: 500 });
  }
  if (code !== expected) {
    return NextResponse.json({ error: "Invalid code." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_unlocked", "1", {
    httpOnly: true,
    maxAge: 60 * 60 * 12,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
