'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ForumThread } from '@/lib/forum';
import { G } from '@/lib/theme';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

export default function ForumManager() {
  const { showToast } = useToast();
  const { card, border, text, muted } = useTheme();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [pending, setPending] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'queue' | 'manage'>('queue');

  const loadThreads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('forum_threads').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const all = data as ForumThread[];
        setThreads(all.filter((t) => t.status !== 'pending'));
        setPending(all.filter((t) => t.status === 'pending'));
      }
    } catch {
      showToast('Connection error loading forum threads');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadThreads();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (thread: ForumThread) => {
    try {
      const { error } = await supabase.from('forum_threads').update({ status: 'approved' }).eq('id', thread.id);
      if (error) {
        showToast('Error: ' + error.message);
        return;
      }
      setThreads((t) => [{ ...thread, status: 'approved' }, ...t]);
      setPending((p) => p.filter((x) => x.id !== thread.id));
      showToast('Thread approved and published! ✅');
    } catch {
      showToast('Connection error');
    }
  };

  const handleReject = async (id: number) => {
    try {
      const { error } = await supabase.from('forum_threads').delete().eq('id', id);
      if (error) {
        showToast('Error: ' + error.message);
        return;
      }
      setPending((p) => p.filter((x) => x.id !== id));
      showToast('Thread rejected and removed.');
    } catch {
      showToast('Connection error');
    }
  };

  const handlePin = async (id: number) => {
    const thread = threads.find((x) => x.id === id);
    if (!thread) return;
    const newPinned = !thread.pinned;
    setThreads((t) => t.map((x) => (x.id === id ? { ...x, pinned: newPinned } : x)));
    try {
      const { error } = await supabase.from('forum_threads').update({ pinned: newPinned }).eq('id', id);
      if (error) showToast('Error: ' + error.message);
      else showToast('Thread pin status updated 📌');
    } catch {
      showToast('Connection error');
    }
  };

  const handleClose = async (id: number) => {
    const thread = threads.find((x) => x.id === id);
    if (!thread) return;
    const newClosed = !thread.closed;
    setThreads((t) => t.map((x) => (x.id === id ? { ...x, closed: newClosed } : x)));
    try {
      const { error } = await supabase.from('forum_threads').update({ closed: newClosed }).eq('id', id);
      if (error) showToast('Error: ' + error.message);
      else showToast('Thread open/close status updated 🔒');
    } catch {
      showToast('Connection error');
    }
  };

  const handleDelete = async (id: number) => {
    setThreads((t) => t.filter((x) => x.id !== id));
    try {
      const { error } = await supabase.from('forum_threads').delete().eq('id', id);
      if (error) showToast('Error: ' + error.message);
      else showToast('Thread deleted');
    } catch {
      showToast('Connection error');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: muted }}>Loading…</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setTab('queue')}
          style={{
            background: tab === 'queue' ? G.gold : 'none',
            color: tab === 'queue' ? '#000' : muted,
            border: `1px solid ${tab === 'queue' ? G.gold : border}`,
            borderRadius: 8,
            padding: '9px 18px',
            fontSize: 13,
            fontWeight: tab === 'queue' ? 700 : 400,
            cursor: 'pointer',
          }}
        >
          ⚠️ Pending Queue ({pending.length})
        </button>
        <button
          onClick={() => setTab('manage')}
          style={{
            background: tab === 'manage' ? G.green : 'none',
            color: tab === 'manage' ? '#fff' : muted,
            border: `1px solid ${tab === 'manage' ? G.green : border}`,
            borderRadius: 8,
            padding: '9px 18px',
            fontSize: 13,
            fontWeight: tab === 'manage' ? 700 : 400,
            cursor: 'pointer',
          }}
        >
          💬 All Threads ({threads.length})
        </button>
      </div>

      {tab === 'queue' &&
        (pending.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: muted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div>No pending submissions. All clear!</div>
          </div>
        ) : (
          pending.map((post) => (
            <div key={post.id} style={{ background: card, border: `1px solid ${G.gold}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ background: G.gold + '22', color: G.gold, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>PENDING</span>
                <span style={{ background: G.green + '22', color: G.green, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>{post.category}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 4, fontFamily: 'Georgia,serif' }}>{post.title}</div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 8 }}>{post.preview}</div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>
                👤 {post.author} · ⏰ {new Date(post.created_at).toLocaleString()}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleApprove(post)} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  ✅ Approve &amp; Publish
                </button>
                <button onClick={() => handleReject(post.id)} style={{ background: G.red, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  ❌ Reject
                </button>
              </div>
            </div>
          ))
        ))}

      {tab === 'manage' &&
        (threads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: muted }}>No threads yet.</div>
        ) : (
          threads.map((thread) => (
            <div key={thread.id} style={{ background: card, border: `1px solid ${thread.pinned ? G.gold : border}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                {thread.pinned && <span style={{ background: G.gold, color: '#000', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>📌 PINNED</span>}
                {thread.closed && <span style={{ background: '#444', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>🔒 CLOSED</span>}
                <span style={{ background: G.green + '22', color: G.green, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>{thread.category}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 4 }}>{thread.title}</div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 10 }}>
                👤 {thread.author} · 💬 {thread.replies} replies · 👁 {thread.views} · ⏰ {new Date(thread.created_at).toLocaleDateString()}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => handlePin(thread.id)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, border: `1px solid ${G.gold}`, color: G.gold, background: 'none', cursor: 'pointer' }}>
                  {thread.pinned ? '📌 Unpin' : '📌 Pin'}
                </button>
                <button onClick={() => handleClose(thread.id)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, border: `1px solid ${muted}`, color: muted, background: 'none', cursor: 'pointer' }}>
                  {thread.closed ? '🔓 Open' : '🔒 Close'}
                </button>
                <button onClick={() => handleDelete(thread.id)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, border: `1px solid ${G.red}`, color: G.red, background: 'none', cursor: 'pointer' }}>
                  🗑 Delete
                </button>
              </div>
            </div>
          ))
        ))}
    </div>
  );
}
