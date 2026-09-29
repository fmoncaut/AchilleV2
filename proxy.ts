import { NextResponse } from "next/server";

import { auth } from "@/auth";

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/compte") || pathname.startsWith("/admin");
}

/**
 * Next.js 16 : convention `proxy` (pas middleware.ts — les deux à la fois plantent).
 * Le pathname est injecté dans les *request* headers pour que les layouts RSC
 * (gate onboarding) le lisent via headers() — y compris en standalone.
 */
export const proxy = auth((request) => {
  if (isProtectedPath(request.nextUrl.pathname) && !request.auth) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: ["/compte/:path*", "/admin/:path*"],
};
