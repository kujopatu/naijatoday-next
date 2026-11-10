'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import { useToast } from '../ToastProvider';

type EditorialPost = {
  id: string;
  title: string;
  excerpt: string | null;
  category: string;
  author: string | null;
  published: boolean | null;
  created_at: string;
  updated_at?: string | null;
};

type Filter = 'all' | 'drafts' | 'published';

export default function EditorialDesk() {
  const { card, border, text, muted } = useTheme();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<EditorialPost[]>([]);
  const [filter, setFilter] = useState<Filter>('drafts');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('id,title,excerpt,category,author,published,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) showToast('Could not load editorial queue: ' + error.message);
    else setPosts((data || []) as EditorialPost[]);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { void loadPosts(); }, [loadPosts]);

  const counts = useMemo(() => ({
    all: posts.length,
    drafts: posts.filter((p) => p.published === false).length,
    published: posts.filter((p) => p.published !== false).length,
  }), [posts]);

  const visiblePosts = useMemo(
    () => posts.filter((p) => filter === 'all' || (filter === 'drafts' ? p.published === false : p.published !== false)),
    [posts, filter],
  );

  const setPublished = async (post: EditorialPost, published: boolean) => {
    setBusyId(post.id);
    const { error } = await supabase.from('posts')
      .update({ published, updated_at: new Date().toISOString() })
      .eq('id', post.id);
    if (error) showToast('Update failed: ' + error.message);
    else {
      showToast(published ? 'Article published successfully.' : 'Article moved to drafts.');
      await loadPosts();
    }
    setBusyId(null);
  };

  const filterButton = (key: Filter, label: string, count: number) => (
    <button key={key} onClick={() => setFilter(key)} style={{
      border: `1px solid ${filter === key ? G.green : border}`,
      background: filter === key ? G.green : 'transparent',
      color: filter === key ? '#fff' : muted,
      borderRadius: 8, padding: '8px 14px', fontSize: 13,
      fontWeight: filter === key ? 700 : 500, cursor: 'pointer',
    }}>{label} ({count})</button>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ color: text, fontSize: 17, fontWeight: 700, fontFamily: 'Georgia,serif' }}>🗞️ Editorial Desk</div>
          <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>Review unpublished stories and control what appears on NaijaToday.</div>
        </div>
        <button onClick={() => void loadPosts()} style={{ border: `1px solid ${border}`, background: 'transparent', color: muted, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>↻ Refresh queue</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {filterButton('drafts', '📝 Drafts', counts.drafts)}
        {filterButton('published', '✅ Published', counts.published)}
        {filterButton('all', 'All articles', counts.all)}
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: muted }}>Loading editorial queue…</div>
      ) : visiblePosts.length === 0 ? (
        <div style={{ padding: 36, textAlign: 'center', color: muted, background: card, border: `1px dashed ${border}`, borderRadius: 10 }}>
          {filter === 'drafts' ? 'No draft articles are waiting for review.' : 'No articles in this view.'}
        </div>
      ) : visiblePosts.map((post) => (
        <div key={post.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: 14, marginBottom: 9, background: card, border: `1px solid ${border}`, borderRadius: 10 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
              <span style={{ color: G.green, background: G.green + '18', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{post.category}</span>
              <span style={{ color: post.published === false ? G.gold : G.green, fontSize: 10, fontWeight: 700 }}>{post.published === false ? 'DRAFT' : 'PUBLISHED'}</span>
            </div>
            <div style={{ color: text, fontWeight: 700, fontSize: 14, lineHeight: 1.45 }}>{post.title}</div>
            {post.excerpt && <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>{post.excerpt}</div>}
            <div style={{ color: muted, fontSize: 11, marginTop: 6 }}>By {post.author || 'NaijaToday Desk'} · {new Date(post.updated_at || post.created_at).toLocaleDateString('en-NG')}</div>
          </div>
          <button disabled={busyId === post.id} onClick={() => void setPublished(post, post.published === false)} style={{
            border: `1px solid ${post.published === false ? G.green : border}`,
            background: post.published === false ? G.green : 'transparent',
            color: post.published === false ? '#fff' : muted,
            borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 700,
            cursor: busyId === post.id ? 'wait' : 'pointer', opacity: busyId === post.id ? 0.65 : 1,
          }}>{busyId === post.id ? 'Saving…' : post.published === false ? 'Publish article' : 'Move to drafts'}</button>
        </div>
      ))}
    </div>
  );
}
