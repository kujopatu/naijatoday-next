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
  const supportingPosts = posts.slice(1);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const goNext = useCallback(() => {
    if (supportingPosts.length > 0) setIdx((current) => (current + 1) % supportingPosts.length);
  }, [supportingPosts.length]);

  const goPrevious = () => {
    if (supportingPosts.length > 0) setIdx((current) => (current - 1 + supportingPosts.length) % supportingPosts.length);
  };

  useEffect(() => {
    if (supportingPosts.length < 2 || paused) return;
    const timer = window.setInterval(goNext, 6500);
    return () => window.clearInterval(timer);
  }, [goNext, paused, supportingPosts.length]);

  if (posts.length === 0) return null;

  const lead = posts[0];
  const leadCategory = findCategory(lead.category);
  const leadImage = cloudinaryTransform(lead.image, { width: 1100, height: 760 });
  const activeIdx = supportingPosts.length ? idx % supportingPosts.length : 0;
  const secondary = supportingPosts[activeIdx];
  const secondaryCategory = secondary ? findCategory(secondary.category) : null;
  const secondaryImage = secondary ? cloudinaryTransform(secondary.image, { width: 700, height: 420 }) : null;

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
      <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ color: G.green, fontSize: 10, fontWeight: 800, letterSpacing: '1.8px' }}>NIGERIA IN FOCUS</div>
          <h1 style={{ margin: '3px 0 0', fontSize: 21, lineHeight: 1.2, fontFamily: 'Georgia,serif' }}>Top Stories</h1>
        </div>
        {supportingPosts.length > 1 && <span style={{ color: '#888', fontSize: 11 }}>More headlines update every 6.5 seconds</span>}
      </div>

      <div className="naija-split-lead">
        <article className="naija-lead-primary" style={{ background: card, borderRadius: 12, overflow: 'hidden', border: `1px solid ${border}`, minWidth: 0 }}>
          <Link href={postPath(lead)} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div className="naija-lead-image" style={{ height: 330, background: `linear-gradient(135deg, ${G.greenDark}, #1a3a2a)`, position: 'relative' }}>
              {leadImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={leadImage} alt={lead.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.94), rgba(0,0,0,0.02) 78%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 18px' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 9, flexWrap: 'wrap' }}>
                  <span style={tagStyle(G.green)}>LEAD STORY</span>
                  {lead.breaking && <span style={tagStyle(G.red)}>BREAKING</span>}
                  {lead.hot && <span style={tagStyle(G.gold, '#000')}>🔥 HOT</span>}
                  <span style={tagStyle(leadCategory?.color || G.red)}>{lead.category?.toUpperCase()}</span>
                </div>
                <h2 style={{ fontSize: 25, fontWeight: 800, color: '#fff', lineHeight: 1.2, margin: '0 0 8px', fontFamily: 'Georgia,serif' }}>{lead.title}</h2>
                {lead.excerpt && <p className="naija-lead-excerpt" style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12, maxWidth: 720, lineHeight: 1.5, margin: '0 0 9px' }}>{lead.excerpt.slice(0, 165)}{lead.excerpt.length > 165 ? '…' : ''}</p>}
                <div style={{ display: 'flex', gap: 13, fontSize: 11, color: 'rgba(255,255,255,0.78)', flexWrap: 'wrap' }}>
                  <span>✍️ {lead.author || 'NaijaToday Desk'}</span>
                  <span>⏱ {lead.read_time || '3 min'}</span>
                  <span>👁 {(lead.views || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </Link>
        </article>

        {secondary && (
          <aside className="naija-lead-secondary" aria-label="More top stories" style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', minWidth: 0 }}>
            <div style={{ padding: '13px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.3px', color: G.green }}>MORE TOP STORIES</div>
              <span style={{ color: '#888', fontSize: 10, whiteSpace: 'nowrap' }}>{activeIdx + 1} / {supportingPosts.length}</span>
            </div>
            <Link href={postPath(secondary)} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
              <div className="naija-secondary-image" style={{ height: 164, position: 'relative', background: `linear-gradient(135deg, ${G.greenDark}, #1a3a2a)` }}>
                {secondaryImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={secondaryImage} alt={secondary.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                )}
                {secondary.breaking && <span style={{ position: 'absolute', top: 10, left: 10, ...tagStyle(G.red) }}>BREAKING</span>}
              </div>
              <div style={{ padding: '13px 14px 14px' }}>
                <div style={{ color: secondaryCategory?.color || G.green, fontSize: 9, fontWeight: 800, letterSpacing: '.8px', marginBottom: 7 }}>{secondary.category?.toUpperCase()}</div>
                <h3 style={{ fontSize: 17, lineHeight: 1.3, fontWeight: 800, margin: '0 0 8px', fontFamily: 'Georgia,serif' }}>{secondary.title}</h3>
                {secondary.excerpt && <p style={{ color: '#888', fontSize: 11, lineHeight: 1.45, margin: 0 }}>{secondary.excerpt.slice(0, 105)}{secondary.excerpt.length > 105 ? '…' : ''}</p>}
              </div>
            </Link>
            {supportingPosts.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderTop: `1px solid ${border}` }}>
                <button type="button" aria-label="Previous supporting story" onClick={goPrevious} style={controlStyle}>←</button>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                  {supportingPosts.map((item, i) => (
                    <button key={item.id} type="button" aria-label={`Show supporting story ${i + 1}`} aria-current={i === activeIdx ? 'true' : undefined} onClick={() => setIdx(i)} style={{ width: i === activeIdx ? 20 : 7, height: 7, borderRadius: 5, background: i === activeIdx ? G.green : border, border: 'none', cursor: 'pointer', transition: 'all .25s', padding: 0 }} />
                  ))}
                </div>
                <button type="button" aria-label="Next supporting story" onClick={goNext} style={controlStyle}>→</button>
              </div>
            )}
          </aside>
        )}
      </div>
      <style>{`
        .naija-split-lead { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(260px, .85fr); gap: 14px; align-items: stretch; }
        .naija-lead-primary, .naija-lead-secondary { height: 100%; }
        .naija-lead-secondary { display: flex; flex-direction: column; }
        .naija-lead-secondary > a { flex: 1; }
        @media (max-width: 760px) {
          .naija-split-lead { grid-template-columns: 1fr; gap: 12px; }
          .naija-lead-image { height: 300px !important; }
          .naija-secondary-image { height: 175px !important; }
        }
        @media (max-width: 480px) {
          .naija-lead-image { height: 265px !important; }
          .naija-lead-excerpt { display: none; }
        }
      `}</style>
    </section>
  );
}

function tagStyle(background: string, color = '#fff'): React.CSSProperties {
  return { background, color, fontSize: 9, fontWeight: 800, letterSpacing: '.7px', padding: '4px 7px', borderRadius: 3 };
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
