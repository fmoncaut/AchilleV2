import { NextResponse } from "next/server";

import { auth } from "@/auth";

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/compte") || pathname.startsWith("/admin");
}

/** Next.js 16 : équivalent de middleware.ts (convention `proxy`). */
export const proxy = auth((request) => {
  if (isProtectedPath(request.nextUrl.pathname) && !request.auth) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/compte/:path*", "/admin/:path*"],
};
