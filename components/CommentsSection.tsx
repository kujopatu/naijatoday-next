'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import { useToast } from './ToastProvider';

type Comment = {
  id: number | string;
  post_id: string;
  user: string | null;
  text: string;
  created_at: string | null;
};

type Props = {
  postId: string;
  postTitle: string;
  postAuthorEmail?: string | null;
};

// Port of the original CommentsSection: comments live in the `comments`
// table, posting needs a login, and new comments from other readers appear
// live — but only once the section scrolls into view, so most article views
// never open a realtime connection.
export default function CommentsSection({ postId, postTitle, postAuthorEmail }: Props) {
  const { card, border, text, muted, darkMode } = useTheme();
  const { username, userEmail } = useAuth();
  const { showToast } = useToast();

  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const usernameRef = useRef(username);
  usernameRef.current = username;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (!error && data) setComments(data as Comment[]);
    } catch {
      /* leave the list empty */
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  // Start watching for live comments only once the section is near the screen.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || isVisible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        (payload) => {
          const incoming = payload.new as Comment;
          const fromOther = incoming.user !== usernameRef.current;
          setComments((prev) => {
            if (prev.some((c) => c.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          if (fromOther) {
            setNewCount((n) => n + 1);
            showToast(`💬 New comment from ${incoming.user}`);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, isVisible, showToast]);

  // Stored notification for the article's author (table may not exist yet).
  const notifyAuthor = async (commentText: string) => {
    if (!postAuthorEmail || postAuthorEmail === userEmail) return;
    try {
      await supabase.from('notifications').insert([
        {
          recipient_email: postAuthorEmail,
          type: 'comment',
          message: `💬 ${username || 'Someone'} commented on your article "${postTitle || 'your article'}"`,
          preview: commentText.slice(0, 100),
          post_id: postId,
          read: false,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      /* notifications are best-effort */
    }
  };

  const handlePost = async () => {
    const commentText = comment.trim();
    if (!commentText) return;
    setPosting(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user: username || guestName.trim().slice(0, 30) || 'Guest Reader',
            text: commentText,
            created_at: new Date().toISOString(),
          },
        ])
        .select();
      if (error) {
        showToast('Error posting comment');
      } else {
        // Show it straight away; the realtime event is de-duplicated by id.
        const saved = (data?.[0] ?? null) as Comment | null;
        if (saved) {
          setComments((prev) => (prev.some((c) => c.id === saved.id) ? prev : [...prev, saved]));
        } else {
          load();
        }
        setComment('');
        showToast('Comment posted! 🎉');
        notifyAuthor(commentText);
      }
    } catch {
      showToast('Connection error');
    }
    setPosting(false);
  };

  return (
    <div ref={sectionRef} style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: text, fontFamily: 'Georgia,serif' }}>
          💬 Comments ({comments.length})
        </div>
        {newCount > 0 && (
          <span
            style={{ background: G.green, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}
          >
            +{newCount} new
          </span>
        )}
        <div style={{ flex: 1 }} />
        {isVisible && (
          <>
            <div
              style={{ width: 8, height: 8, borderRadius: '50%', background: G.green, boxShadow: `0 0 0 2px ${G.green}44` }}
              title="Live updates on"
            />
            <span style={{ fontSize: 10, color: muted }}>Live</span>
          </>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        {!username && (
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value.slice(0, 30))}
            placeholder="Display name (optional)"
            maxLength={30}
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', marginBottom: 8, borderRadius: 8, border: `1px solid ${border}`, background: darkMode ? '#111520' : '#f5f7fa', color: text, fontSize: 13 }}
          />
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Join the conversation — share your thoughts…"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePost()}
            maxLength={2000}
            style={{
              flex: 1, minWidth: 0, padding: '10px 14px', borderRadius: 8,
              border: `1px solid ${border}`, background: darkMode ? '#111520' : '#f5f7fa',
              color: text, fontSize: 14, outline: 'none', fontFamily: 'Georgia,serif',
            }}
          />
          <button
            onClick={handlePost}
            disabled={posting || !comment.trim()}
            style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: posting || !comment.trim() ? 'not-allowed' : 'pointer', opacity: posting || !comment.trim() ? 0.7 : 1 }}
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: muted, marginTop: 7 }}>No sign-in required. Keep comments respectful; comments may be reviewed by our moderators.</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: muted }}>Loading comments…</div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: muted, fontSize: 13 }}>
          No comments yet. Be the first to share your thoughts!
        </div>
      ) : (
        comments.map((c) => (
          <div
            key={c.id}
            style={{ background: card, borderRadius: 10, padding: 14, marginBottom: 10, border: `1px solid ${border}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: text, fontSize: 13 }}>👤 {c.user || 'Anonymous'}</span>
              <span style={{ fontSize: 11, color: muted }}>
                {c.created_at
                  ? new Date(c.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Recent'}
              </span>
            </div>
            <div style={{ fontSize: 14, color: darkMode ? '#c8d0dc' : '#2d3748', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {c.text}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
