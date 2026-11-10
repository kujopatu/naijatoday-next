'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

type Subscriber = { email: string; subscribed_at: string | null };
const PAGE_SIZE = 50;

const csvCell = (value: unknown) => '"' + String(value ?? '').replace(/"/g, '""') + '"';

export default function UserManagementPanel() {
  const { showToast } = useToast();
  const { card, border, text, muted, darkMode } = useTheme();
  const [users, setUsers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState('');

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1px solid ${border}`, background: darkMode ? '#111520' : '#f5f7fa',
    color: text, fontSize: 14, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Georgia,serif',
  };

  const loadUsers = useCallback(async (targetPage = page, query = appliedSearch) => {
    setLoading(true);
    setLoadError('');
    let request = supabase.from('subscribers')
      .select('email,subscribed_at', { count: 'exact' })
      .order('subscribed_at', { ascending: false })
      .range(targetPage * PAGE_SIZE, targetPage * PAGE_SIZE + PAGE_SIZE - 1);

    if (query) request = request.ilike('email', `%${query}%`);

    const { data, count, error } = await request;
    if (error) {
      setLoadError(error.message);
      setUsers([]);
      setTotal(0);
    } else {
      setUsers((data ?? []) as Subscriber[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, appliedSearch]);

  useEffect(() => { void loadUsers(0, ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applySearch = () => {
    const query = searchEmail.trim();
    setAppliedSearch(query);
    setPage(0);
    void loadUsers(0, query);
  };

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
        showToast(`Password reset email requested for ${email}`);
        setResetEmail('');
      }
    } catch {
      showToast('Connection error');
    }
    setSending(false);
  };

  const exportCurrentPage = () => {
    if (!users.length) return;
    const rows = [
      ['Email', 'Subscribed at'],
      ...users.map((user) => [user.email, user.subscribed_at ? new Date(user.subscribed_at).toISOString() : '']),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `naijatoday-subscribers-page-${page + 1}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    void loadUsers(nextPage, appliedSearch);
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 6, fontFamily: 'Georgia,serif' }}>👥 User Management</div>
      <div style={{ fontSize: 12, color: muted, marginBottom: 18 }}>Subscriber directory and account password-reset assistance. This panel lists newsletter subscribers, not every authentication account.</div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 6 }}>🔑 Send Password Reset Email</div>
        <div style={{ fontSize: 13, color: muted, marginBottom: 16 }}>Request a secure Supabase password-reset email. The user sets their own password; administrators never see it.</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input type="email" placeholder="Enter user's email address…" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void handleSendReset()} style={{ ...inp, flex: 1, minWidth: 200 }} />
          <button onClick={() => void handleSendReset()} disabled={sending} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            {sending ? 'Sending…' : '📧 Send Reset Link'}
          </button>
        </div>
        <div style={{ marginTop: 12, background: darkMode ? '#0a1a10' : '#f0fdf4', border: `1px solid ${darkMode ? '#1a3a20' : '#bbf7d0'}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: muted }}>
          The reset link is sent by Supabase. Whether the address belongs to an account is not disclosed here.
        </div>
      </div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: text }}>📋 Newsletter Subscribers</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>{total.toLocaleString('en-NG')} matching subscriber(s)</div>
          </div>
          <button onClick={exportCurrentPage} disabled={loading || users.length === 0} style={{ background: 'transparent', border: `1px solid ${border}`, color: text, borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: users.length ? 'pointer' : 'not-allowed', opacity: users.length ? 1 : 0.5 }}>↓ Export this page</button>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); applySearch(); }} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input type="search" placeholder="Search subscriber email…" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} style={{ ...inp, flex: 1 }} />
          <button type="submit" style={{ background: G.green, color: '#fff', border: 0, borderRadius: 8, padding: '9px 16px', fontWeight: 700, cursor: 'pointer' }}>Search</button>
          <button type="button" onClick={() => { setSearchEmail(''); setAppliedSearch(''); setPage(0); void loadUsers(0, ''); }} style={{ background: 'transparent', border: `1px solid ${border}`, color: muted, borderRadius: 8, padding: '9px 12px', cursor: 'pointer' }}>Clear</button>
        </form>

        {loadError && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 12 }}>Could not load subscribers: {loadError}</div>}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: muted }}>Loading subscribers…</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: muted }}>No subscribers found.</div>
        ) : (
          users.map((user, index) => (
            <div key={user.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: index < users.length - 1 ? `1px solid ${border}` : 'none', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: text }}>{user.email}</div>
                <div style={{ fontSize: 11, color: muted }}>Subscribed {user.subscribed_at ? new Date(user.subscribed_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'date unavailable'}</div>
              </div>
              <button onClick={() => { setResetEmail(user.email); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ background: 'none', border: `1px solid ${border}`, color: muted, borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>🔑 Reset Password</button>
            </div>
          ))
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: muted }}>Page {page + 1} of {pageCount} · {PAGE_SIZE} per page</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => changePage(page - 1)} disabled={page === 0 || loading} style={{ background: 'transparent', border: `1px solid ${border}`, color: text, borderRadius: 7, padding: '7px 12px', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.45 : 1 }}>← Previous</button>
            <button onClick={() => changePage(page + 1)} disabled={page + 1 >= pageCount || loading} style={{ background: 'transparent', border: `1px solid ${border}`, color: text, borderRadius: 7, padding: '7px 12px', cursor: page + 1 >= pageCount ? 'not-allowed' : 'pointer', opacity: page + 1 >= pageCount ? 0.45 : 1 }}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
