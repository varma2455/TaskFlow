'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Menu,
  X,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Wrench,
  ExternalLink,
  User,
} from 'lucide-react';

export const PublicNavbar: React.FC = () => {
  const pathname = usePathname();
  const { user, signInWithGoogle, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Product', href: '/#product' },
    { label: 'Features', href: '/#features' },
    { label: 'Security', href: '/#security' },
    { label: 'About', href: '/#about' },
    { label: 'Setup & Diagnostics', href: '/setup', icon: Wrench },
  ];

  const getDashboardLink = () => {
    if (!user) return '/login';
    return user.role === 'admin' ? '/admin' : '/dashboard';
  };

  return (
    <header className="border-b border-[#EAE6DF] bg-white/90 backdrop-blur-md sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F97316] to-[#C2410C] flex items-center justify-center shrink-0 shadow-sm shadow-orange-950/20 group-hover:scale-105 transition-transform">
              <div className="w-4 h-4 border-2 border-white rounded-[3px] rotate-45 transform" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-charcoal-900">
                TaskFlow
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-orange-600/10 text-brand-600 border border-brand-500/25 rounded-md">
                PRO
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-ivory-200 text-brand-700'
                      : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-ivory-100'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-brand-600" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href={getDashboardLink()}
                  className="px-3.5 py-2 bg-ivory-100 hover:bg-ivory-200 text-charcoal-800 text-xs font-semibold rounded-xl border border-[#D9D5CC] transition flex items-center gap-2"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || 'User'}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-3.5 h-3.5 text-charcoal-600" />
                  )}
                  <span>
                    {user.role === 'admin' ? 'Admin Portal' : 'Workspace'}
                  </span>
                </Link>
                <Link
                  href={getDashboardLink()}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-subtle transition flex items-center gap-1.5 active:scale-95"
                >
                  <span>Open App</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                {pathname !== '/login' && (
                  <Link
                    href="/login"
                    className="px-3.5 py-2 text-charcoal-700 hover:text-charcoal-900 text-xs font-semibold rounded-xl hover:bg-ivory-100 transition"
                  >
                    Sign In
                  </Link>
                )}
                <button
                  onClick={() => signInWithGoogle()}
                  disabled={loading}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-subtle transition flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  <span>Continue with Google</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="p-2 rounded-xl text-charcoal-600 hover:text-charcoal-900 hover:bg-ivory-100 transition"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-[#EAE6DF] bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-700 hover:text-charcoal-900 hover:bg-ivory-100 transition flex items-center gap-2"
                >
                  {Icon && <Icon className="w-4 h-4 text-brand-600" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#EAE6DF] space-y-2">
            {user ? (
              <Link
                href={getDashboardLink()}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-subtle transition flex items-center justify-center gap-2"
              >
                <span>
                  Go to {user.role === 'admin' ? 'Admin Portal' : 'Dashboard'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2 px-4 bg-white border border-[#D9D5CC] text-charcoal-800 text-xs font-semibold rounded-xl transition flex items-center justify-center"
                >
                  Sign In
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signInWithGoogle();
                  }}
                  className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-subtle transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue with Google</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
