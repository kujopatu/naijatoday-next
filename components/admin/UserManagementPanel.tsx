'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

type Subscriber = { email: string; subscribed_at: string | null };

export default function UserManagementPanel() {
  const { showToast } = useToast();
  const { card, border, text, muted, darkMode } = useTheme();
  const [users, setUsers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [sending, setSending] = useState(false);

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: darkMode ? '#111520' : '#f5f7fa',
    color: text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Georgia,serif',
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: subs } = await supabase.from('subscribers').select('email, subscribed_at').order('subscribed_at', { ascending: false }).limit(100);
      if (subs) setUsers(subs as Subscriber[]);
    } catch {
      showToast('Error loading users');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendReset = async () => {
    const email = resetEmail.trim();
    if (!email || !email.includes('@')) {
      showToast('Enter a valid email address');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
      });
      if (error) showToast('Error: ' + error.message);
      else {
        showToast(`✅ Password reset email sent to ${email}`);
        setResetEmail('');
      }
    } catch {
      showToast('Connection error');
    }
    setSending(false);
  };

  const filtered = users.filter((u) => !searchEmail || u.email.toLowerCase().includes(searchEmail.toLowerCase()));

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 20, fontFamily: 'Georgia,serif' }}>👥 User Management</div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 6 }}>🔑 Send Password Reset Email</div>
        <div style={{ fontSize: 13, color: muted, marginBottom: 16 }}>
          Sends an official Supabase password reset link to any registered user&apos;s email. The link expires in 1 hour.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder="Enter user's email address…"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendReset()}
            style={{ ...inp, flex: 1, minWidth: 200 }}
          />
          <button
            onClick={handleSendReset}
            disabled={sending}
            style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, whiteSpace: 'nowrap' }}
          >
            {sending ? 'Sending…' : '📧 Send Reset Link'}
          </button>
        </div>
        <div style={{ marginTop: 12, background: darkMode ? '#0a1a10' : '#f0fdf4', border: `1px solid ${darkMode ? '#1a3a20' : '#bbf7d0'}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: muted }}>
          💡 The user will receive an email with a secure link to set a new password. You never see or set the password directly — this keeps accounts secure.
        </div>
      </div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: text }}>📋 Subscribers ({users.length})</div>
          <div style={{ display: 'flex', gap: 10, flex: 1, maxWidth: 320 }}>
            <input type="text" placeholder="Search by email…" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} style={{ ...inp, flex: 1 }} />
            <button onClick={loadUsers} style={{ background: 'none', border: `1px solid ${border}`, color: muted, borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
              🔄
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: muted }}>⏳ Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: muted }}>No subscribers found</div>
        ) : (
          filtered.map((u, i) => (
            <div key={u.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: text }}>{u.email}</div>
                <div style={{ fontSize: 11, color: muted }}>
                  Subscribed {u.subscribed_at ? new Date(u.subscribed_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                </div>
              </div>
              <button
                onClick={() => {
                  setResetEmail(u.email);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  showToast(`Email pre-filled: ${u.email}`);
                }}
                style={{ background: 'none', border: `1px solid ${border}`, color: muted, borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                🔑 Reset Password
              </button>
            </div>
          ))
        )}

        {users.length === 100 && <div style={{ fontSize: 11, color: muted, textAlign: 'center', marginTop: 12 }}>Showing first 100 subscribers · Use the search to find specific users</div>}
      </div>
    </div>
  );
}
