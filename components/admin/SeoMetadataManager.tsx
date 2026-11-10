'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '../ThemeProvider';
import { useToast } from '../ToastProvider';

type SeoPost = {
  id: string;
  title: string;
  excerpt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published: boolean;
  created_at: string;
};

export default function SeoMetadataManager() {
  const { card, border, text, muted, darkMode } = useTheme();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<SeoPost[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'missing' | 'complete'>('all');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('id,title,excerpt,seo_title,seo_description,published,created_at')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) showToast('Could not load SEO records: ' + error.message);
    else setPosts((data ?? []) as SeoPost[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const selected = posts.find((post) => post.id === selectedId);
  const missingCount = posts.filter((post) => !post.seo_title?.trim() || !post.seo_description?.trim()).length;
  const visiblePosts = posts.filter((post) => {
    if (filter === 'missing') return !post.seo_title?.trim() || !post.seo_description?.trim();
    if (filter === 'complete') return !!post.seo_title?.trim() && !!post.seo_description?.trim();
    return true;
  });

  const choosePost = (id: string) => {
    setSelectedId(id);
    const post = posts.find((item) => item.id === id);
    setSeoTitle(post?.seo_title ?? '');
    setSeoDescription(post?.seo_description ?? '');
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from('posts').update({
      seo_title: seoTitle.trim() || null,
      seo_description: seoDescription.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id);
    if (error) showToast('SEO update failed: ' + error.message);
    else {
      showToast('SEO metadata saved successfully.');
      setPosts((items) => items.map((item) => item.id === selected.id
        ? { ...item, seo_title: seoTitle.trim() || null, seo_description: seoDescription.trim() || null }
        : item));
    }
    setSaving(false);
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${border}`, background: darkMode ? '#111520' : '#f5f7fa',
    color: text, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 700, color: text, marginBottom: 5 }}>🔎 Article SEO Metadata</div>
      <div style={{ fontSize: 12, color: muted, marginBottom: 16 }}>
        Set search and social-sharing titles and descriptions. Blank fields automatically use the article headline and excerpt.
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 14px', color: text, fontSize: 13 }}>
          **{posts.length}** articles
        </div>
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 14px', color: missingCount ? '#d97706' : '#16a34a', fontSize: 13 }}>
          {missingCount} missing custom SEO fields
        </div>
        <button onClick={() => void load()} style={{ marginLeft: 'auto', border: `1px solid ${border}`, borderRadius: 8, background: 'transparent', color: text, padding: '8px 12px', cursor: 'pointer' }}>↻ Refresh</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(260px, 1.5fr)', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {(['all', 'missing', 'complete'] as const).map((value) => (
              <button key={value} onClick={() => setFilter(value)} style={{
                border: `1px solid ${filter === value ? '#16834a' : border}`,
                background: filter === value ? '#16834a' : 'transparent',
                color: filter === value ? '#fff' : muted, borderRadius: 7, padding: '6px 9px', fontSize: 11, cursor: 'pointer',
              }}>{value === 'all' ? 'All' : value === 'missing' ? 'Needs SEO' : 'Complete'}</button>
            ))}
          </div>
          <div style={{ maxHeight: 440, overflowY: 'auto', border: `1px solid ${border}`, borderRadius: 8 }}>
            {loading ? <div style={{ padding: 18, color: muted }}>Loading articles…</div> : visiblePosts.map((post) => (
              <button key={post.id} onClick={() => choosePost(post.id)} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: 11,
                border: 0, borderBottom: `1px solid ${border}`,
                background: selectedId === post.id ? (darkMode ? '#1b3428' : '#eaf6ef') : 'transparent',
                color: text, cursor: 'pointer',
              }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 650, lineHeight: 1.4 }}>{post.title}</span>
                <span style={{ display: 'block', color: muted, fontSize: 10, marginTop: 4 }}>
                  {post.published ? 'Published' : 'Draft'} · {post.seo_title?.trim() && post.seo_description?.trim() ? 'SEO complete' : 'SEO incomplete'}
                </span>
              </button>
            ))}
            {!loading && visiblePosts.length === 0 && <div style={{ padding: 18, color: muted, fontSize: 12 }}>No articles in this filter.</div>}
          </div>
        </div>
        <div>
          {!selected ? (
            <div style={{ border: `1px dashed ${border}`, borderRadius: 8, padding: 28, color: muted, textAlign: 'center', fontSize: 13 }}>Select an article to edit its SEO metadata.</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>ARTICLE HEADLINE</div>
              <div style={{ fontSize: 14, color: text, fontWeight: 700, marginBottom: 16 }}>{selected.title}</div>
              <label style={{ display: 'block', color: text, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>SEO title <span style={{ color: muted, fontWeight: 400 }}>({seoTitle.length}/60)</span></label>
              <input value={seoTitle} maxLength={70} onChange={(event) => setSeoTitle(event.target.value)} placeholder={selected.title} style={{ ...fieldStyle, marginBottom: 5 }} />
              <div style={{ fontSize: 11, color: muted, marginBottom: 14 }}>Recommended: around 50–60 characters. Leave blank to use the article headline.</div>
              <label style={{ display: 'block', color: text, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>SEO description <span style={{ color: muted, fontWeight: 400 }}>({seoDescription.length}/160)</span></label>
              <textarea value={seoDescription} maxLength={180} rows={4} onChange={(event) => setSeoDescription(event.target.value)} placeholder={selected.excerpt || 'Write a concise summary for search results…'} style={{ ...fieldStyle, resize: 'vertical', marginBottom: 5 }} />
              <div style={{ fontSize: 11, color: muted, marginBottom: 16 }}>Recommended: around 140–160 characters. Leave blank to use the article excerpt.</div>
              <div style={{ background: darkMode ? '#111520' : '#f5f7fa', border: `1px solid ${border}`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div style={{ color: '#16834a', fontSize: 11, marginBottom: 4 }}>naijatodayblog.com.ng</div>
                <div style={{ color: text, fontSize: 14, fontWeight: 650 }}>{seoTitle.trim() || selected.title}</div>
                <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>{seoDescription.trim() || selected.excerpt || 'Article summary will appear here.'}</div>
              </div>
              <button onClick={() => void save()} disabled={saving} style={{ width: '100%', border: 0, borderRadius: 8, background: '#16834a', color: '#fff', padding: 12, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? .7 : 1 }}>
                {saving ? 'Saving…' : 'Save SEO Metadata'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
