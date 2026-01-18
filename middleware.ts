import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that don't require authentication
const publicRoutes = ["/customer-portal"];

// Define auth routes
const authRoutes = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if it's an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // For now, allow all requests (auth will be implemented next)
  // TODO: Implement Firebase auth token verification
  
  // if (!isPublicRoute && !isAuthRoute) {
  //   // Check for auth token in cookies or headers
  //   const token = request.cookies.get("auth-token");
  //   
  //   if (!token) {
  //     // Redirect to login if not authenticated
  //     const loginUrl = new URL("/login", request.url);
  //     loginUrl.searchParams.set("from", pathname);
  //     return NextResponse.redirect(loginUrl);
  //   }
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

