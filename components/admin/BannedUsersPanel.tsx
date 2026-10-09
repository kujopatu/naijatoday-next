'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

type BannedUser = { id: number; email: string; reason: string | null; banned_at: string };

export default function BannedUsersPanel() {
  const { showToast } = useToast();
  const { card, border, text, muted, darkMode } = useTheme();
  const [banned, setBanned] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const inp: React.CSSProperties = {
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

  const loadBanned = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('banned_users').select('*').order('banned_at', { ascending: false });
      if (!error && data) setBanned(data as BannedUser[]);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadBanned();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBan = async () => {
    const em = email.trim().toLowerCase();
    if (!em || !em.includes('@')) {
      showToast('Enter a valid email to ban');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('banned_users').insert([{ email: em, reason: reason.trim() || null, banned_at: new Date().toISOString() }]);
      if (error) {
        showToast('Error: ' + error.message);
        setSaving(false);
        return;
      }
      showToast(`${em} banned ✅`);
      setEmail('');
      setReason('');
      loadBanned();
    } catch {
      showToast('Connection error');
    }
    setSaving(false);
  };

  const handleUnban = async (id: number) => {
    try {
      const { error } = await supabase.from('banned_users').delete().eq('id', id);
      if (error) {
        showToast('Error: ' + error.message);
        return;
      }
      showToast('User unbanned');
      loadBanned();
    } catch {
      showToast('Connection error');
    }
  };

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 6, fontFamily: 'Georgia,serif' }}>🚫 Banned Users ({banned.length})</div>
      <div style={{ fontSize: 13, color: muted, marginBottom: 20 }}>Blocks new forum threads/replies from this email going forward.</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <input style={{ ...inp, flex: '1 1 200px' }} placeholder="Email to ban…" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={{ ...inp, flex: '1 1 200px' }} placeholder="Reason (optional)…" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button onClick={handleBan} disabled={saving} style={{ background: G.red, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
          🚫 Ban
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: muted }}>Loading…</div>
      ) : banned.length === 0 ? (
        <div style={{ fontSize: 13, color: muted }}>No banned users.</div>
      ) : (
        banned.map((b) => (
          <div key={b.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, color: text, fontWeight: 600 }}>{b.email}</div>
              <div style={{ fontSize: 11, color: muted }}>
                {b.reason || 'No reason given'} · {new Date(b.banned_at).toLocaleDateString()}
              </div>
            </div>
            <button onClick={() => handleUnban(b.id)} style={{ background: 'none', color: G.green, border: `1px solid ${G.green}`, borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>
              Unban
            </button>
          </div>
        ))
      )}

      <div style={{ fontSize: 11, color: muted, marginTop: 16 }}>
        Note: banning here does not retroactively hide past posts — delete those separately from Forum Manager or Reports.
      </div>
    </div>
  );
}
