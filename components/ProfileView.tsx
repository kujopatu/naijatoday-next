'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Post, supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { getStreakInfo, StreakInfo } from '@/lib/streak';
import { useAuth } from './AuthProvider';
import { useSavedPosts } from './SavedPostsProvider';
import { useTheme } from './ThemeProvider';
import { useToast } from './ToastProvider';
import PostCard from './PostCard';
import StreakBadge from './StreakBadge';

export default function ProfileView() {
  const { loading, loggedIn, username, userEmail, isAdmin, isModerator, canModerate, openModal, logout } = useAuth();
  const { card, border, text, muted, darkMode } = useTheme();
  const { savedPosts } = useSavedPosts();
  const { showToast } = useToast();
  const [streak, setStreak] = useState<StreakInfo>({ current: 0, longest: 0, total: 0 });
  const [bio, setBio] = useState('');
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<Post[] | null>(null);
  const [readCount, setReadCount] = useState(0);
  const [upvoteCount, setUpvoteCount] = useState(0);

  useEffect(() => { setStreak(getStreakInfo()); }, []);

  useEffect(() => {
    if (!loggedIn || !userEmail) return;
    let active = true;
    (async () => {
      const { data: prof } = await supabase.from('user_profiles').select('bio').eq('user_email', userEmail).maybeSingle();
      if (active && prof?.bio) setBio(prof.bio);

      const { data: hist } = await supabase.from('reading_history').select('post_id, read_at')
        .eq('user_email', userEmail).order('read_at', { ascending: false }).limit(10);
      const ids = (hist ?? []).map((h) => h.post_id);
      if (ids.length) {
        const { data: posts } = await supabase.from('posts').select('*').in('id', ids).eq('published', true);
        if (active) setHistory(ids.map((id) => (posts ?? []).find((p) => p.id === id)).filter(Boolean) as Post[]);
      } else if (active) setHistory([]);

      const { count: reads } = await supabase.from('reading_history').select('*', { count: 'exact', head: true }).eq('user_email', userEmail);
      const { count: ups } = await supabase.from('post_votes').select('*', { count: 'exact', head: true }).eq('voter_key', userEmail);
      if (active) { setReadCount(reads ?? 0); setUpvoteCount(ups ?? 0); }
    })();
    return () => { active = false; };
  }, [loggedIn, userEmail]);

  const saveBio = async () => {
    setEditing(false);
    const { error } = await supabase.from('user_profiles').upsert(
      [{ user_email: userEmail, bio, updated_at: new Date().toISOString() }], { onConflict: 'user_email' });
    showToast(error ? 'Error: ' + error.message : 'Profile updated ✅');
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: muted }}>Loading…</div>;
  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center', padding: 16 }}>
        <div style={{ fontSize: 52 }}>👤</div>
        <div style={{ fontSize: 18, fontWeight: 700, margin: '10px 0', color: text }}>Log in to see your profile</div>
        <button onClick={() => openModal('login')} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, cursor: 'pointer' }}>Login</button>
      </div>
    );
  }

  const tile = darkMode ? '#111520' : '#f5f7fa';
  const stats: [string, string | number, string][] = [
    ['🔥', streak.current > 0 ? `${streak.current} days` : 'Start today!', 'Current Streak'],
    ['📰', readCount, 'Read'],
    ['🔖', savedPosts.length, 'Saved'],
    ['👍', upvoteCount, 'Upvoted'],
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg, ${G.green}, ${G.greenDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 32, flexShrink: 0 }}>
            {username[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: text, fontFamily: 'Georgia,serif', marginBottom: 4 }}>{username}</div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 4 }}>{userEmail}</div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 8 }}>📍 Nigeria · 🗓 NaijaToday Member</div>
            {isAdmin && <span style={{ background: G.gold, color: '#000', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6 }}>⚡ ADMIN</span>}
            {!isAdmin && isModerator && <span style={{ background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6 }}>🛡️ MODERATOR</span>}
            {editing ? (
              <div style={{ marginTop: 12 }}>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write a short bio…"
                  style={{ width: '100%', minHeight: 80, resize: 'vertical', padding: 10, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: text, fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' }} />
                <div style={{ marginTop: 8 }}>
                  <button onClick={saveBio} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer', marginRight: 8 }}>Save</button>
                  <button onClick={() => setEditing(false)} style={{ background: 'none', color: muted, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 14, color: muted, marginBottom: 8 }}>{bio || 'No bio yet.'}</div>
                <button onClick={() => setEditing(true)} style={{ background: 'none', color: G.green, border: `1px solid ${G.green}`, borderRadius: 6, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}>✏️ Edit Profile</button>
              </div>
            )}
          </div>
        </div>

        {streak.current > 0 && <div style={{ marginBottom: 16 }}><StreakBadge current={streak.current} /></div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
          {stats.map(([icon, val, label]) => (
            <div key={label} style={{ background: tile, borderRadius: 8, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: label === 'Current Streak' && streak.current > 0 ? G.gold : G.green }}>{val}</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {streak.longest > 0 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            {[['🏆 Longest streak', `${streak.longest} days`], ['📅 Total days read', String(streak.total)]].map(([l, v]) => (
              <div key={l} style={{ flex: 1, minWidth: 180, background: tile, borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: muted }}>{l}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: G.green }}>{v}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11, color: muted, marginTop: 10 }}>Streak is counted on this device.</div>
      </div>

      {canModerate && (
        <Link href="/admin" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', background: `linear-gradient(135deg, ${G.greenDark}, #0a2018)`, color: '#fff', border: `1px solid ${G.green}`, borderRadius: 10, padding: '14px 24px', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
          ⚡ Go to Admin Dashboard
        </Link>
      )}

      <Heading>📖 Recently Read</Heading>
      {history === null ? <Empty>Loading…</Empty> : history.length === 0
        ? <Empty>No reading history yet — articles you open will show up here.</Empty>
        : history.map((p) => <PostCard key={p.id} post={p} />)}

      <Heading>🔖 Saved Articles</Heading>
      {savedPosts.length === 0 ? <Empty>No saved articles yet.</Empty> : savedPosts.map((p) => <PostCard key={p.id} post={p} />)}

      <button onClick={logout} style={{ background: G.red, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 16 }}>🚪 Log Out</button>
    </div>
  );

  function Heading({ children }: { children: React.ReactNode }) {
    return <div style={{ margin: '24px 0 12px', paddingBottom: 8, borderBottom: `2px solid ${G.green}`, fontSize: 17, fontWeight: 700, fontFamily: 'Georgia,serif', color: text }}>{children}</div>;
  }
  function Empty({ children }: { children: React.ReactNode }) {
    return <div style={{ textAlign: 'center', padding: 28, color: muted, fontSize: 13 }}>{children}</div>;
  }
}
