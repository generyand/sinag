/**
 * Middleware for handling maintenance mode redirects
 *
 * To enable maintenance mode:
 *   Set NEXT_PUBLIC_MAINTENANCE_MODE=true in your environment
 *
 * To disable maintenance mode:
 *   Remove the variable or set NEXT_PUBLIC_MAINTENANCE_MODE=false
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Enable/disable maintenance mode via environment variable
const MAINTENANCE_MODE = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

// Paths that should always be accessible (even in maintenance mode)
const ALLOWED_PATHS = [
  "/maintenance",
  "/api", // Allow API routes if needed
  "/_next", // Next.js internals
  "/favicon.ico",
  "/logo",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip if maintenance mode is disabled
  if (!MAINTENANCE_MODE) {
    // If maintenance mode is off but user visits /maintenance, redirect to home
    if (pathname === "/maintenance") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Check if the path is allowed during maintenance
  const isAllowedPath = ALLOWED_PATHS.some((path) => pathname.startsWith(path));

  if (isAllowedPath) {
    return NextResponse.next();
  }

  // Redirect all other traffic to maintenance page
  return NextResponse.redirect(new URL("/maintenance", request.url));
}

export const config = {
  // Match all routes except static files
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|logo|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
