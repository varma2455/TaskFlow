'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient, SetupStatus } from '@/lib/api';
import {
  Mail,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Loader2,
  Inbox,
  FileCheck,
} from 'lucide-react';

export default function SetupEmailPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [testEmail, setTestEmail] = useState('evaluator@taskflow.dev');
  const [dryRun, setDryRun] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  const fetchStatus = () => {
    ApiClient.getSetupStatus()
      .then(setStatus)
      .catch(console.error);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;

    setIsSending(true);
    setTestResult(null);
    try {
      const res = await ApiClient.sendTestEmail(testEmail, dryRun);
      setTestResult(res);
      fetchStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Failed to dispatch test notification',
      });
    } finally {
      setIsSending(false);
    }
  };

  const emailInfo = status?.email;
  const outbox = emailInfo?.outbox_stats || { total: 0, pending: 0, sent: 0, failed: 0 };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-charcoal-900 tracking-tight">
          Gmail API & Durable Outbox Architecture
        </h1>
        <p className="text-xs text-charcoal-600 mt-1">
          Transactional email delivery pipeline with idempotent database recording, retry workers, and 24h deadline alerts.
        </p>
      </div>

      {/* Gmail API Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-1">
          <span className="text-[10px] font-bold uppercase text-charcoal-500">Sender Mode</span>
          <p className="text-sm font-bold text-charcoal-900">
            {emailInfo?.configured ? 'Live Gmail API' : 'Simulated Outbox'}
          </p>
          <span className="text-[11px] text-charcoal-500">
            {emailInfo?.sender_email || 'Development Mode'}
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-1">
          <span className="text-[10px] font-bold uppercase text-charcoal-500">Delivered Emails</span>
          <p className="text-sm font-bold text-emerald-600">
            {outbox.sent} Sent
          </p>
          <span className="text-[11px] text-charcoal-500">Confirmed delivery</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-1">
          <span className="text-[10px] font-bold uppercase text-charcoal-500">Pending Queue</span>
          <p className="text-sm font-bold text-charcoal-900">
            {outbox.pending} Pending
          </p>
          <span className="text-[11px] text-charcoal-500">Awaiting retry / worker</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-1">
          <span className="text-[10px] font-bold uppercase text-charcoal-500">Reminder Horizon</span>
          <p className="text-sm font-bold text-brand-600">
            {emailInfo?.reminder_window_hours || 24} Hours
          </p>
          <span className="text-[11px] text-charcoal-500">Automated deadline window</span>
        </div>
      </div>

      {/* Interactive Test Email Dispatcher */}
      <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-brand-600" />
          <h2 className="text-base font-bold text-charcoal-900">
            Dispatch Test Notification
          </h2>
        </div>

        <p className="text-xs text-charcoal-600 leading-relaxed">
          Verify end-to-end integration by triggering a transactional test notification. In simulated dry-run mode, an idempotent record is committed to the <code>email_outbox</code> table to demonstrate delivery tracking without requiring production Google workspace quotas.
        </p>

        <form onSubmit={handleSendTestEmail} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-bold text-charcoal-800 mb-1">
              Recipient Email Address
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              required
              placeholder="evaluator@taskflow.dev"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D5CC] bg-white text-xs text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dryRunCheckbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-charcoal-300"
            />
            <label htmlFor="dryRunCheckbox" className="text-xs text-charcoal-700 cursor-pointer">
              Simulated dry-run (records in durable outbox without sending external SMTP)
            </label>
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-xs shadow-subtle transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Dispatching Notification...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Test Notification</span>
              </>
            )}
          </button>
        </form>

        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-1.5 animate-in fade-in duration-200 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>
                {testResult.success
                  ? 'Notification Successfully Processed!'
                  : 'Dispatch Failed'}
              </span>
            </div>
            <p className="text-[11px]">
              {testResult.message || testResult.error}
            </p>
            {testResult.idempotency_key && (
              <p className="font-mono text-[10px] text-emerald-800">
                Idempotency Key: {testResult.idempotency_key}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Architecture Highlights */}
      <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-brand-600" />
          <h2 className="text-base font-bold text-charcoal-900">
            Durable Outbox Pattern Principles
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-charcoal-600">
          <div className="p-4 rounded-2xl bg-ivory-50 border border-[#EAE6DF] space-y-1.5">
            <h4 className="font-bold text-charcoal-900">1. Idempotent Deduplication</h4>
            <p className="leading-relaxed">
              Every notification receives a deterministic hash or UUID key so rapid task edits never trigger duplicate emails to team members.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-ivory-50 border border-[#EAE6DF] space-y-1.5">
            <h4 className="font-bold text-charcoal-900">2. Asynchronous Retry Queue</h4>
            <p className="leading-relaxed">
              If Google APIs experience rate limiting, failed messages are held in <code>email_outbox</code> and retried with exponential backoff.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-ivory-50 border border-[#EAE6DF] space-y-1.5">
            <h4 className="font-bold text-charcoal-900">3. Admin Audit Visibility</h4>
            <p className="leading-relaxed">
              Administrators can view all outgoing email attempts, recipients, and delivery status at <code>/admin/notifications</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
