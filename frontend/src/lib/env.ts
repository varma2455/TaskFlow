/**
 * Safe Environment Variable Validation Module for TaskFlow Pro Frontend.
 * Supports both NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Ensures Supabase and backend URLs are validated at runtime without ever leaking secrets.
 */

export interface SupabaseEnvConfig {
  isConfigured: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  supabasePublishableKey: string | null;
  apiUrl: string;
  appUrl: string;
  missing: string[];
  urlValid: boolean;
  keyValid: boolean;
  errorMessage: string | null;
}

export function validateSupabaseUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.includes('placeholder') || trimmed.includes('your-project-ref')) return false;
  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.hostname.length > 3;
  } catch {
    return false;
  }
}

export function validateSupabaseKey(key: string | undefined | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (
    trimmed.includes('placeholder') ||
    trimmed.includes('your-anon-key') ||
    trimmed.includes('your-publishable-key')
  ) {
    return false;
  }

  // Format 1: Modern Supabase Publishable Key (sb_publishable_... or sbp_...)
  if (trimmed.startsWith('sb_publishable_') || trimmed.startsWith('sbp_')) {
    return trimmed.length >= 20;
  }

  // Format 2: Standard Supabase JWT Anon Key (3 dot-separated base64 segments)
  const parts = trimmed.split('.');
  if (parts.length === 3 && parts[0].length > 5 && parts[1].length > 5) {
    return true;
  }

  // Format 3: General valid Supabase key token with sufficient length
  return trimmed.length >= 20;
}

// Backward-compatibility alias
export const validateSupabaseAnonKey = validateSupabaseKey;

export function getSupabaseEnvConfig(): SupabaseEnvConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    null;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:5000/api';
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  const missing: string[] = [];
  if (!supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project-ref')) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseKey || supabaseKey.includes('placeholder') || supabaseKey.includes('your-anon-key') || supabaseKey.includes('your-publishable-key')) {
    missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  const urlValid = validateSupabaseUrl(supabaseUrl);
  const keyValid = validateSupabaseKey(supabaseKey);
  const isConfigured = Boolean(urlValid && keyValid);

  let errorMessage: string | null = null;
  if (!isConfigured) {
    if (missing.length > 0) {
      errorMessage = `Supabase authentication is not configured. Missing environment variable(s): ${missing.join(
        ', '
      )}. Please configure them in frontend/.env.local or your deployment settings.`;
    } else if (!urlValid) {
      errorMessage =
        'NEXT_PUBLIC_SUPABASE_URL is invalid. It must be a valid HTTPS URL (e.g. https://olffsrdahjzkworadhlo.supabase.co).';
    } else if (!keyValid) {
      errorMessage =
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is invalid. It must be a valid Supabase publishable key or anonymous JWT.';
    }
  }

  return {
    isConfigured,
    supabaseUrl: isConfigured ? supabaseUrl : null,
    supabaseAnonKey: isConfigured ? supabaseKey : null,
    supabasePublishableKey: isConfigured ? supabaseKey : null,
    apiUrl,
    appUrl,
    missing,
    urlValid,
    keyValid,
    errorMessage,
  };
}
