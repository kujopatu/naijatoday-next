'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '../ThemeProvider';

type ActivityEntry = { id: number; action: string; detail: string | null; admin_email: string | null; created_at: string };

export default function ActivityLogPanel() {
  const { card, border, text, muted } = useTheme();
  const [log, setLog] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(30);
        if (!error && data) setLog(data as ActivityEntry[]);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 6, fontFamily: 'Georgia,serif' }}>📜 Activity Log</div>
      <div style={{ fontSize: 13, color: muted, marginBottom: 20 }}>Last 30 admin actions — publishing, editing, and deleting articles.</div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: muted }}>Loading…</div>
      ) : log.length === 0 ? (
        <div style={{ fontSize: 13, color: muted }}>No activity logged yet. Actions will appear here as you publish, edit, or delete articles.</div>
      ) : (
        log.map((a) => (
          <div key={a.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: text }}>
              {a.action}
              {a.detail ? ` — ${a.detail}` : ''}
            </div>
            <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>
              {a.admin_email || 'unknown'} · {new Date(a.created_at).toLocaleString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
