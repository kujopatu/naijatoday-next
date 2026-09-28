'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '@/components/ThemeProvider';

// Supabase's password-reset link lands the visitor here with a temporary
// session already active (it parses the token from the URL automatically,
// since detectSessionInUrl is on for the browser client). All this page
// needs to do is let them set a new password for that session.
export default function ResetPasswordPage() {
  const { card, border, text, muted, darkMode } = useTheme();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: darkMode ? '#111520' : '#f7fbf9',
    color: text,
    fontSize: 14,
    marginBottom: 12,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Georgia,serif',
  };

  const handleSubmit = async () => {
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) return setError(err.message);
    setDone(true);
    setTimeout(() => router.push('/'), 2500);
  };

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: '0 16px' }}>
      <div style={{ background: card, borderRadius: 16, padding: 32, border: `1px solid ${border}` }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🔑</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: text, fontFamily: 'Georgia,serif' }}>Set a New Password</div>
        </div>

        {done ? (
          <div style={{ background: 'rgba(0,135,81,0.12)', color: G.green, padding: '14px', borderRadius: 8, fontSize: 14, textAlign: 'center' }}>
            Password updated! Taking you home…
          </div>
        ) : (
          <>
            {error && (
              <div style={{ background: '#3a1a1a', color: '#ff8080', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}
            <input
              type="password"
              placeholder="New password"
              style={inp}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
            <input
              type="password"
              placeholder="Confirm new password"
              style={inp}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoComplete="new-password"
            />
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                background: G.green,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: 12,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                width: '100%',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>
            <div style={{ fontSize: 12, color: muted, marginTop: 12, textAlign: 'center' }}>
              This link is only valid for a short time after you request it.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
