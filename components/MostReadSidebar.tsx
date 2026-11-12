'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Post, supabase } from '@/lib/supabase';
import { postPath } from '@/lib/posts';
import { G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

function activityScore(post: Pick<Post, 'views' | 'upvotes' | 'comments'>) {
  // Views lead the ranking; reactions and discussion add signals of reader interest.
  return (post.views || 0) + (post.upvotes || 0) * 5 + (post.comments || 0) * 3;
}

export default function MostReadSidebar({ posts }: { posts: Post[] }) {
  const { card, border, text, muted } = useTheme();
  const [livePosts, setLivePosts] = useState<Post[]>(posts);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('published', true)
        .order('views', { ascending: false })
        .limit(200);
      if (!error && data) {
        setLivePosts(data as Post[]);
        setLastUpdated(new Date());
      }
    } catch {
      // Keep the last successfully loaded list visible if refresh is unavailable.
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const top = useMemo(
    () => [...livePosts].sort((a, b) => activityScore(b) - activityScore(a)).slice(0, 5),
    [livePosts]
  );

  if (top.length === 0) return null;

  return (
    <section aria-label="Trending stories" style={{ background: card, borderRadius: 12, border: `1px solid ${border}`, padding: 17, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: text, margin: 0 }}>🔥 Trending Now</h2>
        <span style={{ fontSize: 9, fontWeight: 800, color: G.green, letterSpacing: '.6px' }}>LIVE</span>
      </div>
      <div style={{ fontSize: 10, color: muted, marginBottom: 10 }}>
        Ranked by views, reactions and comments
      </div>
      {top.map((post, i) => (
        <Link key={post.id} href={postPath(post)} style={{ textDecoration: 'none', color: 'inherit' }}>
          <article
            style={{
              display: 'flex',
              gap: 10,
              padding: '11px 0',
              borderBottom: i < top.length - 1 ? `1px solid ${border}` : 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 21, fontWeight: 900, color: i === 0 ? G.red : muted, minWidth: 25, lineHeight: 1.15 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 9, color: G.green, fontWeight: 800, letterSpacing: '.65px', marginBottom: 4 }}>
                {(post.category || 'NEWS').toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: text, lineHeight: 1.4, fontWeight: 650 }}>{post.title}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, fontSize: 10, color: muted, marginTop: 5 }}>
                <span>👁 {(post.views || 0).toLocaleString()} views</span>
                <span>▲ {(post.upvotes || 0).toLocaleString()}</span>
                <span>💬 {(post.comments || 0).toLocaleString()}</span>
              </div>
            </div>
          </article>
        </Link>
      ))}
      <div style={{ fontSize: 9, color: muted, marginTop: 9 }}>
        {lastUpdated ? 'Reader activity refreshed just now' : 'Refreshes automatically every minute'}
      </div>
    </section>
  );
}
