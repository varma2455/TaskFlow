'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, NotificationItem } from '@/lib/api';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  LayoutGrid,
  Bell,
  Settings,
  Plus,
  Search,
  ChevronDown,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shield,
  Wrench,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  onCreateTaskClick?: () => void;
  searchPlaceholder?: string;
  onSearchChange?: (val: string) => void;
  searchValue?: string;
  dateRangeFilter?: string;
  onDateRangeChange?: (range: string) => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  onCreateTaskClick,
  searchPlaceholder = 'Search tasks, priorities, teammates...',
  onSearchChange,
  searchValue = '',
  dateRangeFilter,
  onDateRangeChange,
}) => {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Responsive sidebar states
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Dropdown states
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await ApiClient.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch {
      // Quiet fail
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);

      // Listen for notifications or task updates via Realtime
      if (isSupabaseConfigured()) {
        const notifChannel = supabase
          .channel('public:notifications-shell')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notifications' },
            () => fetchNotifications()
          )
          .subscribe();

        return () => {
          clearInterval(interval);
          supabase.removeChannel(notifChannel);
        };
      }

      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsSidebarOpenMobile(false);
  }, [pathname]);

  const handleMarkNotifRead = async (id: string) => {
    try {
      await ApiClient.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      isActive: pathname === '/dashboard',
    },
    {
      label: 'My Tasks',
      href: '/tasks?filter=my_tasks',
      icon: CheckSquare,
      isActive: pathname === '/tasks' && typeof window !== 'undefined' && window.location.search.includes('my_tasks'),
    },
    {
      label: 'Team Tasks',
      href: '/team',
      icon: Users,
      isActive: pathname === '/team',
    },
    {
      label: 'Board',
      href: '/board',
      icon: LayoutGrid,
      isActive: pathname === '/board',
    },
    {
      label: 'Notifications',
      href: '/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
      isActive: pathname === '/notifications',
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      isActive: pathname === '/settings',
    },
    {
      label: 'System Setup',
      href: '/setup',
      icon: Wrench,
      isActive: pathname.startsWith('/setup'),
    },
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
        {/* Branding */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#22242B]">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            {/* Geometric Burnt Orange Symbol */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F97316] to-[#C2410C] flex items-center justify-center shrink-0 shadow-sm shadow-orange-950/40">
              <div className="w-3.5 h-3.5 border-2 border-white rounded-[3px] rotate-45 transform" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-bold text-sm tracking-tight text-white">
                  TaskFlow
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider bg-orange-600/30 text-orange-400 border border-orange-500/30 rounded-md">
                  PRO
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

        {/* Prominent Create Task Action */}
        <div className="p-3">
          {onCreateTaskClick ? (
            <button
              onClick={onCreateTaskClick}
              className={`w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-950/30 transition flex items-center justify-center gap-2 active:scale-95 ${
                isSidebarCollapsed ? 'px-0' : 'px-3'
              }`}
              title="Create Task"
            >
              <Plus className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Create Task</span>}
            </button>
          ) : (
            <Link
              href="/tasks?create=true"
              className={`w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-950/30 transition flex items-center justify-center gap-2 active:scale-95 ${
                isSidebarCollapsed ? 'px-0' : 'px-3'
              }`}
              title="Create Task"
            >
              <Plus className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Create Task</span>}
            </Link>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Precise active logic
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : item.href === '/team'
                ? pathname === '/team'
                : item.href === '/board'
                ? pathname === '/board'
                : item.href === '/notifications'
                ? pathname === '/notifications'
                : item.href === '/settings'
                ? pathname === '/settings'
                : pathname === '/tasks';

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
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / User Section */}
        <div className="p-3 border-t border-[#22242B] space-y-2">
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-900/40 transition group text-xs font-semibold ${
                isSidebarCollapsed ? 'justify-center px-0' : ''
              }`}
              title="Admin Console"
            >
              <Shield className="w-4 h-4 text-rose-400 shrink-0 group-hover:scale-110 transition" />
              {!isSidebarCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Admin Console</span>
                  <span className="text-[9px] bg-rose-500/30 text-rose-300 px-1.5 py-0.2 rounded font-mono uppercase">
                    Admin
                  </span>
                </div>
              )}
            </Link>
          )}

          {user ? (
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
                  {user.full_name?.charAt(0) || 'U'}
                </div>
              )}
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {user.full_name}
                  </p>
                  <p className="text-[10px] text-sidebar-muted truncate capitalize">
                    {user.role}
                  </p>
                </div>
              )}
            </div>
          ) : null}
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
                <span className="font-bold text-sm tracking-tight text-white">
                  TaskFlow Pro
                </span>
              </div>
              <button
                onClick={() => setIsSidebarOpenMobile(false)}
                className="p-1 rounded-lg text-sidebar-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Create Task */}
            <div className="p-3">
              <button
                onClick={() => {
                  setIsSidebarOpenMobile(false);
                  if (onCreateTaskClick) onCreateTaskClick();
                }}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Task</span>
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
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
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[#22242B] space-y-2">
              {user?.role === 'admin' && (
                <Link
                  href="/admin"
                  onClick={() => setIsSidebarOpenMobile(false)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl transition"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-rose-400" />
                    Admin Console
                  </span>
                  <span className="text-[9px] bg-rose-500/30 text-rose-300 px-1.5 py-0.2 rounded font-mono uppercase">
                    Admin
                  </span>
                </Link>
              )}
              <button
                onClick={signOut}
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
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-20 h-16 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#EAE6DF] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Left: Mobile hamburger & Search */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              onClick={() => setIsSidebarOpenMobile(true)}
              className="md:hidden p-2 rounded-xl text-charcoal-600 hover:bg-ivory-200 transition"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Rounded Global Search Input */}
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white text-xs text-charcoal-800 placeholder:text-charcoal-400 border border-[#EAE6DF] rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition shadow-subtle"
              />
            </div>
          </div>

          {/* Right: Date selector, Notifications, Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition shadow-subtle"
                title="Go to Administrator Console"
              >
                <Shield className="w-3.5 h-3.5 text-rose-600" />
                <span>Admin Console</span>
              </Link>
            )}

            {/* Optional Date-Range Filter */}
            {onDateRangeChange && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#EAE6DF] text-xs font-medium text-charcoal-700 shadow-subtle">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                <select
                  value={dateRangeFilter || 'all'}
                  onChange={(e) => onDateRangeChange(e.target.value)}
                  className="bg-transparent border-none text-xs focus:outline-none font-semibold cursor-pointer text-charcoal-800"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="overdue">Overdue Work</option>
                </select>
              </div>
            )}

            {/* Notification Control Dropdown */}
            <div className="relative" ref={notifMenuRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative p-2 rounded-full text-charcoal-600 hover:text-charcoal-900 hover:bg-ivory-200 transition"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-600 rounded-full ring-2 ring-[#FAF8F5]" />
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-elevated border border-[#EAE6DF] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#EAE6DF]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-charcoal-900">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          await ApiClient.markAllNotificationsRead();
                          setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                          setUnreadCount(0);
                        }}
                        className="text-[11px] font-semibold text-brand-600 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-[#EAE6DF]">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-charcoal-400">
                        No notifications right now
                      </div>
                    ) : (
                      notifications.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          className={`p-3.5 hover:bg-ivory-50 transition flex items-start gap-3 ${
                            !item.is_read ? 'bg-brand-50/30' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-charcoal-900 truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-charcoal-600 mt-0.5 line-clamp-2">
                              {item.message}
                            </p>
                            <span className="text-[9px] text-charcoal-400 mt-1 block">
                              {new Date(item.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {!item.is_read && (
                            <button
                              onClick={() => handleMarkNotifRead(item.id)}
                              className="text-[10px] font-semibold text-brand-600 hover:underline shrink-0"
                            >
                              Done
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2 border-t border-[#EAE6DF] text-center">
                    <Link
                      href="/notifications"
                      onClick={() => setIsNotificationOpen(false)}
                      className="text-xs font-semibold text-brand-600 hover:underline inline-flex items-center gap-1"
                    >
                      View all in Notifications Center &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full hover:bg-ivory-200 transition border border-[#EAE6DF] bg-white shadow-subtle"
                aria-label="User menu"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-6 h-6 rounded-full object-cover border border-[#EAE6DF]"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-semibold text-charcoal-800 max-w-[100px] truncate">
                  {user?.full_name?.split(' ')[0] || 'User'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-charcoal-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-elevated border border-[#EAE6DF] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-[#EAE6DF]">
                    <p className="text-xs font-bold text-charcoal-900 truncate">
                      {user?.full_name}
                    </p>
                    <p className="text-[11px] text-charcoal-500 truncate">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-ivory-200 text-charcoal-700">
                      {user?.role}
                    </span>
                  </div>

                  <div className="py-1">
                    {user?.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50/60 hover:bg-rose-100/70 transition"
                      >
                        <Shield className="w-4 h-4 text-rose-600" />
                        Admin Console &rarr;
                      </Link>
                    )}
                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-charcoal-700 hover:bg-ivory-50 transition"
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
