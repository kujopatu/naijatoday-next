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
    supabase.from('post_votes').select('post_id').eq('post_id', post.id).eq('voter_key', getVoterKey(userEmail)).maybeSingle()
      .then(({ data }) => { if (active) setVoted(!!data); });
    return () => { active = false; };
  }, [post.id, userEmail]);

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
  const saved = isSaved(post.id);

  const btn = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? G.green : border}`, background: active ? 'rgba(0,135,81,0.12)' : card, color: active ? G.green : text,
  });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '20px 0' }}>
      <button style={btn(voted)} onClick={toggleVote}>👍 {upvotes}</button>
      <button style={btn(saved)} onClick={() => toggleSaved(post)}>
        {saved ? '🔖 Saved' : '🔖 Save'}
      </button>
      <span style={{ fontSize: 12, color: muted, marginLeft: 6 }}>Share:</span>
      <button style={btn(false)} onClick={() => open(`https://wa.me/?text=${enc(post.title + ' ' + url())}`)}>WhatsApp</button>
      <button style={btn(false)} onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${enc(url())}`)}>Facebook</button>
      <button style={btn(false)} onClick={() => open(`https://twitter.com/intent/tweet?text=${enc(post.title)}&url=${enc(url())}`)}>X</button>
      <button style={btn(false)} onClick={async () => { try { await navigator.clipboard.writeText(url()); showToast('Link copied'); } catch { showToast('Could not copy link'); } }}>🔗 Copy</button>
    </div>
  );
}
