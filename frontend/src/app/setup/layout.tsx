'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, SetupStatus } from '@/lib/api';
import {
  Wrench,
  ShieldCheck,
  Database,
  Mail,
  Server,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  LayoutDashboard,
  Layers,
} from 'lucide-react';

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    setRefreshing(true);
    try {
      const data = await ApiClient.getSetupStatus();
      setStatus(data);
    } catch (e) {
      console.error('Failed to load setup diagnostics:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const tabs = [
    { label: 'System Overview', href: '/setup', icon: LayoutDashboard },
    { label: 'Google OAuth 2.0', href: '/setup/authentication', icon: ShieldCheck },
    { label: 'Database & Migrations', href: '/setup/database', icon: Database },
    { label: 'Gmail API Notifications', href: '/setup/email', icon: Mail },
  ];

  const getBackLink = () => {
    if (!user) return '/';
    return user.role === 'admin' ? '/admin' : '/dashboard';
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-charcoal-900 flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* Header bar */}
      <header className="border-b border-[#EAE6DF] bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand & Title */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F97316] to-[#C2410C] flex items-center justify-center shrink-0 shadow-sm shadow-orange-950/20 group-hover:scale-105 transition-transform">
                  <div className="w-3.5 h-3.5 border-2 border-white rounded-[3px] rotate-45 transform" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-charcoal-900">
                    TaskFlow
                  </span>
                  <span className="px-1 py-0.2 text-[8px] font-black uppercase tracking-wider bg-orange-600/10 text-brand-600 border border-brand-500/25 rounded">
                    PRO
                  </span>
                </div>
              </Link>

              <div className="h-4 w-px bg-[#EAE6DF] mx-1" />

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-charcoal-800">
                  Setup & Diagnostics Wizard
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 hidden sm:inline-block">
                  Recruiter / Admin Tool
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={fetchStatus}
                disabled={refreshing}
                title="Refresh diagnostics"
                className="p-2 rounded-xl text-charcoal-600 hover:text-charcoal-900 hover:bg-ivory-100 transition border border-[#EAE6DF] disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-600' : ''}`}
                />
              </button>

              {status && (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Backend: {status.database.mode === 'live' ? 'Live Supabase' : 'Active (Mock DB)'}
                  </span>
                </div>
              )}

              <Link
                href={getBackLink()}
                className="px-3 py-1.5 bg-ivory-100 hover:bg-ivory-200 text-charcoal-800 text-xs font-semibold rounded-xl border border-[#D9D5CC] transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>
                  {user ? (user.role === 'admin' ? 'Admin Portal' : 'Workspace') : 'Back to Home'}
                </span>
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 -mb-px overflow-x-auto no-scrollbar pt-1">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-brand-600 text-brand-700 bg-brand-50/50'
                      : 'border-transparent text-charcoal-600 hover:text-charcoal-900 hover:border-charcoal-300'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-600' : 'text-charcoal-500'}`} />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#EAE6DF] bg-white py-6 px-6 text-center text-xs text-charcoal-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>TaskFlow Pro Setup Diagnostics &bull; Secure Zero-Leak Architecture &bull; Next.js 14 + Python Flask</p>
          <div className="flex items-center gap-3 font-medium">
            <Link href="/" className="hover:text-charcoal-900">Home</Link>
            <span>&bull;</span>
            <Link href="/login" className="hover:text-charcoal-900">Sign In</Link>
            <span>&bull;</span>
            <Link href="/admin" className="hover:text-charcoal-900">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
