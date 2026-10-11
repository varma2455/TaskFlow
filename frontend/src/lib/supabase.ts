import { createClient as createSupabaseJsClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './supabase/client';
import { getSupabaseEnvConfig } from './env';

export { getSupabaseBrowserClient };
export { getSupabaseEnvConfig };

/**
 * Checks whether Supabase authentication is properly configured in the current environment.
 */
export const isSupabaseConfigured = (): boolean => {
  return getSupabaseEnvConfig().isConfigured;
};

/**
 * Returns detailed diagnostic information regarding the Supabase configuration state.
 */
export const getSupabaseConfigStatus = () => {
  return getSupabaseEnvConfig();
};

/**
 * Creates a safe fallback proxy when Supabase is not yet configured,
 * preventing unexpected JavaScript crashes during initial application load.
 */
function createSafeFallbackClient(): SupabaseClient {
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      if (prop === 'auth') {
        return {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
          signInWithOAuth: async () => {
            const config = getSupabaseEnvConfig();
            return {
              data: null,
              error: new Error(
                config.errorMessage ||
                  'Supabase authentication is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local.'
              ),
            };
          },
          signOut: async () => ({ error: null }),
          onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: () => {} } },
          }),
          exchangeCodeForSession: async () => ({
            data: { session: null, user: null },
            error: new Error('Supabase authentication is not configured.'),
          }),
        };
      }
      if (prop === 'channel' || prop === 'from' || prop === 'table') {
        return () => ({
          on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
          subscribe: () => ({ unsubscribe: () => {} }),
          select: () => ({
            eq: () => ({ single: async () => ({ data: null, error: null }), execute: async () => ({ data: [], error: null }) }),
            execute: async () => ({ data: [], error: null }),
          }),
        });
      }
      return target[prop] || (() => {});
    },
  };
  return new Proxy({}, handler) as SupabaseClient;
}

/**
 * Primary Supabase client for client-side React components.
 * Returns the singleton browser client if configured, or a safe fallback proxy.
 */
export const supabase: SupabaseClient = (() => {
  const envConfig = getSupabaseEnvConfig();
  const key = envConfig.supabasePublishableKey || envConfig.supabaseAnonKey;
  if (envConfig.isConfigured && envConfig.supabaseUrl && key) {
    try {
      // In browser, prefer @supabase/ssr browser client
      if (typeof window !== 'undefined') {
        const client = getSupabaseBrowserClient();
        if (client) return client;
      }
      return createSupabaseJsClient(envConfig.supabaseUrl, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      });
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
    }
  }
  return createSafeFallbackClient();
})();
