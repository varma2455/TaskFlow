import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnvConfig } from '@/lib/env';

/**
 * Server-Side OAuth Callback Handler for Next.js 14 App Router.
 * Handles the Google OAuth PKCE authorization code exchange, sets secure
 * session cookies, retrieves authoritative application role from Flask,
 * and redirects to /admin or /dashboard.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const oauthError =
    requestUrl.searchParams.get('error_description') ||
    requestUrl.searchParams.get('error');
  const rawNext = requestUrl.searchParams.get('next');

  // Prevent open-redirect attacks: only allow safe relative paths
  const safeNext =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : null;

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(oauthError)}`, requestUrl.origin)
    );
  }

  const config = getSupabaseEnvConfig();
  const key = config.supabasePublishableKey || config.supabaseAnonKey;
  if (!config.isConfigured || !config.supabaseUrl || !key) {
    return NextResponse.redirect(
      new URL(
        '/setup/authentication?reason=missing_supabase_config',
        requestUrl.origin
      )
    );
  }

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(config.supabaseUrl, key, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
        },
      },
    });

    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('OAuth code exchange failed:', exchangeError);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(exchangeError.message)}`,
          requestUrl.origin
        )
      );
    }

    if (data?.session) {
      const token = data.session.access_token;
      let userRole = 'user';

      // 1. Authoritative profile sync & role retrieval via Flask REST API
      try {
        // Sync profile first
        await fetch(`${config.apiUrl}/auth/sync-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: JSON.stringify({
            full_name:
              data.session.user.user_metadata?.full_name ||
              data.session.user.user_metadata?.name ||
              data.session.user.email?.split('@')[0],
            avatar_url:
              data.session.user.user_metadata?.avatar_url ||
              data.session.user.user_metadata?.picture,
          }),
        });

        // Query authoritative profile from /api/me
        const meRes = await fetch(`${config.apiUrl}/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        if (meRes.ok) {
          const meData = await meRes.json();
          userRole = meData.profile?.role || meData.user?.role || 'user';
        }
      } catch (err) {
        console.warn('Backend profile resolution error on callback:', err);
      }

      // 2. Role-Based Destination Routing
      let destination = '/dashboard';
      if (userRole === 'admin') {
        destination =
          safeNext && !safeNext.startsWith('/dashboard') ? safeNext : '/admin';
      } else {
        destination =
          safeNext && !safeNext.startsWith('/admin') ? safeNext : '/dashboard';
      }

      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=missing_authorization_code', requestUrl.origin)
  );
}

export const HEAD = GET;

