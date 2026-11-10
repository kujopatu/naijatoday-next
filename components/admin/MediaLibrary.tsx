'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import { useToast } from '../ToastProvider';

type MediaItem = {
  id: string;
  title: string;
  image: string | null;
  category: string;
  created_at: string;
};

export default function MediaLibrary() {
  const { card, border, text, muted } = useTheme();
  const { showToast } = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const loadMedia = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('id,title,image,category,created_at')
      .not('image', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) showToast('Could not load media library: ' + error.message);
    else setItems(((data || []) as MediaItem[]).filter((item) => /^https?:\/\//i.test(item.image || '')));
    setLoading(false);
  }, [showToast]);

  useEffect(() => { void loadMedia(); }, [loadMedia]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort()], [items]);
  const visible = useMemo(() => items.filter((item) => {
    const matchesCategory = category === 'All' || item.category === category;
    const term = search.trim().toLowerCase();
    return matchesCategory && (!term || item.title.toLowerCase().includes(term) || item.image?.toLowerCase().includes(term));
  }), [items, category, search]);

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Image URL copied.');
    } catch {
      showToast('Could not copy URL. Open the image and copy its address.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ color: text, fontSize: 17, fontWeight: 700, fontFamily: 'Georgia,serif' }}>🖼️ Media Library</div>
          <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>Browse images already attached to NaijaToday articles and copy their hosted URLs.</div>
        </div>
        <button onClick={() => void loadMedia()} style={{ border: `1px solid ${border}`, background: 'transparent', color: muted, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>↻ Refresh library</button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search article or image URL…" style={{ flex: '1 1 220px', minWidth: 180, padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: card, color: text, fontSize: 13 }} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ minWidth: 160, padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, background: card, color: text, fontSize: 13 }}>
          {categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <div style={{ color: muted, fontSize: 12, alignSelf: 'center' }}>{visible.length} of {items.length} images</div>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: muted }}>Loading media library…</div>
      ) : visible.length === 0 ? (
        <div style={{ padding: 36, textAlign: 'center', color: muted, border: `1px dashed ${border}`, borderRadius: 10 }}>No hosted article images match this view.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
          {visible.map((item) => (
            <div key={item.id} style={{ border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', background: card, minWidth: 0 }}>
              <a href={item.image || '#'} target="_blank" rel="noreferrer" title="Open full image">
                <img src={item.image || ''} alt={item.title} loading="lazy" style={{ width: '100%', height: 132, objectFit: 'cover', display: 'block', background: G.green + '12' }} />
              </a>
              <div style={{ padding: 10 }}>
                <div style={{ color: text, fontSize: 12, fontWeight: 700, lineHeight: 1.4, minHeight: 34 }}>{item.title}</div>
                <div style={{ color: muted, fontSize: 10, margin: '5px 0 9px' }}>{item.category} · {new Date(item.created_at).toLocaleDateString('en-NG')}</div>
                <button onClick={() => void copyUrl(item.image || '')} style={{ width: '100%', border: `1px solid ${border}`, background: 'transparent', color: text, borderRadius: 7, padding: '7px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Copy image URL</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
