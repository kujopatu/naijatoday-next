'use client';

import Link from 'next/link';
import { useSavedPosts } from './SavedPostsProvider';
import PostCard from './PostCard';
import { useTheme } from './ThemeProvider';
import { G } from '@/lib/theme';

export default function SavedList() {
  const { savedPosts } = useSavedPosts();
  const { muted } = useTheme();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${G.green}` }}>
        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Georgia,serif' }}>
          🔖 Saved Articles ({savedPosts.length})
        </span>
      </div>
      {savedPosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: muted }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🔖</div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>No saved articles yet</div>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span
              style={{
                display: 'inline-block',
                background: G.green,
                color: '#fff',
                borderRadius: 8,
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Browse Latest News
            </span>
          </Link>
        </div>
      ) : (
        savedPosts.map((p) => <PostCard key={p.id} post={p} />)
      )}
    </div>
  );
}
