'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import { Intro, Row } from './ToolShared';

type P = { id: string; title: string; excerpt: string | null; category: string | null; created_at: string };
const STALE_DAYS = 60;
const TIME_SENSITIVE = /₦|exchange rate|deadline|price of|as of \d{4}|fuel price|data plan|salary|dollar rate/i;

export default function StaleContentReport() {
  const { text, muted } = useTheme();
  const [posts, setPosts] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('posts')
      .select('id, title, excerpt, category, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (data) setPosts(data as P[]);
        setLoading(false);
      });
  }, []);

  const stale = useMemo(() => {
    const now = Date.now();
    return posts
      .map((p) => ({ ...p, ageDays: Math.floor((now - new Date(p.created_at).getTime()) / 86400000), sensitive: TIME_SENSITIVE.test(`${p.title} ${p.excerpt || ''}`) }))
      .filter((p) => p.ageDays > STALE_DAYS)
      .sort((a, b) => Number(b.sensitive) - Number(a.sensitive) || b.ageDays - a.ageDays);
  }, [posts]);

  if (loading) return <div style={{ color: muted, fontSize: 13 }}>Loading…</div>;
  return (
    <div>
      <Intro>Articles older than {STALE_DAYS} days. ⏱️ marks ones that mention prices, rates or deadlines, so check those numbers are still right. Those are listed first.</Intro>
      {stale.length === 0 && <div style={{ fontSize: 13, color: G.green }}>✅ No stale content yet.</div>}
      {stale.slice(0, 100).map((p) => (
        <Row key={p.id}>
          <div style={{ fontSize: 13, color: text, fontWeight: 600 }}>{p.sensitive ? '⏱️ ' : ''}{p.title}</div>
          <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>
            {p.category} · {p.ageDays} days old{p.sensitive ? ' · mentions prices/rates/deadlines, so verify it is still accurate' : ''}
          </div>
        </Row>
      ))}
      {stale.length > 100 && <div style={{ fontSize: 11, color: muted }}>Showing the first 100 of {stale.length}.</div>}
    </div>
  );
}
