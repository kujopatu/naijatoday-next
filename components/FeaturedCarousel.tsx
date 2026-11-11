'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Post } from '@/lib/supabase';
import { postPath } from '@/lib/posts';
import { findCategory, G } from '@/lib/theme';
import { cloudinaryTransform } from '@/lib/cloudinary';
import { useTheme } from './ThemeProvider';

export default function FeaturedCarousel({ posts }: { posts: Post[] }) {
  const { card, border } = useTheme();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const goNext = useCallback(() => {
    setIdx((current) => (current + 1) % posts.length);
  }, [posts.length]);

  const goPrevious = () => {
    setIdx((current) => (current - 1 + posts.length) % posts.length);
  };

  useEffect(() => {
    if (posts.length < 2 || paused) return;
    const timer = window.setInterval(goNext, 6500);
    return () => window.clearInterval(timer);
  }, [goNext, paused, posts.length]);

  if (posts.length === 0) return null;
  const activeIdx = idx % posts.length;
  const post = posts[activeIdx];
  const cat = findCategory(post.category);
  const image = cloudinaryTransform(post.image, { width: 1200, height: 650 });

  return (
    <section
      aria-label="Lead stories"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
      style={{ marginBottom: 20 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ color: G.green, fontSize: 10, fontWeight: 800, letterSpacing: '1.8px' }}>NIGERIA IN FOCUS</div>
          <h1 style={{ margin: '3px 0 0', fontSize: 21, lineHeight: 1.2, fontFamily: 'Georgia,serif' }}>Top Stories</h1>
        </div>
        <span style={{ color: '#888', fontSize: 11 }}>Auto-updates every 6.5 seconds</span>
      </div>

      <div
        className="naija-featured-card"
        style={{ background: card, borderRadius: 12, overflow: 'hidden', border: `1px solid ${border}` }}
      >
        <Link href={postPath(post)} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div
            className="naija-featured-hero"
            style={{
              height: 245,
              background: `linear-gradient(135deg, ${G.greenDark}, #1a3a2a)`,
              position: 'relative',
              cursor: 'pointer',
            }}
          >
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.94), rgba(0,0,0,0.02) 75%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 20px' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ background: G.green, color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '1px', padding: '4px 8px', borderRadius: 3 }}>LEAD STORY</span>
                {post.breaking && <span style={{ background: G.red, color: '#fff', fontSize: 9, fontWeight: 800, padding: '4px 7px', borderRadius: 3 }}>BREAKING</span>}
                {post.hot && <span style={{ background: G.gold, color: '#000', fontSize: 9, fontWeight: 800, padding: '4px 7px', borderRadius: 3 }}>🔥 HOT</span>}
                <span style={{ background: cat?.color || G.red, color: '#fff', fontSize: 9, fontWeight: 700, padding: '4px 7px', borderRadius: 3 }}>{post.category?.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: 6, fontFamily: 'Georgia,serif' }}>{post.title}</div>
              <div className="naija-featured-excerpt" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, maxWidth: 760, lineHeight: 1.45, marginBottom: 8 }}>{post.excerpt?.slice(0, 145)}{post.excerpt && post.excerpt.length > 145 ? '…' : ''}</div>
              <div style={{ display: 'flex', gap: 13, fontSize: 11, color: 'rgba(255,255,255,0.75)', flexWrap: 'wrap' }}>
                <span>✍️ {post.author || 'NaijaToday Desk'}</span>
                <span>⏱ {post.read_time || '3 min'}</span>
                <span>👁 {(post.views || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </Link>

        {posts.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 12px', background: card }}>
            <button type="button" aria-label="Previous lead story" onClick={goPrevious} style={controlStyle}>←</button>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              {posts.map((item, i) => (
                <button key={item.id} type="button" aria-label={`Show lead story ${i + 1}`} aria-current={i === activeIdx ? 'true' : undefined} onClick={() => setIdx(i)} style={{ width: i === activeIdx ? 22 : 7, height: 7, borderRadius: 5, background: i === activeIdx ? G.green : border, border: 'none', cursor: 'pointer', transition: 'all .25s', padding: 0 }} />
              ))}
            </div>
            <button type="button" aria-label="Next lead story" onClick={goNext} style={controlStyle}>→</button>
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 600px) {
          .naija-featured-hero { height: 245px !important; }
          .naija-featured-excerpt { display: none; }
        }
      `}</style>
    </section>
  );
}

const controlStyle: React.CSSProperties = {
  border: '1px solid #d5d9df',
  borderRadius: 6,
  background: 'transparent',
  color: 'inherit',
  width: 30,
  height: 27,
  fontSize: 16,
  cursor: 'pointer',
  lineHeight: 1,
};
