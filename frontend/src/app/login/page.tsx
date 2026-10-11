'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PublicNavbar } from '@/components/PublicNavbar';
import {
  Shield,
  AlertCircle,
  Loader2,
  Wrench,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export default function LoginPage() {
  const { user, loading, isConfigured, configError, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check for error or redirect params in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get('error');
      const urlReason = params.get('reason');

      if (urlError) {
        if (urlError === 'access_denied') {
          setErrorMsg('Google sign-in was cancelled or access was denied.');
        } else if (urlError === 'missing_authorization_code') {
          setErrorMsg('Authentication was cancelled or no authorization code was returned.');
        } else {
          setErrorMsg(decodeURIComponent(urlError));
        }
      } else if (urlReason === 'unconfigured') {
        setErrorMsg(
          'Supabase authentication is not yet configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local.'
        );
      }
    }
  }, []);

  useEffect(() => {
    if (user && !loading) {
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setIsSigningIn(false);
      setErrorMsg(
        err.message || 'Failed to initiate Google sign-in. Please try again.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* Enterprise Public Navbar */}
      <PublicNavbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-elevated border border-[#EAE6DF] p-8 space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-[#F97316] to-[#C2410C] flex items-center justify-center shadow-md shadow-orange-950/20">
              <div className="w-5 h-5 border-2 border-white rounded-[4px] rotate-45 transform" />
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5">
                <h1 className="text-xl font-bold tracking-tight text-charcoal-900">
                  TaskFlow
                </h1>
                <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider bg-orange-600/10 text-brand-600 border border-brand-500/20 rounded-md">
                  PRO
                </span>
              </div>
              <p className="text-xs text-charcoal-500 mt-1">
                Sign in with your Google account to access your workspace
              </p>
            </div>
          </div>

          {/* Unconfigured Alert Notice if environment variables are not yet populated */}
          {!isConfigured && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl space-y-2 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Supabase Configuration Needed</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Supabase credentials have not been configured in <code className="px-1 py-0.5 rounded bg-white font-mono text-[10px]">frontend/.env.local</code>. Click below to launch the setup wizard with complete instructions and verification tests.
              </p>
              <Link
                href="/setup/authentication"
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-[11px] rounded-xl transition"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Open Supabase Setup Wizard</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Error notification if any */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Authentication Error</p>
                <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">{errorMsg}</p>
                {!isConfigured && (
                  <Link
                    href="/setup/authentication"
                    className="inline-flex items-center gap-1 text-[11px] text-rose-900 font-bold underline mt-1.5"
                  >
                    <span>Configure in Setup Wizard</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Primary Action: Single Real Google OAuth Flow */}
          <div className="pt-2">
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn || loading}
              className="w-full py-3 px-4 bg-white hover:bg-ivory-50 text-charcoal-900 font-semibold text-xs rounded-xl border border-[#D9D5CC] shadow-subtle transition flex items-center justify-center gap-3 active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.41 7.37 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.27 2.59 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>

          {/* Security & Role Enforcement Details */}
          <div className="pt-4 border-t border-[#EAE6DF] space-y-2 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-charcoal-700">
              <Shield className="w-3.5 h-3.5 text-brand-600" />
              <span>Role-Based Workspace Access</span>
            </div>
            <p className="text-[11px] text-charcoal-500 leading-relaxed">
              Google authentication maps to your Supabase identity. Roles are derived server-side from the database: Administrators are routed to <span className="font-mono text-charcoal-800 font-semibold">/admin</span> and Standard Users to <span className="font-mono text-charcoal-800 font-semibold">/dashboard</span>.
            </p>
          </div>

          {/* Setup & Diagnostics Link for evaluators */}
          <div className="pt-3 border-t border-[#EAE6DF]/70 text-center">
            <Link
              href="/setup/authentication"
              className="inline-flex items-center gap-1.5 text-[11px] text-brand-700 font-semibold hover:text-brand-800 transition"
            >
              <Wrench className="w-3.5 h-3.5 text-brand-600" />
              <span>Configure Supabase & Google OAuth in Setup Wizard</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Public Footer */}
      <footer className="border-t border-[#EAE6DF] bg-white py-4 px-6 text-center text-xs text-charcoal-500">
        <p>TaskFlow Pro &bull; Production Software Recruitment Assignment &bull; Next.js + Flask + Supabase</p>
      </footer>
    </div>
  );
}
