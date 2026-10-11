'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, NotificationItem } from '@/lib/api';
import {
  Shield,
  LayoutDashboard,
  Users,
  CheckSquare,
  History,
  Mail,
  Settings,
  Bell,
  LogOut,
  Wrench,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Menu,
  X,
  Search,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface AdminShellProps {
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({ children }) => {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsSidebarOpenMobile(false);
  }, [pathname]);

  // Fetch notifications
  useEffect(() => {
    if (user && user.role === 'admin') {
      ApiClient.getNotifications()
        .then((res) => {
          setNotifications(res.notifications || []);
          setUnreadCount(res.unread_count || 0);
        })
        .catch(() => {});
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null;
  }

  // Unauthorized (Role is 'user', not 'admin')
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#EAE6DF] shadow-elevated p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200/60 shadow-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800">
              403 Forbidden
            </span>
            <h1 className="text-xl font-bold text-charcoal-900 mt-2">
              Administrator Privileges Required
            </h1>
            <p className="text-xs text-charcoal-600 mt-2 leading-relaxed">
              Your account (<span className="font-semibold text-charcoal-800">{user.email}</span>) is assigned the standard <code className="px-1 py-0.5 rounded bg-ivory-200 text-charcoal-800 font-mono text-[11px]">user</code> role and is not authorized to access administrative management endpoints.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl shadow-subtle transition flex items-center justify-center gap-2 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> Return to User Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Admin Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'User Management', href: '/admin/users', icon: Users },
    { label: 'System Tasks', href: '/admin/tasks', icon: CheckSquare },
    { label: 'Audit Activity', href: '/admin/activity', icon: History },
    { label: 'Email Delivery', href: '/admin/notifications', icon: Mail },
    { label: 'Setup & Diagnostics', href: '/setup', icon: Wrench },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-charcoal-900 flex antialiased">
      {/* =========================================================================
          1. DARK VERTICAL SIDEBAR (DESKTOP)
         ========================================================================= */}
      <aside
        className={`hidden md:flex flex-col bg-[#111215] border-r border-[#22242B] transition-all duration-300 z-30 select-none ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        } shrink-0 fixed inset-y-0 left-0`}
      >
        {/* Branding Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#22242B]">
          <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F97316] to-[#C2410C] flex items-center justify-center shrink-0 shadow-sm shadow-orange-950/40">
              <div className="w-3.5 h-3.5 border-2 border-white rounded-[3px] rotate-45 transform" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-bold text-sm tracking-tight text-white">
                  TaskFlow
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-md">
                  ADMIN
                </span>
              </div>
            )}
          </Link>

          {/* Sidebar Collapse Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded-lg text-sidebar-muted hover:text-white hover:bg-sidebar-hover transition"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar collapse"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Switch to User Workspace Pill Button */}
        <div className="p-3">
          <Link
            href="/dashboard"
            className={`w-full py-2 px-3 bg-[#1A1C23] hover:bg-[#222530] text-rose-300 hover:text-rose-200 border border-rose-500/20 text-xs font-semibold rounded-xl transition flex items-center justify-between group active:scale-95 ${
              isSidebarCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Switch to User Workspace"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-400 shrink-0 group-hover:scale-105 transition" />
              {!isSidebarCollapsed && <span>User Workspace</span>}
            </span>
            {!isSidebarCollapsed && (
              <ExternalLink className="w-3.5 h-3.5 text-sidebar-muted group-hover:text-rose-300 transition" />
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition group relative ${
                  isActive
                    ? 'bg-[#FAF8F5] text-[#111215] font-semibold shadow-sm'
                    : 'text-sidebar-text hover:text-white hover:bg-sidebar-hover'
                }`}
                title={item.label}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition ${
                    isActive ? 'text-brand-600' : 'text-sidebar-muted group-hover:text-white'
                  }`}
                />
                {!isSidebarCollapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / Admin Section */}
        <div className="p-3 border-t border-[#22242B] space-y-2">
          <div
            className={`flex items-center gap-2.5 p-2 rounded-xl bg-sidebar-card border border-[#22242B] ${
              isSidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-7 h-7 rounded-full object-cover border border-[#333540] shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {user.full_name?.charAt(0) || 'A'}
              </div>
            )}
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {user.full_name}
                </p>
                <p className="text-[10px] text-rose-400 truncate uppercase font-bold tracking-wider">
                  Administrator
                </p>
              </div>
            )}
          </div>

          {/* Quick Sign Out */}
          <button
            onClick={() => signOut()}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-sidebar-hover rounded-xl transition ${
              isSidebarCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* =========================================================================
          2. MOBILE DRAWER NAVIGATION
         ========================================================================= */}
      {isSidebarOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-charcoal-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpenMobile(false)}
          />

          <div className="relative w-72 max-w-[80vw] bg-[#111215] border-r border-[#22242B] flex flex-col h-full z-10">
            {/* Header */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-[#22242B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F97316] to-[#C2410C] flex items-center justify-center shrink-0 shadow-sm">
                  <div className="w-3.5 h-3.5 border-2 border-white rounded-[3px] rotate-45 transform" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-white">
                    TaskFlow Pro
                  </span>
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-md">
                    ADMIN
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpenMobile(false)}
                className="p-1 rounded-lg text-sidebar-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <Link
                href="/dashboard"
                onClick={() => setIsSidebarOpenMobile(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-500/30 mb-3"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-400" />
                  Switch to User Workspace
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsSidebarOpenMobile(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? 'bg-[#FAF8F5] text-[#111215] font-semibold'
                        : 'text-sidebar-text hover:text-white hover:bg-sidebar-hover'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[#22242B] space-y-2">
              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-sidebar-hover rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. MAIN CONTENT CONTAINER
         ========================================================================= */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-16 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#EAE6DF] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Left: Hamburger & Workspace Switcher */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              onClick={() => setIsSidebarOpenMobile(true)}
              className="md:hidden p-2 rounded-xl text-charcoal-600 hover:bg-ivory-200 transition"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Workspace Switcher Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#EAE6DF] shadow-subtle text-xs">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              <span className="font-bold text-charcoal-900">Admin Console</span>
              <span className="text-charcoal-300">&bull;</span>
              <Link
                href="/dashboard"
                className="text-brand-600 hover:text-brand-700 font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>Switch to User View</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Right: Notifications, Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Notifications Dropdown */}
            <div className="relative" ref={notifMenuRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 rounded-full text-charcoal-600 hover:text-charcoal-900 hover:bg-ivory-200 transition"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-600 rounded-full ring-2 ring-[#FAF8F5]" />
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-elevated border border-[#EAE6DF] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#EAE6DF]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-charcoal-900">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-[#EAE6DF]">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-charcoal-400">
                        No notifications right now
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div key={n.id} className="p-3 hover:bg-ivory-50 text-xs transition">
                          <p className="font-semibold text-charcoal-900">{n.title}</p>
                          <p className="text-[11px] text-charcoal-500 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2 border-t border-[#EAE6DF] text-center">
                    <Link
                      href="/admin/notifications"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-xs font-semibold text-brand-600 hover:underline"
                    >
                      View all delivery audits &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full hover:bg-ivory-200 transition border border-[#EAE6DF] bg-white shadow-subtle"
                aria-label="Admin menu"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-6 h-6 rounded-full object-cover border border-[#EAE6DF]"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {user.full_name?.charAt(0) || 'A'}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-semibold text-charcoal-800 max-w-[100px] truncate">
                  {user.full_name?.split(' ')[0] || 'Admin'}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-800 hidden md:inline">
                  Admin
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-charcoal-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-elevated border border-[#EAE6DF] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-[#EAE6DF]">
                    <p className="text-xs font-bold text-charcoal-900 truncate">
                      {user.full_name}
                    </p>
                    <p className="text-[11px] text-charcoal-500 truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
                      System Administrator
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/dashboard"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-charcoal-700 hover:bg-ivory-50 transition"
                    >
                      <Layers className="w-4 h-4 text-charcoal-400" />
                      Switch to User Workspace
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-charcoal-700 hover:bg-ivory-50 transition"
                    >
                      <Settings className="w-4 h-4 text-charcoal-400" />
                      Settings & Preferences
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-[#EAE6DF]">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
