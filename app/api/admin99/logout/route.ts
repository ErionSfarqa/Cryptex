import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  const base = "admin99=; Max-Age=0; HttpOnly; SameSite=Lax";
  res.headers.append("Set-Cookie", `${base}; Path=/admin99${secure ? "; Secure" : ""}`);
  res.headers.append("Set-Cookie", `${base}; Path=/api/admin99${secure ? "; Secure" : ""}`);
  return res;
}
