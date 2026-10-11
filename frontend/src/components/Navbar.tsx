'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, NotificationItem } from '@/lib/api';
import {
  CheckSquare,
  Bell,
  LogOut,
  User,
  Menu,
  X,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const data = await ApiClient.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (e) {
      // Quiet fail if not yet authenticated
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000); // Poll every 30s as backup to Realtime
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkRead = async (notifId: string) => {
    try {
      await ApiClient.markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/tasks', label: 'Tasks' },
    { href: '/team', label: 'Team' },
    { href: '/settings', label: 'Settings' },
  ];

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-40 bg-navy-900 border-b border-navy-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-brand-200 bg-clip-text text-transparent">
                TaskFlow
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-navy-800 text-brand-300 shadow-inner'
                        : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right actions: Notifications & User */}
          <div className="flex items-center gap-3">
            {/* Notifications Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800 transition"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 text-slate-900 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      Notifications
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-brand-50 text-brand-700">
                          {unreadCount} new
                        </span>
                      )}
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          await ApiClient.markAllNotificationsRead();
                          setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                          setUnreadCount(0);
                        }}
                        className="text-xs text-brand-600 hover:text-brand-800 font-semibold"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-sm">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 hover:bg-slate-50 transition flex items-start justify-between gap-3 ${
                            !n.is_read ? 'bg-brand-50/40' : ''
                          }`}
                        >
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-900">{n.title}</p>
                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 inline-block">
                              {new Date(n.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {!n.is_read && (
                            <button
                              onClick={() => handleMarkRead(n.id)}
                              className="text-[10px] text-brand-600 hover:underline shrink-0 font-medium"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 px-4 border-t border-slate-100 text-center">
                    <Link
                      href="/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
                    >
                      View all in Notification Center &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-navy-800">
              <div className="flex items-center gap-2">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-8 h-8 rounded-full border border-brand-500/30 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-700 text-white font-bold flex items-center justify-center text-xs">
                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-slate-200 leading-tight">
                    {user.full_name}
                  </p>
                  <p className="text-[10px] text-brand-300 font-medium capitalize">
                    {user.role}
                  </p>
                </div>
              </div>

              <button
                onClick={signOut}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-navy-800 transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy-950 border-b border-navy-800 px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
};
