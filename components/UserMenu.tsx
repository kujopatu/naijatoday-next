'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { G } from '@/lib/theme';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';

export default function UserMenu() {
  const { loading, loggedIn, username, userEmail, isAdmin, isModerator, logout, openModal } = useAuth();
  const { card, border, text, muted } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // While the session is being restored, hold the space so the header
  // doesn't flash "Login / Join" at someone who is actually logged in.
  if (loading) return <div style={{ width: 150, height: 34 }} aria-hidden="true" />;

  if (!loggedIn) {
    return (
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => openModal('login')}
          style={{
            background: 'none',
            border: `1px solid ${G.green}`,
            color: G.green,
            borderRadius: 20,
            padding: '7px 16px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Login
        </button>
        <button
          onClick={() => openModal('register')}
          style={{
            background: `linear-gradient(135deg,${G.green},${G.greenDark})`,
            border: 'none',
            color: '#fff',
            borderRadius: 20,
            padding: '7px 16px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: `0 2px 8px ${G.green}44`,
          }}
        >
          Join Free
        </button>
      </div>
    );
  }

  const ring = isAdmin ? G.gold : isModerator ? '#6366f1' : G.green;
  const roleLabel = isAdmin ? '⚡ Site Administrator' : isModerator ? '🛡️ Moderator' : 'NaijaToday Member';

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${ring}, ${G.greenDark})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isAdmin ? '#000' : '#fff',
          fontWeight: 700,
          fontSize: 15,
          cursor: 'pointer',
          border: `2px solid ${ring}`,
          boxShadow: `0 0 0 3px ${ring}33`,
          padding: 0,
        }}
      >
        {isAdmin ? '⚡' : isModerator ? '🛡️' : username[0]?.toUpperCase()}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 46,
            width: 230,
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
            zIndex: 500,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: text }}>{username}</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</div>
            <div style={{ fontSize: 11, color: ring, marginTop: 4, fontWeight: 600 }}>{roleLabel}</div>
          </div>
          <Link
            href="/saved"
            onClick={() => setOpen(false)}
            style={{ display: 'block', padding: '11px 16px', fontSize: 13, color: text, textDecoration: 'none' }}
          >
            🔖 Saved Articles
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '11px 16px',
              fontSize: 13,
              color: G.red,
              background: 'none',
              border: 'none',
              borderTop: `1px solid ${border}`,
              cursor: 'pointer',
            }}
          >
            🚪 Log out
          </button>
        </div>
      )}
    </div>
  );
}
