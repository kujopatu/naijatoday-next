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
  const image = cloudinaryTransform(post.image, { width: 560, height: 380 });

  return (
    <Link href={postPath(post)} className="naija-post-link" style={{ textDecoration: 'none', color: 'inherit' }}>
      <article
        className="naija-post-card naija-post-card-premium naija-post-card-redesign"
        style={{
          display: 'flex',
          gap: 22,
          background: card,
          borderRadius: 16,
          border: `1px solid ${border}`,
          padding: 20,
          marginBottom: 18,
          cursor: 'pointer',
          overflow: 'hidden',
          maxWidth: '100%',
          alignItems: 'stretch',
        }}
      >
        <div className="naija-post-image" style={{
          width: 210,
          height: 154,
          flex: '0 0 210px',
          borderRadius: 12,
          background: darkMode ? '#1e2535' : '#edf2ee',
          overflow: 'hidden',
        }}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={post.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', fontSize: 42 }}>{post.image || '📰'}</div>
          )}
        </div>
        <div className="naija-post-copy" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 9, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              background: (cat?.color || G.green) + '20',
              color: cat?.color || G.green,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '.7px',
              padding: '4px 9px',
              borderRadius: 5,
            }}>{post.category?.toUpperCase()}</span>
            {post.breaking && <span style={{ background: G.red, color: '#fff', fontSize: 9, fontWeight: 800, padding: '4px 8px', borderRadius: 4 }}>BREAKING</span>}
            {post.hot && <span style={{ background: G.gold, color: '#171717', fontSize: 9, fontWeight: 800, padding: '4px 8px', borderRadius: 4 }}>🔥 HOT</span>}
            {post.sponsored && <span style={{ background: '#a855f722', color: '#a855f7', fontSize: 9, fontWeight: 800, padding: '4px 8px', borderRadius: 4 }}>SPONSORED</span>}
          </div>
          <h2 className="naija-post-title" style={{
            fontSize: 22,
            fontWeight: 800,
            color: text,
            lineHeight: 1.25,
            margin: '0 0 8px',
            fontFamily: 'Georgia,serif',
            letterSpacing: '-.45px',
          }}>{post.title}</h2>
          {post.excerpt && <p className="naija-post-excerpt" style={{
            fontSize: 13,
            color: muted,
            lineHeight: 1.55,
            margin: '0 0 12px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
          }}>{post.excerpt}</p>}
          <div className="naija-post-meta" style={{ display: 'flex', gap: 13, fontSize: 11, color: muted, flexWrap: 'wrap', alignItems: 'center' }}>
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
                background: saved ? G.green : 'transparent',
                color: saved ? '#fff' : muted,
                border: `1px solid ${saved ? G.green : border}`,
                borderRadius: 7,
                padding: '5px 10px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >🔖 {saved ? 'Saved' : 'Save'}</button>
          </div>
        </div>
      </article>
    </Link>
  );
}
