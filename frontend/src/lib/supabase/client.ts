'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnvConfig } from '../env';

let browserClient: SupabaseClient | null = null;

/**
 * Creates or retrieves the singleton Supabase browser client.
 * Uses @supabase/ssr createBrowserClient which automatically synchronizes
 * auth sessions with document cookies.
 *
 * Returns null if Supabase environment variables are missing or unconfigured.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const config = getSupabaseEnvConfig();
  const key = config.supabasePublishableKey || config.supabaseAnonKey;
  if (!config.isConfigured || !config.supabaseUrl || !key) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(config.supabaseUrl, key, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return browserClient;
}

/**
 * Convenience helper to instantiate a client on demand.
 */
export function createClient(): SupabaseClient | null {
  return getSupabaseBrowserClient();
}
