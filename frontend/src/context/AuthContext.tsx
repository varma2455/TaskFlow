'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ApiClient, UserProfile } from '@/lib/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithDemo: (role?: 'admin' | 'member') => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithDemo: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBackendProfile = async (currentToken: string) => {
    try {
      localStorage.setItem('taskflow_auth_token', currentToken);
      const res = await ApiClient.getProfile();
      setUser(res.profile);
    } catch (err) {
      console.error('Failed to load profile from backend:', err);
      // Fallback user state
      setUser({
        id: '11111111-1111-1111-1111-111111111111',
        email: 'user@taskflow.dev',
        full_name: 'TaskFlow User',
        role: 'member',
      });
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('taskflow_auth_token');

        if (isSupabaseConfigured()) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.access_token) {
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
    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.access_token) {
            setToken(session.access_token);
            localStorage.setItem('taskflow_auth_token', session.access_token);
            await ApiClient.syncUser({
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
              avatar_url: session.user.user_metadata?.avatar_url,
            }).catch(() => {});
            await fetchBackendProfile(session.access_token);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setToken(null);
            localStorage.removeItem('taskflow_auth_token');
          }
        }
      );

      return () => {
        authListener?.subscription.unsubscribe();
      };
    }
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      // In local demo without live Supabase keys, use Demo Login automatically
      await signInWithDemo('admin');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      setLoading(false);
      throw error;
    }
  };

  const signInWithDemo = async (role: 'admin' | 'member' = 'admin') => {
    setLoading(true);
    const demoToken = role === 'admin'
      ? 'test-token-11111111-1111-1111-1111-111111111111-admin'
      : 'test-token-22222222-2222-2222-2222-222222222222-member';

    setToken(demoToken);
    localStorage.setItem('taskflow_auth_token', demoToken);
    await fetchBackendProfile(demoToken);
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('taskflow_auth_token');
    setLoading(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/';
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
        signInWithGoogle,
        signInWithDemo,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
