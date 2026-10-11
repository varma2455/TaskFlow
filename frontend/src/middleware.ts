import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { getSupabaseEnvConfig } from './lib/env';

/**
 * Next.js Edge Middleware for Supabase Session Refresh and Protected Route Handling.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets & internal routes bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const config = getSupabaseEnvConfig();

  // If Supabase is unconfigured, allow public and setup pages through
  if (!config.isConfigured) {
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/tasks') ||
      pathname.startsWith('/board') ||
      pathname.startsWith('/team') ||
      pathname.startsWith('/settings')
    ) {
      // Redirect to login or setup wizard with explanatory message
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('reason', 'unconfigured');
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Refresh active Supabase session cookies
  const { response, user } = await updateSession(request);

  // Protected route enforcement
  const isProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/tasks') ||
    pathname.startsWith('/board') ||
    pathname.startsWith('/team') ||
    pathname.startsWith('/settings');

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // If authenticated user visits login or home, they can be redirected,
  // but allow them to view public landing page if explicitly navigated
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
