"use server";

import { cookies } from "next/headers";

export async function setAdminBypassCookie() {
  const cookieStore = await cookies();
  cookieStore.set("admin_bypass", "true", { 
    path: "/", 
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}
