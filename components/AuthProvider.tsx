'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ADMIN_EMAIL } from '@/lib/auth';
import { useToast } from './ToastProvider';

export type ModalKind = 'login' | 'register' | 'forgot' | null;

type RegisterResult = { error: string | null; needsConfirmation: boolean };

type AuthCtx = {
  loading: boolean;
  loggedIn: boolean;
  username: string;
  userEmail: string;
  isAdmin: boolean;
  isModerator: boolean;
  canModerate: boolean;
  modal: ModalKind;
  openModal: (m: ModalKind) => void;
  closeModal: () => void;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<RegisterResult>;
  sendPasswordReset: (email: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

type SessionUser = { email: string; name: string };

// Same display-name rule as the original: first word of the full name given
// at signup, falling back to the part of the email before the "@".
function toSessionUser(u: User | null | undefined): SessionUser | null {
  if (!u?.email) return null;
  const full = (u.user_metadata as { full_name?: string } | undefined)?.full_name;
  return { email: u.email, name: full?.split(' ')[0] || u.email.split('@')[0] };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [moderators, setModerators] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);

  // Restore the session on page load, then stay in sync with sign-in /
  // sign-out / token refresh. (Only sets state inside the listener — never
  // awaits other Supabase calls there, which can deadlock the auth client.)
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(toSessionUser(data.session?.user)))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toSessionUser(session?.user));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const email = user?.email.toLowerCase() ?? '';

  // Moderators are listed in the `moderators` table (as in the original).
  // Only fetched for logged-in visitors — anonymous readers never need it.
  useEffect(() => {
    if (!email) {
      setModerators([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.from('moderators').select('email');
        if (!error && data && active) {
          setModerators(data.map((m: { email: string }) => m.email.toLowerCase()));
        }
      } catch {
        /* moderators table unreachable — treat as no moderators */
      }
    })();
    return () => {
      active = false;
    };
  }, [email]);

  const login = useCallback(
    async (emailInput: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: emailInput, password });
        if (error) return error.message;
        const u = toSessionUser(data.user);
        setUser(u);
        setModal(null);
        showToast(`Welcome back, ${u?.name ?? 'friend'}! 🎉`);
        return null;
      } catch {
        return 'Connection error. Try again.';
      }
    },
    [showToast]
  );

  const register = useCallback(
    async (name: string, emailInput: string, password: string): Promise<RegisterResult> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: emailInput,
          password,
          options: { data: { full_name: name } },
        });
        if (error) return { error: error.message, needsConfirmation: false };
        // If the project requires email confirmation, Supabase returns a user
        // but no session — don't pretend they're logged in.
        if (data.session?.user) {
          setUser(toSessionUser(data.session.user));
          setModal(null);
          showToast(`Welcome to NaijaToday, ${name.split(' ')[0]}! 🎉`);
          return { error: null, needsConfirmation: false };
        }
        return { error: null, needsConfirmation: true };
      } catch {
        return { error: 'Connection error. Try again.', needsConfirmation: false };
      }
    },
    [showToast]
  );

  const sendPasswordReset = useCallback(async (emailInput: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailInput, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return error ? error.message : null;
    } catch {
      return 'Connection error. Try again.';
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* clear local state regardless */
    }
    setUser(null);
    showToast('Logged out. See you soon! 👋');
  }, [showToast]);

  const value = useMemo<AuthCtx>(() => {
    const isAdmin = !!email && email === ADMIN_EMAIL.toLowerCase();
    const isModerator = !!email && !isAdmin && moderators.includes(email);
    return {
      loading,
      loggedIn: !!user,
      username: user?.name ?? '',
      userEmail: user?.email ?? '',
      isAdmin,
      isModerator,
      canModerate: isAdmin || isModerator,
      modal,
      openModal: setModal,
      closeModal: () => setModal(null),
      login,
      register,
      sendPasswordReset,
      logout,
    };
  }, [loading, user, email, moderators, modal, login, register, sendPasswordReset, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
