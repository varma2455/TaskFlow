'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PublicNavbar } from '@/components/PublicNavbar';
import {
  CheckSquare,
  ShieldCheck,
  Mail,
  Zap,
  Clock,
  ArrowRight,
  Database,
  Lock,
  Layers,
  Sparkles,
  Users,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Server,
  Code2,
  Workflow,
  Wrench,
  ChevronRight,
} from 'lucide-react';

export default function LandingPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  const handleOpenApp = () => {
    if (user) {
      router.push(user.role === 'admin' ? '/admin' : '/dashboard');
    } else {
      signInWithGoogle();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-charcoal-900 flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* Enterprise Public Navbar */}
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[#EAE6DF]/70">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            {/* Recruitment Assignment Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              Software Development Recruitment Assignment &bull; TaskFlow Pro
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-charcoal-900 leading-[1.12]">
              Precision Task Orchestration <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#EA580C] via-[#C2410C] to-[#9A3412] bg-clip-text text-transparent">
                Engineered for High-Velocity Teams
              </span>
            </h1>

            <p className="max-w-3xl mx-auto text-sm sm:text-base text-charcoal-600 leading-relaxed">
              A production SaaS platform pairing <strong>Next.js 14 App Router</strong>,{' '}
              <strong>TypeScript</strong>, and <strong>TanStack Query</strong> with a modular{' '}
              <strong>Python Flask REST API</strong>, <strong>Supabase PostgreSQL</strong> with Row Level Security,{' '}
              and transactional <strong>Gmail API</strong> notifications.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={handleOpenApp}
                disabled={loading}
                className="w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-ivory-50 text-charcoal-900 rounded-xl font-bold text-xs border border-[#D9D5CC] shadow-subtle transition flex items-center justify-center gap-3 active:scale-95 cursor-pointer disabled:opacity-60"
              >
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
                <span>{user ? 'Enter Your Workspace' : 'Continue with Google'}</span>
              </button>

              <Link
                href="/setup"
                className="w-full sm:w-auto px-6 py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-xs shadow-md shadow-brand-950/20 transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Setup & Diagnostics</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Section: Product Overview (#product) */}
        <section id="product" className="py-16 px-4 sm:px-6 lg:px-8 border-b border-[#EAE6DF]/70">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-600 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                Product Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
                Designed for Role Clarity and Velocity
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-600">
                A dual-experience application isolating individual contributor workspaces while equipping administrators with global oversight and delivery audits.
              </p>
            </div>

            {/* Visual Preview Showcase */}
            <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-elevated p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EAE6DF]">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-mono font-medium text-charcoal-500 ml-2">
                    taskflow-pro-dashboard &bull; live preview
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-charcoal-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Realtime WebSocket Active</span>
                </div>
              </div>

              {/* Sample KPI Cards Mockup */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-ivory-50 border border-[#EAE6DF] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-charcoal-500 tracking-wider">System Tasks</span>
                  <p className="text-2xl font-black text-charcoal-900">42</p>
                  <span className="text-[10px] text-emerald-600 font-semibold">+14% vs last week</span>
                </div>
                <div className="p-4 rounded-2xl bg-ivory-50 border border-[#EAE6DF] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-charcoal-500 tracking-wider">Completion Rate</span>
                  <p className="text-2xl font-black text-brand-600">78.5%</p>
                  <span className="text-[10px] text-charcoal-500 font-semibold">Healthy velocity</span>
                </div>
                <div className="p-4 rounded-2xl bg-ivory-50 border border-[#EAE6DF] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-charcoal-500 tracking-wider">Active Members</span>
                  <p className="text-2xl font-black text-charcoal-900">18</p>
                  <span className="text-[10px] text-charcoal-500 font-semibold">Multi-user Google OAuth</span>
                </div>
                <div className="p-4 rounded-2xl bg-ivory-50 border border-[#EAE6DF] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-charcoal-500 tracking-wider">Email Delivery</span>
                  <p className="text-2xl font-black text-emerald-600">99.4%</p>
                  <span className="text-[10px] text-emerald-600 font-semibold">Gmail API outbox</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-5 rounded-2xl bg-[#111215] text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-300">Admin Control Center (/admin)</span>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-brand-600/30 text-brand-400 border border-brand-500/30">
                      Authoritative RBAC
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    System-wide oversight across all users, dynamic role promotion, transactional email outbox monitoring, and live team workload charts.
                  </p>
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 text-xs text-brand-400 font-bold hover:text-brand-300"
                  >
                    <span>Inspect Admin Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#EAE6DF] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-charcoal-900">User Workspace (/dashboard)</span>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Isolated Privacy
                    </span>
                  </div>
                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    Personalized high-focus view where individual contributors manage tasks they created or were assigned to, with zero cross-tenant contamination.
                  </p>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs text-brand-600 font-bold hover:text-brand-700"
                  >
                    <span>Inspect User Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Features (#features) */}
        <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 border-b border-[#EAE6DF]/70 bg-white">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-600 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                Engineering Capabilities
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
                Built to Production SaaS Standards
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-600">
                Every requirement fulfilled with robust architecture rather than prototypes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-3.5 hover:shadow-subtle transition">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-brand-600 flex items-center justify-center border border-orange-200">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-charcoal-900">Google OAuth 2.0 with PKCE</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Supabase Auth with standard Proof Key for Code Exchange. Automatic Google profile provisioning, account picker prompt, and SSR token exchange.
                </p>
              </div>

              <div className="p-6 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-3.5 hover:shadow-subtle transition">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <Server className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-charcoal-900">Python Flask REST API</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Decoupled backend running on Render with Gunicorn, modular blueprints, token verification middleware, and strict CORS policies.
                </p>
              </div>

              <div className="p-6 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-3.5 hover:shadow-subtle transition">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-charcoal-900">Supabase PostgreSQL & RLS</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  PostgreSQL relational schema with versioned SQL migrations (001 through 005), Row Level Security, foreign keys, and indexes.
                </p>
              </div>

              <div className="p-6 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-3.5 hover:shadow-subtle transition">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-charcoal-900">Transactional Gmail API</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Durable transactional outbox pattern with idempotency keys, background retry workers, and 24h deadline reminder dispatchers.
                </p>
              </div>

              <div className="p-6 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-3.5 hover:shadow-subtle transition">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-charcoal-900">TanStack Query Cache</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Optimistic updates, background revalidation, stale-time caching, and total cache purge on authenticated sign-out to prevent data bleeding.
                </p>
              </div>

              <div className="p-6 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-3.5 hover:shadow-subtle transition">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Wrench className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-charcoal-900">In-Built Setup Wizard</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Self-serve diagnostics dashboard checking OAuth callbacks, database tables, migrations, and email readiness with zero secret leakage.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Security (#security) */}
        <section id="security" className="py-16 px-4 sm:px-6 lg:px-8 border-b border-[#EAE6DF]/70">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-600 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                Defense in Depth
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
                Enterprise Security Architecture
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-600">
                Multi-layered protection guaranteeing user confidentiality and authoritative administrative controls.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-4">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-5 h-5 text-brand-600" />
                  <h4 className="font-bold text-sm text-charcoal-900">Authentication & Identity Verification</h4>
                </div>
                <ul className="space-y-2 text-xs text-charcoal-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Every backend request validates the Bearer JWT against Supabase Public Keys / Secret.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>User roles are never read from client parameters; they are authoritatively fetched from PostgreSQL.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Open-redirect mitigation ensures OAuth callbacks only redirect to permitted relative routes.</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-4">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-brand-600" />
                  <h4 className="font-bold text-sm text-charcoal-900">Data Isolation & Defense In Depth</h4>
                </div>
                <ul className="space-y-2 text-xs text-charcoal-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Row Level Security (RLS) ensures non-admin queries cannot read another user&apos;s records.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>CORS origins strictly whitelisted to prevent unauthorized cross-origin invocations.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Zero secrets leakage: API diagnostic endpoints report health flags without revealing tokens.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section: About (#about) */}
        <section id="about" className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-[#EAE6DF]/70">
          <div className="max-w-4xl mx-auto space-y-8 text-center">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-600 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
              Recruitment Assignment Documentation
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
              About TaskFlow Pro
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
              TaskFlow Pro was developed as an end-to-end full-stack recruitment assignment submission demonstrating advanced proficiency in Next.js 14 App Router, Python Flask REST API design, Supabase Auth with Google OAuth 2.0, PostgreSQL migrations with Row Level Security, and automated transactional Gmail API integration.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF]">
                <span className="text-xs font-bold text-charcoal-900">Frontend</span>
                <p className="text-[11px] text-charcoal-500 mt-1">Next.js 14 & Tailwind</p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF]">
                <span className="text-xs font-bold text-charcoal-900">Backend</span>
                <p className="text-[11px] text-charcoal-500 mt-1">Python Flask & Gunicorn</p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF]">
                <span className="text-xs font-bold text-charcoal-900">Database</span>
                <p className="text-[11px] text-charcoal-500 mt-1">Supabase PostgreSQL</p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF]">
                <span className="text-xs font-bold text-charcoal-900">Auth & Mail</span>
                <p className="text-[11px] text-charcoal-500 mt-1">Google OAuth + Gmail API</p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-center gap-4">
              <Link
                href="/setup"
                className="px-5 py-2.5 bg-ivory-100 hover:bg-ivory-200 text-charcoal-800 text-xs font-bold rounded-xl border border-[#D9D5CC] transition flex items-center gap-2"
              >
                <Wrench className="w-4 h-4 text-brand-600" />
                <span>Launch Setup Wizard</span>
              </Link>
              <button
                onClick={() => signInWithGoogle()}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-subtle transition flex items-center gap-2 cursor-pointer"
              >
                <span>Sign In to Experience App</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#EAE6DF] bg-white py-8 px-6 text-center text-xs text-charcoal-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-charcoal-900">TaskFlow PRO</span>
            <span>&bull;</span>
            <span>Production Software Recruitment Assignment</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/setup" className="hover:text-charcoal-900 transition">
              Setup & Diagnostics
            </Link>
            <Link href="/login" className="hover:text-charcoal-900 transition">
              Google Sign-In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
