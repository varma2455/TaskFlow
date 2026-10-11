'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiClient } from '@/lib/api';
import { Settings as SettingsIcon, Bell, Shield, Server, CheckCircle2, AlertCircle } from 'lucide-react';

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
    } catch (e: any) {
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
      setPrefMessage('Preference updated successfully');
      await refreshProfile();
      setTimeout(() => setPrefMessage(null), 3000);
    } catch (err: any) {
      setPrefMessage('Failed to update preference');
    } finally {
      setSavingPref(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-brand-600" />
          Settings & Preferences
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account profile, notification controls, and service connectivity.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-600" />
          User Profile
        </h2>

        <div className="flex items-center gap-4 pt-2">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="w-16 h-16 rounded-full object-cover border-2 border-brand-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 font-bold text-xl flex items-center justify-center">
              {user.full_name?.charAt(0) || 'U'}
            </div>
          )}

          <div>
            <h3 className="text-lg font-bold text-slate-900">{user.full_name}</h3>
            <p className="text-xs text-slate-500">{user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 uppercase">
                Role: {user.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-brand-600" />
          Notification Controls
        </h2>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Deadline Reminder Emails
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Receive automated reminders when tasks assigned to you are approaching due dates.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={reminderPref}
              onChange={(e) => handleToggleReminder(e.target.checked)}
              disabled={savingPref}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {prefMessage && (
          <p className="text-xs text-brand-600 font-medium">{prefMessage}</p>
        )}
      </div>

      {/* Backend & Database Health Check */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-brand-600" />
            Backend System Diagnostics
          </h2>
          <button
            onClick={checkBackendHealth}
            disabled={checkingHealth}
            className="text-xs text-brand-600 hover:underline font-semibold"
          >
            {checkingHealth ? 'Checking...' : 'Re-check Diagnostics'}
          </button>
        </div>

        {healthStatus && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Flask API Gateway</span>
                <p className="text-sm font-bold text-slate-900 capitalize">{healthStatus.status}</p>
              </div>
              {healthStatus.status === 'healthy' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-500" />
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Supabase Database Connection</span>
                <p className="text-sm font-bold text-slate-900 capitalize">{healthStatus.database}</p>
              </div>
              {healthStatus.database === 'ok' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
