'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

type TeamUser = { id: string; email: string; role: string };
const ROLES = [
  { value: 'user', label: 'Registered User' },
  { value: 'writer', label: 'Writer' },
  { value: 'editor', label: 'Editor' },
  { value: 'moderator', label: 'Moderator' },
];

export default function EditorialTeamPanel() {
  const { showToast } = useToast();
  const { card, border, text, muted, darkMode } = useTheme();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const request = useCallback(async (method: 'GET' | 'POST', payload?: { email: string; role: string }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Your session has expired. Please sign in again.');
    const response = await fetch('/api/admin/team', {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      body: payload ? JSON.stringify(payload) : undefined,
      cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Team request failed.');
    return result;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await request('GET');
      setUsers(result.users || []);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to load team accounts.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { void load(); }, [load]);

  const changeRole = async (user: TeamUser, role: string) => {
    if (user.role === 'admin') return;
    setBusy(user.id);
    try {
      await request('POST', { email: user.email, role });
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, role } : item));
      showToast(`Updated ${user.email} to ${role}.`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Unable to update role.');
      await load();
    } finally {
      setBusy(null);
    }
  };

  const filtered = users.filter((user) => user.email.toLowerCase().includes(search.toLowerCase()));
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${border}`,
    background: darkMode ? '#111520' : '#fff', color: text, fontSize: 13, boxSizing: 'border-box',
  };

  return (
    <section style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: text }}>Editorial Team & Permissions</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>Assign Writer, Editor or Moderator access to existing registered accounts.</div>
        </div>
        <button onClick={() => void load()} disabled={loading} style={{ border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px', color: text, background: 'transparent', cursor: 'pointer' }}>↻ Refresh</button>
      </div>
      <div style={{ fontSize: 12, color: muted, margin: '10px 0 16px' }}>
        Super Admin access is protected and cannot be assigned or changed from this screen. Writers can only manage their own unpublished drafts; Editors can manage and publish articles.
      </div>
      <input aria-label="Search accounts by email" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search registered account email…" style={{ ...inputStyle, marginBottom: 14 }} />
      {error && <div role="alert" style={{ color: '#dc2626', fontSize: 13, padding: 12, background: darkMode ? '#301717' : '#fff1f2', borderRadius: 8, marginBottom: 12 }}>{error}</div>}
      {loading ? <div style={{ color: muted, padding: 24, textAlign: 'center' }}>Loading accounts…</div>
        : filtered.length === 0 ? <div style={{ color: muted, padding: 24, textAlign: 'center' }}>No matching registered accounts.</div>
        : filtered.map((user) => (
          <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: `1px solid ${border}`, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 200, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{user.email}</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 3 }}>{user.role === 'admin' ? 'Super Admin' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}</div>
            </div>
            {user.role === 'admin'
              ? <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>Protected Super Admin</span>
              : <select aria-label={`Role for ${user.email}`} value={ROLES.some((role) => role.value === user.role) ? user.role : 'user'} disabled={busy === user.id} onChange={(event) => void changeRole(user, event.target.value)} style={{ minWidth: 170, padding: '9px 10px', borderRadius: 8, border: `1px solid ${border}`, background: darkMode ? '#111520' : '#fff', color: text }}>
                  {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>}
            {busy === user.id && <span style={{ fontSize: 11, color: muted }}>Saving…</span>}
          </div>
        ))}
      <div style={{ marginTop: 14, fontSize: 11, color: muted }}>Showing {filtered.length} of {users.length} registered accounts.</div>
    </section>
  );
}
