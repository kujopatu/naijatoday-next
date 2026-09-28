'use client';

import { useEffect, useState } from 'react';
import { G } from '@/lib/theme';
import { ModalKind, useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';

export default function AuthModals() {
  const { modal } = useAuth();
  if (!modal) return null;
  // key = mode, so each mode starts with fresh, empty fields
  return <ModalShell key={modal} mode={modal} />;
}

function ModalShell({ mode }: { mode: Exclude<ModalKind, null> }) {
  const { login, register, sendPasswordReset, openModal, closeModal } = useAuth();
  const { card, border, text, muted, darkMode } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeModal]);

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

  const primary: React.CSSProperties = {
    background: G.green,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    width: '100%',
    marginBottom: 10,
    opacity: loading ? 0.7 : 1,
  };

  const secondary: React.CSSProperties = {
    background: 'none',
    color: text,
    border: `1px solid ${border}`,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    marginBottom: 10,
  };

  const handleLogin = async () => {
    if (!email || !password) return setError('Please fill in all fields');
    setLoading(true);
    setError('');
    const err = await login(email.trim(), password);
    if (err) setError(err);
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!name.trim() || !email || !password) return setError('Please fill in all fields');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    setError('');
    const res = await register(name.trim(), email.trim(), password);
    if (res.error) setError(res.error);
    else if (res.needsConfirmation) setInfo('Account created! Check your email to confirm it, then sign in.');
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!email.includes('@')) return setError('Enter a valid email address');
    setLoading(true);
    setError('');
    const err = await sendPasswordReset(email.trim());
    if (err) setError(err);
    else setInfo(`If an account exists for ${email.trim()}, a password reset link is on its way.`);
    setLoading(false);
  };

  const title = mode === 'login' ? 'Welcome Back!' : mode === 'register' ? 'Join NaijaToday' : 'Reset Password';
  const subtitle =
    mode === 'login'
      ? 'Sign in to your NaijaToday account'
      : mode === 'register'
      ? "Nigeria's #1 Digital Media Community"
      : "We'll email you a link to set a new password";

  return (
    <div
      onClick={closeModal}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: card,
          borderRadius: 16,
          padding: 32,
          width: '100%',
          maxWidth: 420,
          border: `1px solid ${border}`,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🇳🇬</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: text, fontFamily: 'Georgia,serif', marginBottom: 4 }}>
            {title}
          </div>
          <div style={{ fontSize: 13, color: muted }}>{subtitle}</div>
        </div>

        {error && (
          <div style={{ background: '#3a1a1a', color: '#ff8080', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {info ? (
          <>
            <div style={{ background: 'rgba(0,135,81,0.12)', color: G.green, padding: '12px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
              {info}
            </div>
            <button onClick={() => openModal('login')} style={primary}>
              Back to Sign In
            </button>
          </>
        ) : mode === 'login' ? (
          <>
            <input
              type="email"
              placeholder="Email address"
              style={inp}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              autoComplete="email"
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              style={{ ...inp, marginBottom: 6 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              autoComplete="current-password"
            />
            <div style={{ textAlign: 'right', marginBottom: 14 }}>
              <button
                onClick={() => openModal('forgot')}
                style={{ background: 'none', border: 'none', color: G.green, fontSize: 12, cursor: 'pointer', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>
            <button onClick={handleLogin} disabled={loading} style={primary}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <button onClick={() => openModal('register')} style={secondary}>
              Create Free Account
            </button>
          </>
        ) : mode === 'register' ? (
          <>
            <input type="text" placeholder="Full name" style={inp} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
            <input type="email" placeholder="Email address" style={inp} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <input
              type="password"
              placeholder="Create password (min 6 characters)"
              style={inp}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              autoComplete="new-password"
            />
            <button onClick={handleRegister} disabled={loading} style={primary}>
              {loading ? 'Creating account…' : 'Create Free Account'}
            </button>
            <button onClick={() => openModal('login')} style={secondary}>
              Already have an account? Sign In
            </button>
          </>
        ) : (
          <>
            <input
              type="email"
              placeholder="Email address"
              style={inp}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleForgot()}
              autoComplete="email"
              autoFocus
            />
            <button onClick={handleForgot} disabled={loading} style={primary}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <button onClick={() => openModal('login')} style={secondary}>
              Back to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}
