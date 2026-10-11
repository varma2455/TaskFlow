'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, getSupabaseConfigStatus } from '@/lib/supabase';
import { ApiClient, UserProfile } from '@/lib/api';
import { clearQueryCache } from '@/context/QueryProvider';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  isConfigured: boolean;
  configError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  isConfigured: false,
  configError: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const envStatus = getSupabaseConfigStatus();
  const isConfigured = envStatus.isConfigured;
  const configError = envStatus.errorMessage;

  const fetchBackendProfile = async (currentToken: string) => {
    try {
      localStorage.setItem('taskflow_auth_token', currentToken);
      const res = await ApiClient.getProfile();
      setUser(res.profile);
    } catch (err) {
      console.error('Failed to load profile from backend:', err);
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('taskflow_auth_token');

        if (isConfigured) {
          const { data, error } = await supabase.auth.getSession();
          if (!error && data.session?.access_token) {
            const activeToken = data.session.access_token;
            setToken(activeToken);
            localStorage.setItem('taskflow_auth_token', activeToken);
            await fetchBackendProfile(activeToken);
            setLoading(false);
            return;
          }
        }

        if (savedToken) {
          setToken(savedToken);
          await fetchBackendProfile(savedToken);
        }
      } catch (err) {
        console.error('Error initializing authentication:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for Supabase auth events
    if (isConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.access_token) {
            setToken(session.access_token);
            localStorage.setItem('taskflow_auth_token', session.access_token);
            await ApiClient.syncUser({
              full_name:
                session.user.user_metadata?.full_name ||
                session.user.email?.split('@')[0],
              avatar_url: session.user.user_metadata?.avatar_url,
            }).catch(() => {});
            await fetchBackendProfile(session.access_token);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setToken(null);
            localStorage.removeItem('taskflow_auth_token');
            clearQueryCache();
          }
        }
      );

      return () => {
        authListener?.subscription.unsubscribe();
      };
    }
  }, [isConfigured]);

  const signInWithGoogle = async () => {
    setLoading(true);
    if (!isConfigured) {
      setLoading(false);
      throw new Error(
        'Supabase authentication is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local or visit the Setup Wizard (/setup/authentication).'
      );
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    if (isConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('taskflow_auth_token');
    clearQueryCache();
    setLoading(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchBackendProfile(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isConfigured,
        configError,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
