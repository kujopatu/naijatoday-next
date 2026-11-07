'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Post, supabase } from '@/lib/supabase';
import { findCategory, G } from '@/lib/theme';
import { postPath } from '@/lib/posts';
import { toCloudinaryWm } from '@/lib/watermark';
import { useAuth } from '../AuthProvider';
import { useTheme } from '../ThemeProvider';
import { ADMIN_EMAIL } from '@/lib/auth';
import CommentsSection from '../CommentsSection';
import ReactionBar from '../ReactionBar';
import ArticleActions from './ArticleActions';
import PollWidget from './PollWidget';
import ProductCTA from './ProductCTA';
import ReadingProgressBar from './ReadingProgressBar';

// Same keys as the original app so existing streaks carry over.
function recordReadToday() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const dates: string[] = JSON.parse(localStorage.getItem('naija_streak_dates') || '[]');
    if (!dates.includes(today)) {
      dates.push(today);
      localStorage.setItem('naija_streak_dates', JSON.stringify(dates.slice(-400)));
    }
    localStorage.setItem('naija_streak_last', today);
  } catch {}
}

export default function ArticleView({ post, html, related }: { post: Post; html: string; related: Post[] }) {
  const { card, border, text, muted } = useTheme();
  const { loggedIn, userEmail } = useAuth();

  // Count the view once per mount, update streak, log reading history.
  useEffect(() => {
    supabase.rpc('increment_post_views', { p_id: post.id }).then(() => {});
    recordReadToday();
  }, [post.id]);

  useEffect(() => {
    if (!loggedIn || !userEmail) return;
    supabase.from('reading_history')
      .upsert({ user_email: userEmail, post_id: post.id, read_at: new Date().toISOString() }, { onConflict: 'user_email,post_id' })
      .then(() => {});
  }, [loggedIn, userEmail, post.id]);

  const cat = findCategory(post.category);
  const hero = toCloudinaryWm(post.image, 1200);
  const isEmoji = !!post.image && !post.image.startsWith('http');
  const tags = (post.tags ?? []).filter(Boolean);
  const date = post.created_at ? new Date(post.created_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const isDesk = !post.author || post.author === 'NaijaToday Desk';

  return (
    <>
      <ReadingProgressBar />
      <article style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <Link href={`/category/${(post.category ?? '').toLowerCase().replace(/\s+/g, '-')}`} style={{ background: cat?.color ?? G.green, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textDecoration: 'none' }}>
            {cat?.icon} {post.category}
          </Link>
          {post.hot && <span style={{ background: G.red, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>🔥 HOT</span>}
          {post.sponsored && <span style={{ background: G.gold, color: '#000', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>SPONSORED</span>}
        </div>

        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 32, lineHeight: 1.25, margin: '0 0 12px', color: text }}>{post.title}</h1>
        <div style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
          By <strong>{post.author || 'NaijaToday Desk'}</strong>
          {date && ` · ${date}`}{post.read_time && ` · ${post.read_time}`}{` · 👁 ${post.views ?? 0}`}
        </div>

        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt={post.title} style={{ width: '100%', borderRadius: 12, marginBottom: 20 }} />
        ) : isEmoji ? (
          <div style={{ fontSize: 80, textAlign: 'center', padding: 30, background: card, border: `1px solid ${border}`, borderRadius: 12, marginBottom: 20 }}>{post.image}</div>
        ) : null}

        {post.excerpt && (
          <blockquote style={{ borderLeft: `4px solid ${G.green}`, margin: '0 0 22px', padding: '4px 0 4px 16px', fontSize: 17, fontStyle: 'italic', color: muted }}>{post.excerpt}</blockquote>
        )}

        <div id="article-body" className="article-body" style={{ color: text }} dangerouslySetInnerHTML={{ __html: html }} />

        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '24px 0 0' }}>
            {tags.map((t) => (
              <Link key={t} href={`/search?tag=${encodeURIComponent(t)}`} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: `1px solid ${border}`, color: muted, textDecoration: 'none' }}>#{t}</Link>
            ))}
          </div>
        )}

        <ProductCTA category={post.category} />
        <PollWidget postId={post.id} />
        <ReactionBar postId={post.id} />
        <ArticleActions post={post} />

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: card, border: `1px solid ${border}`, borderRadius: 14, padding: 18, margin: '24px 0' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: G.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
            {(post.author || 'N')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: text }}>{post.author || 'NaijaToday Desk'}</div>
            <div style={{ fontSize: 12.5, color: muted, marginTop: 2 }}>
              {isDesk ? 'The NaijaToday newsroom — Staff Writers based in Lagos, Nigeria.' : 'Staff Writer · NaijaToday'}
            </div>
            <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>📍 Lagos, Nigeria</div>
          </div>
        </div>

        {related.length > 0 && (
          <div style={{ margin: '32px 0' }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Georgia,serif', marginBottom: 12, color: text }}>Related Articles</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {related.map((r) => {
                const img = toCloudinaryWm(r.image, 400);
                return (
                  <Link key={r.id} href={postPath(r)} style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', textDecoration: 'none', color: text }}>
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" style={{ width: '100%', height: 110, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>{r.image || '📰'}</div>
                    )}
                    <div style={{ padding: 12, fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>{r.title}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </article>

      <section style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px 40px' }}>
        <CommentsSection postId={post.id} postTitle={post.title} postAuthorEmail={isDesk ? ADMIN_EMAIL : null} />
      </section>

      <style>{`
        .article-body { font-size: 17px; line-height: 1.8; }
        .article-body p { margin: 0 0 1.1em; }
        .article-body h2, .article-body h3 { font-family: Georgia,serif; margin: 1.6em 0 0.6em; line-height: 1.3; }
        .article-body img { max-width: 100%; height: auto; border-radius: 10px; margin: 1em 0; }
        .article-body a { color: ${G.green}; text-decoration: underline; }
        .article-body ul, .article-body ol { padding-left: 1.4em; margin: 0 0 1.1em; }
        .article-body blockquote { border-left: 4px solid ${G.green}; margin: 1.2em 0; padding-left: 16px; font-style: italic; }
        .article-body iframe, .article-body video { max-width: 100%; }
        .article-body table { width: 100%; border-collapse: collapse; display: block; overflow-x: auto; }
        .article-body td, .article-body th { border: 1px solid rgba(128,128,128,.3); padding: 6px 10px; }
      `}</style>
    </>
  );
}
