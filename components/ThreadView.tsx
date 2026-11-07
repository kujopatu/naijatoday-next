'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ForumReply, ForumThread } from '@/lib/forum';
import { isBanned, timeAgo } from '@/lib/forumActions';
import { getVoterKey } from '@/lib/voter';
import { CATEGORIES, G } from '@/lib/theme';
import { useAuth } from './AuthProvider';
import ReportModal from './ReportModal';
import ThreadPoll from './ThreadPoll';
import { useTheme } from './ThemeProvider';
import { useToast } from './ToastProvider';

// A single forum thread: the post, its replies, a reply box (login needed),
// and the pin / close / delete controls for admins and moderators.
export default function ThreadView({ thread: initial }: { thread: ForumThread }) {
  const router = useRouter();
  const { card, border, text, muted, darkMode: D } = useTheme();
  const { loggedIn, username, userEmail, canModerate, openModal } = useAuth();
  const { showToast } = useToast();

  const [thread, setThread] = useState(initial);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [reply, setReply] = useState('');
  const [posting, setPosting] = useState(false);
  const [threadUpvoted, setThreadUpvoted] = useState(false);
  const [replyUpvoted, setReplyUpvoted] = useState<Record<number, boolean>>({});
  const [reportTarget, setReportTarget] = useState<{ type: 'thread' | 'reply'; id: number } | null>(null);

  const cat = CATEGORIES.find((c) => c.name === thread.category);

  const loadReplies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('forum_replies')
        .select('*')
        .eq('thread_id', initial.id)
        .order('created_at', { ascending: true });
      if (!error && data) {
        setReplies(data as ForumReply[]);
        loadReplyVotes((data as ForumReply[]).map((r) => r.id));
      }
    } catch {
      /* leave empty */
    }
    setLoadingReplies(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id, userEmail]);

  // Which of these has this member / device already upvoted?
  const loadReplyVotes = async (ids: number[]) => {
    const voterKey = getVoterKey(userEmail);
    try {
      const { data } = await supabase.from('forum_votes').select('target_type, target_id').eq('voter_key', voterKey).in('target_type', ['thread', 'reply']);
      if (!data) return;
      setThreadUpvoted(data.some((v) => v.target_type === 'thread' && v.target_id === initial.id));
      const map: Record<number, boolean> = {};
      data.forEach((v) => {
        if (v.target_type === 'reply' && ids.includes(v.target_id)) map[v.target_id] = true;
      });
      setReplyUpvoted(map);
    } catch {
      /* votes are best-effort */
    }
  };

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  // Count one view per visitor per browser session. Old threads hold the
  // placeholder "New" (or text), so anything non-numeric counts as 0.
  useEffect(() => {
    const key = `naija_thread_viewed_${initial.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* no sessionStorage: just count it */
    }
    (async () => {
      try {
        const { data } = await supabase.from('forum_threads').select('views').eq('id', initial.id).maybeSingle();
        const n = Number.parseInt(String(data?.views ?? '0'), 10);
        const next = (Number.isFinite(n) ? n : 0) + 1;
        const { error } = await supabase.from('forum_threads').update({ views: String(next) }).eq('id', initial.id);
        if (!error) setThread((t) => ({ ...t, views: next }));
      } catch {
        /* view counting is best-effort */
      }
    })();
  }, [initial.id]);

  const handlePostReply = async () => {
    const body = reply.trim();
    if (!body) return;
    if (!loggedIn) {
      openModal('login');
      return;
    }
    if (thread.closed) {
      showToast('This thread is closed.');
      return;
    }
    if (await isBanned(userEmail)) {
      showToast('Your account has been restricted from posting.');
      return;
    }
    setPosting(true);
    try {
      const { error } = await supabase.from('forum_replies').insert([
        { thread_id: thread.id, user: username || 'Anonymous', text: body, created_at: new Date().toISOString() },
      ]);
      if (error) {
        showToast('Error: ' + error.message);
        setPosting(false);
        return;
      }
      await supabase.from('forum_threads').update({ replies: replies.length + 1 }).eq('id', thread.id);
      setReply('');
      await loadReplies();
      showToast('Reply posted! 🎉');
    } catch {
      showToast('Connection error');
    }
    setPosting(false);
  };

  const handleThreadUpvote = async () => {
    const voterKey = getVoterKey(userEmail);
    const was = threadUpvoted;
    setThreadUpvoted(!was);
    setThread((t) => ({ ...t, upvotes: Math.max(0, (t.upvotes || 0) + (was ? -1 : 1)) }));
    try {
      if (was) {
        await supabase.from('forum_votes').delete().eq('target_type', 'thread').eq('target_id', thread.id).eq('voter_key', voterKey);
        await supabase.rpc('decrement_thread_upvotes', { t_id: thread.id });
        showToast('Vote removed');
      } else {
        const { error } = await supabase.from('forum_votes').insert([{ target_type: 'thread', target_id: thread.id, voter_key: voterKey }]);
        if (!error) await supabase.rpc('increment_thread_upvotes', { t_id: thread.id });
        showToast('Upvoted! 👍');
      }
    } catch {
      /* the screen already shows the change */
    }
  };

  const handleReplyUpvote = async (r: ForumReply) => {
    const voterKey = getVoterKey(userEmail);
    const was = !!replyUpvoted[r.id];
    setReplyUpvoted((u) => ({ ...u, [r.id]: !was }));
    setReplies((rs) => rs.map((x) => (x.id === r.id ? { ...x, upvotes: Math.max(0, (x.upvotes || 0) + (was ? -1 : 1)) } : x)));
    try {
      if (was) {
        await supabase.from('forum_votes').delete().eq('target_type', 'reply').eq('target_id', r.id).eq('voter_key', voterKey);
        await supabase.rpc('decrement_reply_upvotes', { r_id: r.id });
      } else {
        const { error } = await supabase.from('forum_votes').insert([{ target_type: 'reply', target_id: r.id, voter_key: voterKey }]);
        if (!error) await supabase.rpc('increment_reply_upvotes', { r_id: r.id });
      }
    } catch {
      /* best-effort */
    }
  };

  const submitReport = async (reason: string) => {
    if (!reportTarget) return;
    try {
      const { error } = await supabase.from('forum_reports').insert([
        {
          target_type: reportTarget.type,
          target_id: reportTarget.id,
          thread_id: thread.id,
          reason: reason || 'No reason given',
          reported_by: username || getVoterKey(userEmail),
          status: 'pending',
        },
      ]);
      if (error) showToast('Error: ' + error.message);
      else showToast('Reported. A moderator will review it. 🚩');
    } catch {
      showToast('Connection error');
    }
  };

  const togglePin = async () => {
    const next = !thread.pinned;
    setThread((t) => ({ ...t, pinned: next }));
    const { error } = await supabase.from('forum_threads').update({ pinned: next }).eq('id', thread.id);
    if (error) {
      setThread((t) => ({ ...t, pinned: !next }));
      showToast('Error: ' + error.message);
    } else showToast('Thread pin status updated 📌');
  };

  const toggleClosed = async () => {
    const next = !thread.closed;
    setThread((t) => ({ ...t, closed: next }));
    const { error } = await supabase.from('forum_threads').update({ closed: next }).eq('id', thread.id);
    if (error) {
      setThread((t) => ({ ...t, closed: !next }));
      showToast('Error: ' + error.message);
    } else showToast('Thread open/close status updated 🔒');
  };

  const deleteThread = async () => {
    if (!window.confirm('Delete this thread and all its replies?')) return;
    const { error } = await supabase.from('forum_threads').delete().eq('id', thread.id);
    if (error) {
      showToast('Error: ' + error.message);
      return;
    }
    showToast('Thread deleted.');
    router.push('/forum');
    router.refresh();
  };

  const inp: React.CSSProperties = {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: D ? '#111520' : '#f5f7fa',
    color: text,
    fontSize: 14,
    outline: 'none',
    fontFamily: 'Georgia,serif',
  };
  const tag = (bg: string, fg: string): React.CSSProperties => ({
    background: bg,
    color: fg,
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 3,
  });

  return (
    <div style={{ background: card, borderRadius: 16, border: `1px solid ${border}`, padding: 28 }}>
      <Link href="/forum" style={{ fontSize: 13, color: G.green, textDecoration: 'none', fontWeight: 600 }}>
        ← Back to Forum
      </Link>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '16px 0 12px' }}>
        {thread.pinned && <span style={tag(G.gold, '#000')}>📌 PINNED</span>}
        {thread.closed && <span style={tag('#444', '#fff')}>🔒 CLOSED</span>}
        {thread.hot && <span style={tag(G.gold, '#000')}>🔥 HOT</span>}
        {thread.category && (
          <span
            style={{
              background: (cat?.color || G.green) + '22',
              color: cat?.color || G.green,
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 4,
            }}
          >
            {cat ? `${cat.icon} ${thread.category}` : thread.category}
          </span>
        )}
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: text, lineHeight: 1.35, marginBottom: 10, fontFamily: 'Georgia,serif' }}>
        {thread.title}
      </h1>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: muted, marginBottom: 18, flexWrap: 'wrap' }}>
        <span>👤 {thread.author || 'Anonymous'}</span>
        <span>⏰ {timeAgo(thread.created_at)}</span>
        <span>👁 {thread.views}</span>
        <span>💬 {loadingReplies ? thread.replies : replies.length}</span>
      </div>

      <div
        style={{
          fontSize: 15,
          color: D ? '#c8d0dc' : '#2d3748',
          lineHeight: 1.9,
          marginBottom: 20,
          fontFamily: 'Georgia,serif',
          borderLeft: `3px solid ${G.green}`,
          paddingLeft: 16,
          whiteSpace: 'pre-wrap',
        }}
      >
        {thread.body || thread.preview}
      </div>

      <ThreadPoll threadId={thread.id} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={handleThreadUpvote} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 6, border: `1px solid ${threadUpvoted ? G.green : border}`, color: threadUpvoted ? G.green : muted, background: 'none', cursor: 'pointer' }}>
          👍 {thread.upvotes || 0}
        </button>
        <button onClick={() => setReportTarget({ type: 'thread', id: thread.id })} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 6, border: `1px solid ${border}`, color: muted, background: 'none', cursor: 'pointer' }}>
          🚩 Report
        </button>
      </div>

      {canModerate && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 16, marginBottom: 20, borderBottom: `1px solid ${border}` }}>
          <button onClick={togglePin} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: `1px solid ${G.gold}`, color: G.gold, background: 'none', cursor: 'pointer' }}>
            {thread.pinned ? '📌 Unpin' : '📌 Pin'}
          </button>
          <button onClick={toggleClosed} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: `1px solid ${muted}`, color: muted, background: 'none', cursor: 'pointer' }}>
            {thread.closed ? '🔓 Open' : '🔒 Close'}
          </button>
          <button onClick={deleteThread} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: `1px solid ${G.red}`, color: G.red, background: 'none', cursor: 'pointer' }}>
            🗑 Delete
          </button>
        </div>
      )}

      <div style={{ fontSize: 16, fontWeight: 700, color: text, margin: '8px 0 14px', fontFamily: 'Georgia,serif' }}>
        💬 Replies ({loadingReplies ? thread.replies : replies.length})
      </div>

      {thread.closed ? (
        <div style={{ background: D ? '#111520' : '#f5f7fa', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: muted, textAlign: 'center' }}>
          🔒 This thread is closed to new replies.
        </div>
      ) : loggedIn ? (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
            maxLength={2000}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePostReply()}
            style={inp}
          />
          <button
            onClick={handlePostReply}
            disabled={posting}
            style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: posting ? 'not-allowed' : 'pointer', opacity: posting ? 0.7 : 1 }}
          >
            {posting ? 'Posting…' : 'Reply'}
          </button>
        </div>
      ) : (
        <div style={{ background: D ? '#111520' : '#f5f7fa', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: muted, textAlign: 'center' }}>
          Please{' '}
          <span style={{ color: G.green, fontWeight: 600, cursor: 'pointer' }} onClick={() => openModal('login')}>
            log in
          </span>{' '}
          to reply to this thread.
        </div>
      )}

      {loadingReplies ? (
        <div style={{ textAlign: 'center', padding: 24, color: muted, fontSize: 13 }}>Loading replies…</div>
      ) : replies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: muted, fontSize: 13 }}>No replies yet. Be the first to respond!</div>
      ) : (
        replies.map((r) => (
          <div key={r.id} style={{ background: D ? '#111520' : '#f5f7fa', borderRadius: 10, padding: 14, marginBottom: 10, border: `1px solid ${border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: text, fontSize: 13 }}>👤 {r.user || 'Anonymous'}</span>
              <span style={{ fontSize: 11, color: muted }}>
                {new Date(r.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div style={{ fontSize: 14, color: D ? '#c8d0dc' : '#2d3748', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{r.text}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => handleReplyUpvote(r)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${replyUpvoted[r.id] ? G.green : border}`, color: replyUpvoted[r.id] ? G.green : muted, background: 'none', cursor: 'pointer' }}>
                👍 {r.upvotes || 0}
              </button>
              <button onClick={() => setReportTarget({ type: 'reply', id: r.id })} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${border}`, color: muted, background: 'none', cursor: 'pointer' }}>
                🚩 Report
              </button>
            </div>
          </div>
        ))
      )}
      {reportTarget && <ReportModal kind={reportTarget.type} onClose={() => setReportTarget(null)} onSubmit={submitReport} />}
    </div>
  );
}
