import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnvConfig } from '../env';

/**
 * Creates a Supabase server client for Server Components, Server Actions,
 * and Route Handlers using Next.js 14 cookies().
 *
 * Automatically reads and writes session cookies securely.
 * Returns null if Supabase environment variables are missing.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  const config = getSupabaseEnvConfig();
  const key = config.supabasePublishableKey || config.supabaseAnonKey;
  if (!config.isConfigured || !config.supabaseUrl || !key) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient(config.supabaseUrl, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Setting cookies from a Server Component throws an error; safe to ignore
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.delete({ name, ...options });
        } catch {
          // Removing cookies from a Server Component throws an error; safe to ignore
        }
      },
    },
  });
}
