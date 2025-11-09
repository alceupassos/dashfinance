import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase-middleware";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/first-access"];

export async function middleware(request: NextRequest) {
  // DEV bypass: allow navigating without auth when enabled
  if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "1") {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;

  // Skip authentication for static assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/manifest") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Update Supabase session and get user
  const { response, user } = await updateSession(request);

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  // Redirect unauthenticated users to login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && pathname === "/login") {
    const redirectTo = request.nextUrl.searchParams.get("redirect") || "/";
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    url.searchParams.delete("redirect");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|favicon.svg|icon.svg|manifest.webmanifest).*)"]
};
