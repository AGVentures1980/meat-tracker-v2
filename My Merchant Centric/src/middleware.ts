import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from './lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Paths that do NOT require authentication
  const isPublicPath =
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') || // API routes will perform independent internal auth checks
    pathname.includes('.') || // Static files like favicon, images
    pathname === '/';

  if (isPublicPath) {
    return NextResponse.next();
  }

  const user = await getSessionUser(req);

  // Redirect to login if session does not exist
  if (!user) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Inject user session headers to make downstream server-side processing easier
  const response = NextResponse.next();
  response.headers.set('x-user-id', user.id);
  response.headers.set('x-user-org-id', user.organizationId);
  response.headers.set('x-user-roles', user.roles.join(','));
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
