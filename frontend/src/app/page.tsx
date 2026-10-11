'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  CheckSquare,
  ShieldCheck,
  Mail,
  Zap,
  Clock,
  ArrowRight,
  Database,
  Lock,
} from 'lucide-react';

export default function LandingPage() {
  const { user, signInWithGoogle, signInWithDemo, loading } = useAuth();
  const router = useRouter();

  if (user && !loading) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-slate-900 text-white py-20 px-4 sm:px-6 lg:px-8 border-b border-navy-800">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-900/60 border border-brand-500/30 text-brand-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            Hairdrama Tech Internship Assignment &bull; Part 2
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            High-Velocity Task Management{' '}
            <span className="bg-gradient-to-r from-brand-400 via-violet-300 to-indigo-300 bg-clip-text text-transparent">
              Built for Scale
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-slate-300 leading-relaxed">
            TaskFlow combines <strong>Next.js</strong>, <strong>Flask</strong>, and{' '}
            <strong>Supabase PostgreSQL</strong> with automated Gmail transactional notifications,
            deadlines tracking, and Realtime synchronization.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => signInWithGoogle()}
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-navy-900 hover:bg-slate-100 rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl transition flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              Sign in with Google
            </button>

            <button
              onClick={() => signInWithDemo('admin')}
              className="w-full sm:w-auto px-6 py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-brand-500/25 transition flex items-center justify-center gap-2"
            >
              Demo Admin Login &rarr;
            </button>

            <button
              onClick={() => signInWithDemo('member')}
              className="w-full sm:w-auto px-6 py-3.5 bg-navy-800 hover:bg-navy-700 text-slate-200 rounded-xl font-bold text-sm border border-slate-700 transition"
            >
              Demo Member Login
            </button>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Verified Token Security</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Strict server-side JWT verification in Flask. Authorization identity is derived
              exclusively from token claims with comprehensive Row Level Security.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Durable Gmail Outbox</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Transactional Gmail API notifications for task creation, assignment, and completion.
              Idempotency checks prevent duplicate emails.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Deadline & Overdue Worker</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Proactive deadline reminders, overdue status calculations, and background scheduler
              that respects teammate delivery preferences.
            </p>
          </div>
        </div>

        {/* Stack Badges */}
        <div className="mt-16 pt-12 border-t border-slate-200/80 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">
            Production Architecture & Stack
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              'Next.js 14 App Router',
              'TypeScript',
              'Tailwind CSS',
              'Flask 3 REST API',
              'Supabase PostgreSQL',
              'Google OAuth 2.0',
              'Gmail API',
              'Gunicorn',
              'Vercel & Render',
            ].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/60"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 border-t border-slate-800 text-center text-xs">
        <p>
          TaskFlow &bull; Hairdrama Tech Full-Stack Internship Assignment &bull; Built with Next.js, Flask, and Supabase
        </p>
      </footer>
    </div>
  );
}
