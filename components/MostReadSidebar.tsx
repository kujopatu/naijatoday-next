'use client';

import Link from 'next/link';
import { Post } from '@/lib/supabase';
import { postPath } from '@/lib/posts';
import { G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

export default function MostReadSidebar({ posts }: { posts: Post[] }) {
  const { card, border, text, muted } = useTheme();
  const top = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  if (top.length === 0) return null;

  return (
    <div style={{ background: card, borderRadius: 10, border: `1px solid ${border}`, padding: 16, marginBottom: 16 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: text,
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: `1px solid ${border}`,
        }}
      >
        🔥 Most Read Today
      </div>
      {top.map((post, i) => (
        <Link key={post.id} href={postPath(post)} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: '8px 0',
              borderBottom: i < top.length - 1 ? `1px solid ${border}` : 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 900, color: i < 2 ? G.red : muted, minWidth: 28, lineHeight: 1.2 }}>
              {i + 1}
            </span>
            <div>
              <div style={{ fontSize: 13, color: text, lineHeight: 1.4, fontWeight: 500 }}>{post.title}</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>👁 {(post.views || 0).toLocaleString()}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
