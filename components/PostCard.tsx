'use client';

import Link from 'next/link';
import { Post } from '@/lib/supabase';
import { postPath } from '@/lib/posts';
import { findCategory, G } from '@/lib/theme';
import { cloudinaryTransform } from '@/lib/cloudinary';
import { useTheme } from './ThemeProvider';
import { useSavedPosts } from './SavedPostsProvider';

export default function PostCard({ post }: { post: Post }) {
  const { card, border, text, muted, darkMode } = useTheme();
  const { isSaved, toggleSaved } = useSavedPosts();
  const saved = isSaved(post.id);
  const cat = findCategory(post.category);
  const views = typeof post.views === 'number' ? post.views : 0;
  const image = cloudinaryTransform(post.image, { width: 160, height: 160 });

  return (
    <Link href={postPath(post)} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          background: card,
          borderRadius: 10,
          border: `1px solid ${border}`,
          padding: 16,
          marginBottom: 12,
          cursor: 'pointer',
          overflow: 'hidden',
          maxWidth: '100%',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            flexShrink: 0,
            borderRadius: 8,
            background: darkMode ? '#1e2535' : '#f0f4f8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            overflow: 'hidden',
          }}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={post.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            '📰'
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 5, flexWrap: 'wrap' }}>
            <span
              style={{
                background: (cat?.color || G.green) + '22',
                color: cat?.color || G.green,
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 4,
              }}
            >
              {post.category?.toUpperCase()}
            </span>
            {post.breaking && (
              <span
                style={{
                  background: G.red,
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 3,
                }}
              >
                BREAKING
              </span>
            )}
            {post.hot && (
              <span
                style={{
                  background: G.gold,
                  color: '#000',
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 3,
                }}
              >
                🔥 HOT
              </span>
            )}
            {post.sponsored && (
              <span
                style={{
                  background: '#a855f722',
                  color: '#a855f7',
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 3,
                }}
              >
                💰 SPONSORED
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: text,
              lineHeight: 1.4,
              marginBottom: 4,
              fontFamily: 'Georgia,serif',
            }}
          >
            {post.title}
          </div>
          <div
            style={{
              fontSize: 12,
              color: muted,
              lineHeight: 1.5,
              marginBottom: 8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              wordBreak: 'break-word',
            }}
          >
            {post.excerpt}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: muted, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>✍️ {post.author || 'NaijaToday Desk'}</span>
            <span>⏱ {post.read_time || '3 min'}</span>
            <span>👁 {views.toLocaleString()}</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSaved(post);
              }}
              style={{
                marginLeft: 'auto',
                background: saved ? G.green : 'none',
                color: saved ? '#fff' : muted,
                border: `1px solid ${saved ? G.green : border}`,
                borderRadius: 6,
                padding: '3px 9px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔖 {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
