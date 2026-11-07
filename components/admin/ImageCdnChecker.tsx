'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import { Intro, Row } from './ToolShared';

type P = { id: string; title: string; image: string | null };

// Posts whose cover image is still hosted on Supabase storage instead of Cloudinary.
export default function ImageCdnChecker() {
  const { text, muted } = useTheme();
  const [posts, setPosts] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('posts')
      .select('id, title, image')
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        if (data) setPosts((data as P[]).filter((p) => (p.image || '').startsWith('http') && p.image!.includes('supabase.co') && !p.image!.includes('cloudinary')));
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ color: muted, fontSize: 13 }}>Loading…</div>;
  return (
    <div>
      <Intro>Posts still using Supabase-hosted image URLs instead of Cloudinary (this matters for your storage bandwidth).</Intro>
      {posts.length === 0 && <div style={{ fontSize: 13, color: G.green }}>✅ All post images are on Cloudinary (or use emoji placeholders).</div>}
      {posts.map((p) => (
        <Row key={p.id}>
          <div style={{ fontSize: 13, color: text, fontWeight: 600 }}>{p.title}</div>
          <div style={{ fontSize: 11, color: muted, marginTop: 4, wordBreak: 'break-all' }}>{p.image}</div>
        </Row>
      ))}
    </div>
  );
}
