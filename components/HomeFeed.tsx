'use client';

import { useMemo, useState } from 'react';
import { Post } from '@/lib/supabase';
import PostCard from './PostCard';
import { useTheme } from './ThemeProvider';
import { G } from '@/lib/theme';

const PAGE_SIZE = 20;

export default function HomeFeed({ posts, title = '📰 Latest Stories' }: { posts: Post[]; title?: string }) {
  const { muted, border } = useTheme();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = useMemo(
    () => posts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [posts, safePage]
  );

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: `2px solid ${G.green}`,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Georgia,serif' }}>{title}</span>
        <span style={{ fontSize: 12, color: muted }}>{posts.length} articles · Live from database</span>
      </div>

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: muted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div>No articles published yet.</div>
        </div>
      ) : (
        visible.map((p) => <PostCard key={p.id} post={p} />)
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, margin: '20px 0 28px' }}>
          <button
            onClick={() => goToPage(safePage - 1)}
            disabled={safePage === 1}
            style={{
              background: safePage === 1 ? 'none' : G.green,
              color: safePage === 1 ? muted : '#fff',
              border: `1px solid ${safePage === 1 ? border : G.green}`,
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: safePage === 1 ? 'not-allowed' : 'pointer',
              opacity: safePage === 1 ? 0.4 : 1,
            }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 13, color: muted }}>
            Page {safePage} of {totalPages}
          </span>
          <button
            onClick={() => goToPage(safePage + 1)}
            disabled={safePage === totalPages}
            style={{
              background: safePage === totalPages ? 'none' : G.green,
              color: safePage === totalPages ? muted : '#fff',
              border: `1px solid ${safePage === totalPages ? border : G.green}`,
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
              opacity: safePage === totalPages ? 0.4 : 1,
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
