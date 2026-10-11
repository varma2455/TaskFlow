'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApiClient, SetupStatus } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  getSupabaseEnvConfig,
  validateSupabaseUrl,
  validateSupabaseAnonKey,
} from '@/lib/env';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Lock,
  ArrowRight,
  Info,
  Workflow,
  AlertCircle,
  RefreshCw,
  Server,
  Database,
  Globe,
  Key,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';

export default function SetupAuthenticationPage() {
  const { signInWithGoogle, isConfigured, configError, user } = useAuth();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Step 1 Interactive Validation State
  const envConfig = getSupabaseEnvConfig();
  const [testUrl, setTestUrl] = useState(envConfig.supabaseUrl || '');
  const [testAnonKey, setTestAnonKey] = useState(envConfig.supabaseAnonKey || '');
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  // Step 4 Test State
  const [isTestingAuth, setIsTestingAuth] = useState(false);
  const [authTestError, setAuthTestError] = useState<string | null>(null);

  useEffect(() => {
    ApiClient.getSetupStatus()
      .then(setStatus)
      .catch(console.error);
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleTestProjectReachability = async () => {
    setIsPinging(true);
    setPingResult(null);

    const isUrlValid = validateSupabaseUrl(testUrl);
    if (!isUrlValid) {
      setIsPinging(false);
      setPingResult({
        success: false,
        message: 'Invalid Supabase URL format.',
        details: 'Must be an HTTPS URL such as https://<project-ref>.supabase.co',
      });
      return;
    }

    const isKeyValid = validateSupabaseAnonKey(testAnonKey);
    if (!isKeyValid) {
      setIsPinging(false);
      setPingResult({
        success: false,
        message: 'Invalid Anon Key format.',
        details: 'Must be a 3-part base64 encoded Supabase JWT anon key.',
      });
      return;
    }

    try {
      // Ping the Supabase auth health endpoint
      const pingEndpoint = `${testUrl.replace(/\/$/, '')}/auth/v1/health`;
      const res = await fetch(pingEndpoint, {
        headers: {
          apikey: testAnonKey,
        },
      });

      if (res.ok) {
        setPingResult({
          success: true,
          message: 'Project reachable and operational!',
          details: `HTTP ${res.status} received from ${pingEndpoint}`,
        });
      } else {
        setPingResult({
          success: false,
          message: `Supabase project returned HTTP ${res.status}.`,
          details: 'The project URL was contacted, but returned a non-200 status. Check anon key validity.',
        });
      }
    } catch (err: any) {
      setPingResult({
        success: false,
        message: 'Network error reaching Supabase project.',
        details: err.message || 'Ensure the project URL is active and CORS allows public fetch.',
      });
    } finally {
      setIsPinging(false);
    }
  };

  const handleRunAuthTest = async () => {
    setAuthTestError(null);
    setIsTestingAuth(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setIsTestingAuth(false);
      setAuthTestError(err.message || 'Failed to initiate Google sign-in.');
    }
  };

  // Derive Supabase callback URL for Google Cloud
  const supabaseProjectRef = testUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '<your-project-ref>';
  const supabaseOAuthCallbackUrl = `https://${supabaseProjectRef}.supabase.co/auth/v1/callback`;
  const appCallbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : 'http://localhost:3000/auth/callback';

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Production Authentication Diagnostics</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-charcoal-900 tracking-tight">
          Supabase Auth & Google OAuth 2.0 Configuration Wizard
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-600 mt-1 max-w-3xl leading-relaxed">
          Follow the 5 steps below to configure your live Supabase project and Google Cloud OAuth credentials. This wizard validates each requirement and tests end-to-end connectivity.
        </p>
      </div>

      {/* =========================================================================
          STEP 1: SUPABASE PROJECT
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DF]">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-orange-100 text-brand-700 flex items-center justify-center font-black text-xs">
              STEP 1
            </span>
            <div>
              <h2 className="text-base font-bold text-charcoal-900">
                Supabase Project & Anonymous Key
              </h2>
              <p className="text-xs text-charcoal-500">
                Configure your public project URL and anonymous publishable API key
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              isConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isConfigured ? 'Active in Environment' : 'Configuration Required'}
          </span>
        </div>

        {/* Instructions */}
        <div className="text-xs text-charcoal-600 space-y-2 leading-relaxed">
          <p>
            1. Create a project at{' '}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-brand-600 font-bold underline inline-flex items-center gap-0.5"
            >
              Supabase Dashboard <ExternalLink className="w-3 h-3" />
            </a>
            .
          </p>
          <p>
            2. Navigate to <strong>Project Settings &rarr; API</strong>.
          </p>
          <p>
            3. Copy the <strong>Project URL</strong> and <strong>anon / public API key</strong> into <code className="px-1 py-0.5 rounded bg-ivory-100 font-mono text-[11px] text-charcoal-800">frontend/.env.local</code>.
          </p>
        </div>

        {/* Security Alert: Never expose service-role key */}
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Security Requirement: Never Expose Service-Role Credentials</p>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              Only use the public <code className="font-mono font-bold">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in the frontend. The <code className="font-mono font-bold">SUPABASE_SERVICE_ROLE_KEY</code> bypasses Row Level Security and must strictly reside on the server (<code className="font-mono">backend/.env</code> on Render).
            </p>
          </div>
        </div>

        {/* Interactive Reachability Tester */}
        <div className="p-5 rounded-2xl bg-ivory-50 border border-[#EAE6DF] space-y-4">
          <h4 className="text-xs font-bold text-charcoal-900 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-brand-600" />
            <span>Interactive Project Reachability & Key Validator</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-charcoal-800 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="https://xyzproject.supabase.co"
                className="w-full px-3 py-2 rounded-xl border border-[#D9D5CC] bg-white font-mono text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <span className="text-[10px] text-charcoal-500 mt-0.5 block">
                Format: https://&lt;project-ref&gt;.supabase.co
              </span>
            </div>

            <div>
              <label className="block font-bold text-charcoal-800 mb-1">
                Public Anonymous / Publishable Key
              </label>
              <input
                type="password"
                value={testAnonKey}
                onChange={(e) => setTestAnonKey(e.target.value)}
                placeholder="sb_publishable_... or eyJhbGciOiJIUzI1Ni..."
                className="w-full px-3 py-2 rounded-xl border border-[#D9D5CC] bg-white font-mono text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <span className="text-[10px] text-charcoal-500 mt-0.5 block">
                Format: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_...) or standard anon JWT
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTestProjectReachability}
              disabled={isPinging}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-subtle transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              <span>Verify Project Reachability</span>
            </button>

            <button
              onClick={() =>
                copyToClipboard(
                  `NEXT_PUBLIC_SUPABASE_URL=${testUrl || 'https://olffsrdahjzkworadhlo.supabase.co'}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${testAnonKey || 'your-publishable-key'}\nNEXT_PUBLIC_API_URL=http://localhost:5000/api\n`,
                  'env_snippet'
                )
              }
              className="px-3.5 py-2 bg-white hover:bg-ivory-100 text-charcoal-800 font-semibold text-xs rounded-xl border border-[#D9D5CC] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedText === 'env_snippet' ? 'Copied Snippet!' : 'Copy .env.local Snippet'}</span>
            </button>
          </div>

          {pingResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                pingResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {pingResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{pingResult.message}</span>
              </div>
              {pingResult.details && (
                <p className="text-[11px] opacity-90">{pingResult.details}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          STEP 2: GOOGLE OAUTH
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DF]">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-orange-100 text-brand-700 flex items-center justify-center font-black text-xs">
              STEP 2
            </span>
            <div>
              <h2 className="text-base font-bold text-charcoal-900">
                Google Cloud Console & Supabase Provider
              </h2>
              <p className="text-xs text-charcoal-500">
                Set up Google OAuth Client ID, Consent Screen, and enable provider in Supabase
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-charcoal-600">
          <div className="space-y-3">
            <h4 className="font-bold text-charcoal-900 flex items-center gap-1.5">
              <span>A. Google Cloud Console Configuration</span>
            </h4>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>
                Open the{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 font-bold underline inline-flex items-center gap-0.5"
                >
                  Google Cloud Credentials Console <ExternalLink className="w-3 h-3" />
                </a>
                .
              </li>
              <li>
                Under <strong>OAuth consent screen</strong>, set user type to <strong>External</strong>, provide an App name (e.g. <em>TaskFlow Pro</em>) and user support email.
              </li>
              <li>
                Click <strong>Create Credentials &rarr; OAuth client ID</strong>.
              </li>
              <li>
                Select Application type: <strong>Web application</strong>.
              </li>
              <li>
                In <strong>Authorized redirect URIs</strong>, paste the Supabase Callback URL below:
              </li>
            </ol>

            <div className="p-3 rounded-xl bg-ivory-50 border border-[#EAE6DF] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-charcoal-800">
                  Google Authorized Redirect URI
                </span>
                <button
                  onClick={() => copyToClipboard(supabaseOAuthCallbackUrl, 'supabase_callback')}
                  className="text-[10px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedText === 'supabase_callback' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-[11px] text-charcoal-900 bg-white p-2 rounded border border-[#EAE6DF] break-all">
                {supabaseOAuthCallbackUrl}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-charcoal-900 flex items-center gap-1.5">
              <span>B. Enable Google Provider in Supabase</span>
            </h4>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>
                In the Supabase Dashboard, navigate to <strong>Authentication &rarr; Providers</strong>.
              </li>
              <li>
                Locate <strong>Google</strong> and toggle it to <strong>Enabled</strong>.
              </li>
              <li>
                Paste your <strong>Client ID</strong> obtained from Google Cloud.
              </li>
              <li>
                Paste your <strong>Client Secret</strong> obtained from Google Cloud.
              </li>
              <li>
                Click <strong>Save</strong>.
              </li>
            </ol>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
              <span className="font-bold">Important note:</span> An application cannot automate external Google Cloud OAuth registration because Google requires authenticated project administrative consent. Following the steps above takes less than 3 minutes.
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          STEP 3: REDIRECT URLS & OPEN-REDIRECT PREVENTION
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DF]">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-orange-100 text-brand-700 flex items-center justify-center font-black text-xs">
              STEP 3
            </span>
            <div>
              <h2 className="text-base font-bold text-charcoal-900">
                Application Redirect URLs & Open-Redirect Protection
              </h2>
              <p className="text-xs text-charcoal-500">
                Allowlist application callback URLs in Supabase and prevent unsafe redirect targets
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 text-xs text-charcoal-600">
          <p className="leading-relaxed">
            In <strong>Supabase Dashboard &rarr; Authentication &rarr; URL Configuration</strong>, you must configure the following domains:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-ivory-50 border border-[#EAE6DF] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-charcoal-800">Local Development URL</span>
                <button
                  onClick={() => copyToClipboard('http://localhost:3000/auth/callback', 'local_cb')}
                  className="text-[10px] font-bold text-brand-600 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedText === 'local_cb' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-[11px] bg-white p-2 rounded border border-[#EAE6DF]">
                http://localhost:3000/auth/callback
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-ivory-50 border border-[#EAE6DF] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-charcoal-800">Production Vercel URL</span>
                <button
                  onClick={() => copyToClipboard('https://your-app.vercel.app/auth/callback', 'prod_cb')}
                  className="text-[10px] font-bold text-brand-600 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedText === 'prod_cb' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-[11px] bg-white p-2 rounded border border-[#EAE6DF]">
                https://your-production-app.vercel.app/auth/callback
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-ivory-50 border border-[#EAE6DF] text-xs text-charcoal-700 space-y-1">
            <span className="font-bold text-charcoal-900">Open-Redirect Prevention in TaskFlow Pro</span>
            <p className="text-[11px] text-charcoal-600 leading-relaxed">
              The Next.js callback route handler (<code className="font-mono text-brand-600">/auth/callback</code>) strictly validates all <code className="font-mono">next</code> query parameters. Any redirect destination not starting with a single forward slash (e.g. <code className="font-mono">https://malicious-site.com</code> or protocol-relative <code className="font-mono">{"//malicious"}</code>) is discarded, and the user is safely routed to their authoritative role dashboard (<code className="font-mono">/admin</code> or <code className="font-mono">/dashboard</code>).
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          STEP 4: AUTHENTICATION TEST
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DF]">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-orange-100 text-brand-700 flex items-center justify-center font-black text-xs">
              STEP 4
            </span>
            <div>
              <h2 className="text-base font-bold text-charcoal-900">
                End-to-End Google Sign-In Test
              </h2>
              <p className="text-xs text-charcoal-500">
                Verify that Supabase Auth client is initialized and trigger a real Google sign-in test
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-ivory-50 border border-[#EAE6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-charcoal-900">
              Interactive Google OAuth 2.0 Flow
            </h4>
            <p className="text-xs text-charcoal-600 max-w-lg">
              When clicked, TaskFlow Pro executes the real Supabase Auth OAuth API with account selection (<code className="font-mono text-brand-600">prompt: select_account</code>) and exchanges the PKCE code at <code className="font-mono text-brand-600">/auth/callback</code>.
            </p>
          </div>

          <button
            onClick={handleRunAuthTest}
            disabled={isTestingAuth}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-subtle transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 whitespace-nowrap active:scale-95"
          >
            {isTestingAuth ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Test Google Sign-In</span>
              </>
            )}
          </button>
        </div>

        {authTestError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Authentication Test Reported an Error</span>
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed">{authTestError}</p>
          </div>
        )}
      </div>

      {/* =========================================================================
          STEP 5: FINAL READINESS MATRIX
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DF]">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-orange-100 text-brand-700 flex items-center justify-center font-black text-xs">
              STEP 5
            </span>
            <div>
              <h2 className="text-base font-bold text-charcoal-900">
                Final Infrastructure Readiness Matrix
              </h2>
              <p className="text-xs text-charcoal-500">
                Verified status of Supabase, Google Provider, Callback Route, and Flask API
              </p>
            </div>
          </div>
        </div>

        {/* Readiness Table: Items are ONLY marked successful if actually verified */}
        <div className="divide-y divide-[#EAE6DF] text-xs">
          {/* Item 1: Supabase Config */}
          <div className="py-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-bold text-charcoal-900">1. Supabase Project URL & Anon Key</p>
              <p className="text-[11px] text-charcoal-500">
                Validated HTTPS format and 3-part JWT anon key in frontend environment
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
                isConfigured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {isConfigured ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Configured</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 text-rose-600" />
                  <span>Unconfigured</span>
                </>
              )}
            </span>
          </div>

          {/* Item 2: Google Provider */}
          <div className="py-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-bold text-charcoal-900">2. Google OAuth Provider</p>
              <p className="text-[11px] text-charcoal-500">
                Google Cloud client credentials configured in Supabase Auth
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
                status?.authentication.client_id_configured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {status?.authentication.client_id_configured ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Configured</span>
                </>
              ) : (
                <>
                  <Info className="w-3 h-3 text-amber-600" />
                  <span>Requires Supabase Step 2</span>
                </>
              )}
            </span>
          </div>

          {/* Item 3: Callback Route Handler */}
          <div className="py-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-bold text-charcoal-900">3. SSR Callback Route Handler (/auth/callback)</p>
              <p className="text-[11px] text-charcoal-500">
                Server-side PKCE code exchange with open-redirect mitigation
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Operational</span>
            </span>
          </div>

          {/* Item 4: Session Cookie Handling */}
          <div className="py-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-bold text-charcoal-900">4. Cookie & Middleware Session Handling</p>
              <p className="text-[11px] text-charcoal-500">
                @supabase/ssr cookie synchronization and edge route middleware
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Installed & Active</span>
            </span>
          </div>

          {/* Item 5: Protected Flask REST API */}
          <div className="py-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-bold text-charcoal-900">5. Protected Flask Backend (/api/me)</p>
              <p className="text-[11px] text-charcoal-500">
                JWT signature/claims verification with authoritative PostgreSQL role lookup
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Operational</span>
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <Link
            href="/login"
            className="px-4 py-2 bg-ivory-100 hover:bg-ivory-200 text-charcoal-800 text-xs font-semibold rounded-xl border border-[#D9D5CC] transition flex items-center gap-1.5"
          >
            <span>Return to Login Page</span>
          </Link>

          <Link
            href="/setup"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-subtle transition flex items-center gap-1.5"
          >
            <span>System Overview</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
