'use client';

import { useEffect, useState } from 'react';
import { Post, supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { getVoterKey } from '@/lib/voter';
import { useAuth } from '../AuthProvider';
import { useSavedPosts } from '../SavedPostsProvider';
import { useTheme } from '../ThemeProvider';
import { useToast } from '../ToastProvider';

export default function ArticleActions({ post }: { post: Post }) {
  const { card, border, text, muted } = useTheme();
  const { loggedIn, userEmail, openModal } = useAuth();
  const { isSaved, toggleSaved } = useSavedPosts();
  const { showToast } = useToast();
  const [upvotes, setUpvotes] = useState(post.upvotes ?? 0);
  const [voted, setVoted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!loggedIn || !userEmail) {
      setVoted(false);
      return () => { active = false; };
    }
    supabase.from('post_votes').select('post_id').eq('post_id', post.id).eq('voter_key', getVoterKey(userEmail)).maybeSingle()
      .then(({ data }) => { if (active) setVoted(!!data); });
    return () => { active = false; };
  }, [post.id, userEmail, loggedIn]);

  const toggleVote = async () => {
    if (!loggedIn) {
      openModal('login');
      return;
    }
    if (busy) return;
    setBusy(true);
    const key = getVoterKey(userEmail);
    const result = voted
      ? await supabase.from('post_votes').delete().eq('post_id', post.id).eq('voter_key', key)
      : await supabase.from('post_votes').insert({ post_id: post.id, voter_key: key });
    if (result.error) {
      showToast('Vote could not be saved: ' + result.error.message);
    } else {
      setVoted(!voted);
      setUpvotes((n) => Math.max(0, n + (voted ? -1 : 1)));
    }
    setBusy(false);
  };

  const url = () => (typeof window !== 'undefined' ? window.location.href : '');
  const open = (href: string) => window.open(href, '_blank', 'noopener,noreferrer,width=600,height=500');
  const enc = encodeURIComponent;
  const shareArticle = async () => {
    const shareData = { title: post.title, text: post.excerpt || 'Read this story on NaijaToday', url: url() };
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') showToast('Sharing was not completed');
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      showToast('Your device does not support direct sharing. Link copied instead.');
    } catch {
      showToast('Sharing is not supported on this browser. Copy the page link from the address bar.');
    }
  };

  const saved = isSaved(post.id);

  const btn = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? G.green : border}`, background: active ? 'rgba(0,135,81,0.12)' : card, color: active ? G.green : text,
  });

  return (
    <div className="article-actions" aria-label="Article actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '20px 0', padding: '12px 0', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
      <button style={btn(voted)} onClick={toggleVote}>👍 {upvotes}</button>
      <button style={btn(saved)} onClick={() => toggleSaved(post)}>
        {saved ? '🔖 Saved' : '🔖 Save'}
      </button>
      <button style={btn(false)} onClick={shareArticle}>↗ Share</button>
      <span style={{ fontSize: 12, color: muted, marginLeft: 6 }}>Or share via:</span>
      <button style={btn(false)} onClick={() => open(`https://wa.me/?text=${enc(post.title + ' ' + url())}`)}>WhatsApp</button>
      <button style={btn(false)} onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${enc(url())}`)}>Facebook</button>
      <button style={btn(false)} onClick={() => open(`https://twitter.com/intent/tweet?text=${enc(post.title)}&url=${enc(url())}`)}>X</button>
      <button style={btn(false)} onClick={async () => { try { await navigator.clipboard.writeText(url()); showToast('Link copied'); } catch { showToast('Could not copy link'); } }}>🔗 Copy</button>
    </div>
  );
}
