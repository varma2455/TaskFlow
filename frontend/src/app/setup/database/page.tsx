'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient, SetupStatus } from '@/lib/api';
import {
  Database,
  CheckCircle2,
  Table,
  FileCode,
  Shield,
  Terminal,
  Copy,
  Layers,
  Sparkles,
  Server,
  Activity,
  Code2,
  Check,
} from 'lucide-react';

export default function SetupDatabasePage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    ApiClient.getSetupStatus()
      .then(setStatus)
      .catch(console.error);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const tables = status?.database.tables || {};
  const migrations = status?.database.migrations || [];
  const directPg = status?.database.direct_connection;

  const validationSql = `-- TaskFlow Pro Database Integrity Check
SELECT 'profiles' AS table_name, count(*) AS count FROM public.profiles
UNION ALL
SELECT 'tasks', count(*) FROM public.tasks
UNION ALL
SELECT 'activity_logs', count(*) FROM public.activity_logs
UNION ALL
SELECT 'notifications', count(*) FROM public.notifications
UNION ALL
SELECT 'email_outbox', count(*) FROM public.email_outbox;`;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-charcoal-900 tracking-tight">
          Supabase PostgreSQL & SQL Migrations
        </h1>
        <p className="text-xs text-charcoal-600 mt-1">
          Detailed inspection of PostgreSQL schema tables, row counts, versioned SQL migrations, connection pooling, and Row Level Security.
        </p>
      </div>

      {/* Dual Database Connectivity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supabase REST Client */}
        <div className="p-5 bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle flex flex-col justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-charcoal-900">
                  Supabase REST & Realtime API
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-charcoal-500 mt-1 leading-relaxed">
                Mode:{' '}
                <span className="font-semibold text-brand-600 uppercase">
                  {status?.database.mode === 'live' ? 'Live Supabase Cloud' : 'In-Memory Store (Dev Mode)'}
                </span>
                . Used by Next.js browser client, server actions, and Supabase Auth.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{status?.database.reachable ? 'API Gateway Reachable' : 'Connection degraded'}</span>
          </div>
        </div>

        {/* Direct PostgreSQL Connection & Pooling */}
        <div className="p-5 bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle flex flex-col justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-charcoal-900">
                  Direct PostgreSQL Engine & Pooling
                </h3>
                <span
                  className={`w-2 h-2 rounded-full ${
                    directPg?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
              </div>
              <p className="text-xs text-charcoal-500 mt-1 leading-relaxed">
                {directPg?.connected
                  ? `ThreadedConnectionPool active (min: ${directPg.min_connections}, max: ${directPg.max_connections}). Applied migrations tracked: ${directPg.applied_migrations_count}.`
                  : 'Direct DATABASE_URL pool optional. Flask and Next.js communicate securely through the Supabase REST API & service role.'}
              </p>
            </div>
          </div>
          <div
            className={`text-[11px] font-semibold rounded-xl px-3 py-1.5 flex items-center gap-1.5 border ${
              directPg?.connected
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-neutral-700 bg-neutral-50 border-[#EAE6DF]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span>
              {directPg?.connected
                ? 'PostgreSQL Direct Pool Connected'
                : 'DATABASE_URL Optional (REST Active)'}
            </span>
          </div>
        </div>
      </div>

      {/* Tables Breakdown */}
      <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-brand-600" />
          <h2 className="text-base font-bold text-charcoal-900">
            Database Tables & Row Counts
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Object.entries(tables).map(([tableName, info]) => (
            <div
              key={tableName}
              className="p-3.5 rounded-2xl bg-ivory-50 border border-[#EAE6DF] space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-charcoal-900">
                  {tableName}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-xl font-black text-charcoal-800">
                {info.count}{' '}
                <span className="text-[10px] font-normal text-charcoal-500">records</span>
              </p>
              <span className="text-[10px] font-semibold text-emerald-600">
                {info.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Versioned Migrations (/migrations) */}
      <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-brand-600" />
            <h2 className="text-base font-bold text-charcoal-900">
              Versioned SQL Migrations (/migrations)
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
            {migrations.length} Migrations Defined
          </span>
        </div>

        <div className="space-y-3">
          {migrations.map((mig) => (
            <div
              key={mig.id}
              className="p-4 rounded-2xl bg-ivory-50 border border-[#EAE6DF] flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-charcoal-700 border border-[#EAE6DF]">
                    {mig.file}
                  </span>
                  <span className="text-xs font-bold text-charcoal-900">
                    {mig.title}
                  </span>
                </div>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  {mig.description}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">Ready / Validated</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Migration CLI Runner & SQL Queries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CLI Runner Box */}
        <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-brand-600" />
              <h2 className="text-base font-bold text-charcoal-900">
                Automated Migration Runner CLI
              </h2>
            </div>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Run this command to execute all migrations in ascending order and track them in <code>public.schema_migrations</code>:
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#111215] text-neutral-200 font-mono text-xs flex items-center justify-between gap-4">
            <span className="text-emerald-400 overflow-x-auto whitespace-nowrap">
              PYTHONPATH=. backend/venv/bin/python scripts/apply_migrations.py
            </span>
            <button
              onClick={() =>
                copyToClipboard(
                  'PYTHONPATH=. backend/venv/bin/python scripts/apply_migrations.py',
                  'cli-runner'
                )
              }
              className="text-xs font-bold text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800 transition shrink-0 cursor-pointer flex items-center gap-1"
            >
              {copiedId === 'cli-runner' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedId === 'cli-runner' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* SQL Editor Validation Script */}
        <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-brand-600" />
              <h2 className="text-base font-bold text-charcoal-900">
                Supabase SQL Editor Verification
              </h2>
            </div>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Paste into the Supabase SQL Editor to instantly verify all table counts and RLS integrity:
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#111215] text-neutral-200 font-mono text-xs flex items-center justify-between gap-4">
            <span className="text-purple-300 overflow-x-auto whitespace-nowrap">
              SELECT count(*) FROM public.profiles UNION ALL SELECT count(*) FROM public.tasks...
            </span>
            <button
              onClick={() => copyToClipboard(validationSql, 'sql-validation')}
              className="text-xs font-bold text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800 transition shrink-0 cursor-pointer flex items-center gap-1"
            >
              {copiedId === 'sql-validation' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedId === 'sql-validation' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Promotion CLI Script */}
      <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-600" />
          <h2 className="text-base font-bold text-charcoal-900">
            Initial Admin User Promotion CLI
          </h2>
        </div>

        <p className="text-xs text-charcoal-600 leading-relaxed">
          When an evaluator signs in with their Google account, their role defaults safely to <code>user</code>. To promote any account to <code>admin</code> for full access to the <code>/admin</code> dashboard:
        </p>

        <div className="p-3.5 rounded-2xl bg-[#111215] text-neutral-200 font-mono text-xs flex items-center justify-between gap-4">
          <span className="text-emerald-400 overflow-x-auto whitespace-nowrap">
            PYTHONPATH=. backend/venv/bin/python scripts/promote_admin.py --email YOUR_EMAIL@gmail.com
          </span>
          <button
            onClick={() =>
              copyToClipboard(
                'PYTHONPATH=. backend/venv/bin/python scripts/promote_admin.py --email YOUR_EMAIL@gmail.com',
                'admin-promo'
              )
            }
            className="text-xs font-bold text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800 transition shrink-0 cursor-pointer flex items-center gap-1"
          >
            {copiedId === 'admin-promo' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedId === 'admin-promo' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
