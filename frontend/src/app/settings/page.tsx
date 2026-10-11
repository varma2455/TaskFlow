'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiClient } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Server,
  CheckCircle2,
  AlertCircle,
  Database,
  Mail,
  Loader2,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, loading, refreshProfile } = useAuth();
  const router = useRouter();

  const [reminderPref, setReminderPref] = useState(true);
  const [savingPref, setSavingPref] = useState(false);
  const [prefMessage, setPrefMessage] = useState<string | null>(null);

  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    service: string;
    database: string;
  } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setReminderPref(user.reminder_preference ?? true);
      checkBackendHealth();
    }
  }, [user]);

  const checkBackendHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await ApiClient.checkHealth();
      setHealthStatus(res);
    } catch {
      setHealthStatus({
        status: 'unreachable',
        service: 'taskflow-api',
        database: 'offline',
      });
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleToggleReminder = async (checked: boolean) => {
    setReminderPref(checked);
    setSavingPref(true);
    setPrefMessage(null);
    try {
      await ApiClient.updatePreferences(checked);
      setPrefMessage('Notification preference saved successfully');
      await refreshProfile();
      setTimeout(() => setPrefMessage(null), 3000);
    } catch {
      setPrefMessage('Failed to update preference');
    } finally {
      setSavingPref(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="pb-2 border-b border-[#EAE6DF]">
          <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
            Settings & Preferences
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Manage your account credentials, Gmail automated notification delivery, and backend health.
          </p>
        </div>

        {/* User Profile Card */}
        <div className="p-6 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EAE6DF]">
            <Shield className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-charcoal-900">User Identity & Authentication</h2>
          </div>

          <div className="flex items-center gap-4 pt-1">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-14 h-14 rounded-full object-cover border-2 border-[#EAE6DF]"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-brand-600 text-white font-bold text-lg flex items-center justify-center">
                {user.full_name?.charAt(0) || 'U'}
              </div>
            )}

            <div className="space-y-1">
              <h3 className="text-base font-bold text-charcoal-900">{user.full_name}</h3>
              <p className="text-xs text-charcoal-500">{user.email}</p>
              <div className="flex items-center gap-2 pt-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-ivory-200 text-charcoal-700">
                  Role: {user.role}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Active Member
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Email & Notification Delivery Preferences */}
        <div className="p-6 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EAE6DF]">
            <Mail className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-charcoal-900">Automated Gmail Notifications</h2>
          </div>

          <div className="flex items-center justify-between p-4 bg-ivory-50 rounded-xl border border-[#EAE6DF]">
            <div className="space-y-0.5 max-w-lg">
              <h3 className="text-xs font-bold text-charcoal-900">
                Deadline Reminder Emails (48-Hour Alert)
              </h3>
              <p className="text-[11px] text-charcoal-500 leading-relaxed">
                When enabled, the backend background scheduler dispatches automated notifications
                via the Gmail API before scheduled task due dates.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={reminderPref}
                onChange={(e) => handleToggleReminder(e.target.checked)}
                disabled={savingPref}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          {prefMessage && (
            <p className="text-xs text-brand-600 font-semibold">{prefMessage}</p>
          )}
        </div>

        {/* System & Architecture Diagnostics */}
        <div className="p-6 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-bold text-charcoal-900">
                Backend System & Database Diagnostics
              </h2>
            </div>
            <button
              onClick={checkBackendHealth}
              disabled={checkingHealth}
              className="text-xs font-semibold text-brand-600 hover:underline inline-flex items-center gap-1"
            >
              {checkingHealth && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Re-check Diagnostics
            </button>
          </div>

          {healthStatus && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 bg-ivory-50 rounded-xl border border-[#EAE6DF] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-charcoal-400 font-semibold uppercase">
                    Flask API Gateway
                  </span>
                  <p className="text-sm font-bold text-charcoal-900 capitalize mt-0.5">
                    {healthStatus.status}
                  </p>
                </div>
                {healthStatus.status === 'healthy' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                )}
              </div>

              <div className="p-4 bg-ivory-50 rounded-xl border border-[#EAE6DF] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-charcoal-400 font-semibold uppercase">
                    Supabase PostgreSQL
                  </span>
                  <p className="text-sm font-bold text-charcoal-900 capitalize mt-0.5">
                    {healthStatus.database}
                  </p>
                </div>
                {healthStatus.database === 'ok' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
