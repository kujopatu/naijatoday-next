'use client';

import { useAuth } from '@/components/AuthProvider';
import { useTheme } from '@/components/ThemeProvider';
import { G } from '@/lib/theme';
import AdminPanel from '@/components/AdminPanel';

// Client-side gate only decides what to *show*. The real protection is
// Supabase RLS on every table AdminPanel touches (posts, moderators,
// forum_reports, etc.) — it checks the logged-in user's JWT server-side,
// so a visitor can't get admin powers by messing with the browser, even
// if they somehow got past this screen.
export default function AdminPage() {
  const { loading, loggedIn, canModerate, openModal } = useAuth();
  const { card, border, text, muted } = useTheme();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80, color: muted }}>Loading…</div>;
  }

  if (!loggedIn || !canModerate) {
    return (
      <div style={{ maxWidth: 420, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: text, marginBottom: 8 }}>Admin Access Only</div>
          <div style={{ fontSize: 14, color: muted, marginBottom: 20 }}>
            {loggedIn
              ? "Your account doesn't have admin or moderator access."
              : 'Sign in with an admin or moderator account to continue.'}
          </div>
          {!loggedIn && (
            <button
              onClick={() => openModal('login')}
              style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    );
  }

  return <AdminPanel />;
}
