'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, UserProfile } from '@/lib/api';
import { Users, Mail, Shield, CheckCircle } from 'lucide-react';

export default function TeamPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await ApiClient.getUsers();
        setMembers(res.users || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (user) {
      fetchTeam();
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-brand-600" />
          Team Members
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Registered team members available for task assignment and notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <div
            key={member.id}
            className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.full_name}
                  className="w-12 h-12 rounded-full object-cover border border-brand-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 font-bold text-base flex items-center justify-center">
                  {member.full_name?.charAt(0) || 'U'}
                </div>
              )}

              <div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">
                  {member.full_name}
                </h3>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 mt-1">
                  {member.role}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{member.email}</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-medium">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Active Teammate</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
