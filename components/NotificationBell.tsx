'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { postPath } from '@/lib/posts';
import { G } from '@/lib/theme';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';

type Notif = {
  id: string | number;
  type?: string | null;
  message: string;
  preview?: string | null;
  post_id?: string | null;
  read: boolean;
  created_at?: string | null;
};

// Logged-in members only. Reads `notifications` for their email and listens
// for new rows live, so a reply or comment pops up without a refresh.
export default function NotificationBell() {
  const { loggedIn, userEmail } = useAuth();
  const { card, border, text, muted, darkMode } = useTheme();
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifs.filter((n) => !n.read).length;

  useEffect(() => {
    if (!loggedIn || !userEmail) { setNotifs([]); return; }
    let active = true;
    supabase.from('notifications').select('*').eq('recipient_email', userEmail)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { if (active && data) setNotifs(data as Notif[]); });
    const channel = supabase
      .channel(`notifs:${userEmail}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_email=eq.${userEmail}` },
        (payload) => setNotifs((prev) => [payload.new as Notif, ...prev]))
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [loggedIn, userEmail]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const markRead = useCallback(async (id: Notif['id']) => {
    setNotifs((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }, []);

  const markAll = async () => {
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
    await supabase.from('notifications').update({ read: true }).eq('recipient_email', userEmail).eq('read', false);
  };

  const openNotif = async (n: Notif) => {
    markRead(n.id);
    setOpen(false);
    if (!n.post_id) return;
    const { data } = await supabase.from('posts').select('id, title, category').eq('id', n.post_id).maybeSingle();
    if (data) router.push(postPath(data as never));
  };

  if (!loggedIn || !userEmail) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Notifications"
        style={{ background: 'none', border: `1px solid ${border}`, cursor: 'pointer', fontSize: 18, padding: '6px 10px', borderRadius: 8, color: muted, position: 'relative', display: 'flex', alignItems: 'center' }}>
        🔔
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: G.red, color: '#fff', fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: card, border: `1px solid ${border}`, borderRadius: 12, width: 320, maxWidth: '90vw', zIndex: 400, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: text }}>🔔 Notifications</span>
            {unread > 0 && <button onClick={markAll} style={{ background: 'none', border: 'none', color: G.green, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: muted, fontSize: 13 }}>No notifications yet</div>
            ) : notifs.map((n) => (
              <div key={n.id} onClick={() => openNotif(n)}
                style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, cursor: 'pointer', background: n.read ? 'transparent' : darkMode ? '#0a1a10' : '#f0fdf4', display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{n.type === 'comment' ? '💬' : '🔔'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: text, lineHeight: 1.4, marginBottom: 3 }}>{n.message}</div>
                  {n.preview && <div style={{ fontSize: 11, color: muted, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>&ldquo;{n.preview}&rdquo;</div>}
                  <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>
                    {n.created_at ? new Date(n.created_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </div>
                </div>
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: G.green, flexShrink: 0, marginTop: 4 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
