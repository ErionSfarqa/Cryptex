import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isLegacyAdmin = path === "/admin" || path.startsWith("/admin/");
  if (isLegacyAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const isAdmin99Panel = path === "/admin99/panel" || path.startsWith("/admin99/panel/");
  const isAdmin99Login = path === "/admin99/login";
  if (!isAdmin99Panel) {
    if (isAdmin99Login) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin99";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const unlocked = req.cookies.get("admin99")?.value === "1";
  if (!unlocked) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin99";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/admin99/:path*"],
};
