import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnvConfig } from '../env';

/**
 * Updates auth session cookies in Next.js middleware.
 * Refreshes expired sessions and passes updated cookies in both
 * the request and response headers.
 */
export async function updateSession(request: NextRequest) {
  const config = getSupabaseEnvConfig();
  const key = config.supabasePublishableKey || config.supabaseAnonKey;
  if (!config.isConfigured || !config.supabaseUrl || !key) {
    return { response: NextResponse.next(), user: null };
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(config.supabaseUrl, key, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.delete(name);
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.delete(name);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  return { response, user, supabase };
}
