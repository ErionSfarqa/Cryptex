import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "");
  const expected = String(process.env.ADMIN99_CODE ?? "admin515");
  if (!expected) {
    return NextResponse.json({ error: "Admin code not configured." }, { status: 500 });
  }
  if (code !== expected) {
    return NextResponse.json({ error: "Invalid code." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  const maxAge = 60 * 60 * 8;
  const base = `admin99=1; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
  res.headers.append("Set-Cookie", `${base}; Path=/admin99${secure ? "; Secure" : ""}`);
  res.headers.append("Set-Cookie", `${base}; Path=/api/admin99${secure ? "; Secure" : ""}`);
  return res;
}
