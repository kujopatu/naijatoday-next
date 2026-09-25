'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Post } from '@/lib/supabase';
import { postPath } from '@/lib/posts';
import { findCategory, G } from '@/lib/theme';
import { cloudinaryTransform } from '@/lib/cloudinary';
import { useTheme } from './ThemeProvider';

export default function FeaturedCarousel({ posts }: { posts: Post[] }) {
  const { card, border } = useTheme();
  const [idx, setIdx] = useState(0);

  if (posts.length === 0) return null;
  const activeIdx = idx % posts.length;
  const post = posts[activeIdx];
  const cat = findCategory(post.category);
  const image = cloudinaryTransform(post.image, { width: 1200 });

  return (
    <div
      style={{
        background: card,
        borderRadius: 12,
        overflow: 'hidden',
        border: `1px solid ${border}`,
        marginBottom: 24,
      }}
    >
      <Link href={postPath(post)} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div
          style={{
            height: 280,
            background: `linear-gradient(135deg, ${G.greenDark}, #1a3a2a)`,
            position: 'relative',
            cursor: 'pointer',
          }}
        >
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={post.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                inset: 0,
              }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 20,
              background: 'linear-gradient(to top, rgba(0,0,0,0.93), transparent)',
            }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
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
            </div>
            <div style={{ marginBottom: 6 }}>
              <span
                style={{
                  background: cat?.color || G.red,
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 4,
                }}
              >
                {post.category?.toUpperCase()}
              </span>
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.3,
                marginBottom: 8,
                fontFamily: 'Georgia,serif',
              }}
            >
              {post.title}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, marginBottom: 8 }}>
              {post.excerpt?.slice(0, 110)}…
            </div>
            <div
              style={{
                display: 'flex',
                gap: 16,
                fontSize: 12,
                color: 'rgba(255,255,255,0.6)',
                flexWrap: 'wrap',
              }}
            >
              <span>✍️ {post.author}</span>
              <span>⏱ {post.read_time || '3 min'}</span>
              <span>👁 {(post.views || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </Link>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '10px 0', background: card }}>
        {posts.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            style={{
              width: i === activeIdx ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === activeIdx ? G.green : border,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
