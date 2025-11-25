import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Next.js middleware for route protection
 * 
 * This middleware protects all routes inside the (app) group by checking
 * authentication status. Unauthenticated users are redirected to /login.
 * 
 * The middleware checks for authentication by looking for the auth token
 * in cookies (set by the auth store).
 */
export function middleware(request: NextRequest) {
  // Get the pathname from the request
  const { pathname } = request.nextUrl;
  
  // Define protected routes (all routes that start with /mlgoo, /blgu, /assessor, /validator, etc.)
  // These correspond to the (app) route group
  const protectedRoutes = [
    '/mlgoo',
    '/blgu',
    '/assessor',
    '/validator',
    '/user-management',
    '/change-password',
    '/external-analytics',
  ];
  
  // Define auth routes (login, register, etc.)
  const authRoutes = ['/login'];
  
  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if the current path is an auth route
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Check for the auth token in cookies
  const authToken = request.cookies.get('auth-token')?.value;
  const isAuthenticated = !!authToken;
  
  console.log(`Middleware: Path: ${pathname}, Auth token: ${authToken ? 'present' : 'missing'}, Authenticated: ${isAuthenticated}, Protected: ${isProtectedRoute}`);
  
  // If user is authenticated and trying to access auth routes, redirect to appropriate dashboard
  console.log(`Middleware: Checking auth route redirect - Path: ${pathname}, isAuthRoute: ${isAuthRoute}`);
  if (isAuthenticated && isAuthRoute) {
    // Try to get user role from the token
    try {
      const token = authToken;
      console.log(`Middleware: Token present, attempting to decode...`);

      // Decode the JWT token to get user role
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log(`Middleware: Token decoded successfully. Payload:`, JSON.stringify(payload, null, 2));

      const userRole = payload.role;
      console.log(`Middleware: Extracted user role: ${userRole}`);

      // Redirect based on user role
      let dashboardUrl;
      if (userRole === 'MLGOO_DILG') {
        dashboardUrl = new URL('/mlgoo/dashboard', request.url);
        console.log(`Middleware: Redirecting MLGOO_DILG to ${dashboardUrl.pathname}`);
      } else if (userRole === 'ASSESSOR') {
        dashboardUrl = new URL('/assessor/submissions', request.url);
        console.log(`Middleware: Redirecting ASSESSOR to ${dashboardUrl.pathname}`);
      } else if (userRole === 'VALIDATOR') {
        dashboardUrl = new URL('/validator/submissions', request.url);
        console.log(`Middleware: Redirecting VALIDATOR to ${dashboardUrl.pathname}`);
      } else if (userRole === 'BLGU_USER') {
        dashboardUrl = new URL('/blgu/dashboard', request.url);
        console.log(`Middleware: Redirecting BLGU_USER to ${dashboardUrl.pathname}`);
      } else if (userRole === 'KATUPARAN_CENTER_USER' || userRole === 'UMDC_PEACE_CENTER_USER') {
        dashboardUrl = new URL('/external-analytics', request.url);
        console.log(`Middleware: Redirecting ${userRole} to ${dashboardUrl.pathname}`);
      } else {
        // If role is unrecognized, allow the request to proceed without redirect
        console.log(`Middleware: Unrecognized role ${userRole}, allowing to proceed`);
        return NextResponse.next();
      }
      return NextResponse.redirect(dashboardUrl);
    } catch (error) {
      // If token decoding fails, log detailed error and allow access
      console.error('Middleware: ❌ ERROR decoding token in auth route check:', error);
      console.error('Middleware: Error details:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        tokenLength: authToken?.length,
        tokenFirstChars: authToken?.substring(0, 20),
        tokenParts: authToken?.split('.').length,
      });
      // Allow the request to proceed - let the app handle invalid tokens
      console.log('Middleware: Allowing request to proceed despite token decode error');
      return NextResponse.next();
    }
  }
  
  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the original URL as a redirect parameter
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated, check role-based access for protected routes
  if (isAuthenticated && isProtectedRoute) {
    try {
      const token = authToken;
      console.log(`Middleware: [Protected Route Check] Decoding token for role-based access...`);

      const payload = JSON.parse(atob(token.split('.')[1]));
      const userRole = payload.role;

      // Check if user is trying to access admin routes
      const isAdminRoute = pathname.startsWith('/mlgoo');
      const isUserManagementRoute = pathname.startsWith('/user-management');
      const isAssessorRoute = pathname.startsWith('/assessor');
      const isValidatorRoute = pathname.startsWith('/validator');
      const isBLGURoute = pathname.startsWith('/blgu');
      const isExternalAnalyticsRoute = pathname.startsWith('/external-analytics');

      console.log(`Middleware: [Protected Route Check] User role: ${userRole}, Path: ${pathname}`);
      console.log(`Middleware: [Route Flags] Admin: ${isAdminRoute}, Assessor: ${isAssessorRoute}, Validator: ${isValidatorRoute}, BLGU: ${isBLGURoute}, External: ${isExternalAnalyticsRoute}`);

      // CRITICAL: Immediately redirect ASSESSOR/VALIDATOR away from BLGU routes FIRST
      // This must be the first check to prevent any flash of BLGU dashboard
      if (isBLGURoute && (userRole === 'ASSESSOR' || userRole === 'VALIDATOR')) {
        console.log(`Middleware: IMMEDIATE redirect - ${userRole} user trying to access BLGU route ${pathname}`);
        const dashboardUrl = userRole === 'ASSESSOR'
          ? new URL('/assessor/submissions', request.url)
          : new URL('/validator/submissions', request.url);
        return NextResponse.redirect(dashboardUrl);
      }

      // Only allow admin users to access admin routes and user management
      if ((isAdminRoute || isUserManagementRoute) && userRole !== 'MLGOO_DILG') {
        console.log(`Middleware: Redirecting non-admin user (${userRole}) from ${pathname} to appropriate dashboard`);
        // Redirect non-admin users to their appropriate dashboard
        let dashboardUrl;
        if (userRole === 'ASSESSOR') {
          dashboardUrl = new URL('/assessor/submissions', request.url);
        } else if (userRole === 'VALIDATOR') {
          dashboardUrl = new URL('/validator/submissions', request.url);
        } else {
          dashboardUrl = new URL('/blgu/dashboard', request.url);
        }
        return NextResponse.redirect(dashboardUrl);
      }

      // Check role-based access for assessor routes
      if (isAssessorRoute && userRole !== 'ASSESSOR' && userRole !== 'MLGOO_DILG') {
        console.log(`Middleware: Redirecting non-assessor user (${userRole}) from ${pathname} to appropriate dashboard`);
        let dashboardUrl;
        if (userRole === 'VALIDATOR') {
          dashboardUrl = new URL('/validator/submissions', request.url);
        } else {
          dashboardUrl = new URL('/blgu/dashboard', request.url);
        }
        return NextResponse.redirect(dashboardUrl);
      }

      // Check role-based access for validator routes
      if (isValidatorRoute && userRole !== 'VALIDATOR' && userRole !== 'MLGOO_DILG') {
        console.log(`Middleware: Redirecting non-validator user (${userRole}) from ${pathname} to appropriate dashboard`);
        let dashboardUrl;
        if (userRole === 'ASSESSOR') {
          dashboardUrl = new URL('/assessor/submissions', request.url);
        } else {
          dashboardUrl = new URL('/blgu/dashboard', request.url);
        }
        return NextResponse.redirect(dashboardUrl);
      }

      // Check role-based access for external analytics routes
      if (isExternalAnalyticsRoute && userRole !== 'KATUPARAN_CENTER_USER' && userRole !== 'UMDC_PEACE_CENTER_USER') {
        console.log(`Middleware: Redirecting non-external user (${userRole}) from ${pathname} to appropriate dashboard`);
        let dashboardUrl;
        if (userRole === 'MLGOO_DILG') {
          dashboardUrl = new URL('/mlgoo/dashboard', request.url);
        } else if (userRole === 'ASSESSOR') {
          dashboardUrl = new URL('/assessor/submissions', request.url);
        } else if (userRole === 'VALIDATOR') {
          dashboardUrl = new URL('/validator/submissions', request.url);
        } else {
          dashboardUrl = new URL('/blgu/dashboard', request.url);
        }
        return NextResponse.redirect(dashboardUrl);
      }

      // Prevent external users from accessing internal routes
      if ((userRole === 'KATUPARAN_CENTER_USER' || userRole === 'UMDC_PEACE_CENTER_USER') && !isExternalAnalyticsRoute) {
        console.log(`Middleware: Redirecting external user (${userRole}) from ${pathname} to external analytics dashboard`);
        const dashboardUrl = new URL('/external-analytics', request.url);
        return NextResponse.redirect(dashboardUrl);
      }

      // For all other protected routes (including BLGU routes), allow access
      // BLGU users can access BLGU routes
      // Admin users can access both admin and BLGU routes
      console.log(`Middleware: ✅ Allowing user (${userRole}) to access route: ${pathname}`);

    } catch (error) {
      // If token decoding fails, allow access (fallback)
      console.error('Middleware: ❌ ERROR in protected route check - Token decode failed:', error);
      console.error('Middleware: Token value (first 20 chars):', authToken?.substring(0, 20));
      console.error('Middleware: Allowing request to proceed despite error (fallback behavior)');
    }
  }
  
  // Allow access for all other cases
  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 * 
 * This ensures the middleware only runs on the routes we want to protect,
 * improving performance by avoiding unnecessary middleware execution.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 