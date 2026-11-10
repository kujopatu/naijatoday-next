'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '../ThemeProvider';

type ArticleMetric = {
  id: string;
  title: string;
  category: string | null;
  views: number | null;
  upvotes: number | null;
  comments: number | null;
  published: boolean;
  created_at: string;
};

type Range = '7' | '30' | '90' | 'all';

const number = (value: number) => new Intl.NumberFormat('en-NG').format(value);

export default function NewsroomAnalytics() {
  const { card, border, text, muted, darkMode } = useTheme();
  const [articles, setArticles] = useState<ArticleMetric[]>([]);
  const [range, setRange] = useState<Range>('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('posts')
      .select('id,title,category,views,upvotes,comments,published,created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (queryError) {
      setError(queryError.message);
      setArticles([]);
    } else {
      setArticles((data ?? []) as ArticleMetric[]);
      setUpdatedAt(new Date().toLocaleString());
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (range === 'all') return articles;
    const cutoff = Date.now() - Number(range) * 24 * 60 * 60 * 1000;
    return articles.filter((article) => new Date(article.created_at).getTime() >= cutoff);
  }, [articles, range]);

  const totals = useMemo(() => ({
    views: filtered.reduce((sum, article) => sum + (Number(article.views) || 0), 0),
    upvotes: filtered.reduce((sum, article) => sum + (Number(article.upvotes) || 0), 0),
    comments: filtered.reduce((sum, article) => sum + (Number(article.comments) || 0), 0),
    published: filtered.length,
  }), [filtered]);

  const topArticles = useMemo(() => [...filtered]
    .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
    .slice(0, 10), [filtered]);

  const categories = useMemo(() => {
    const grouped = new Map<string, { articles: number; views: number; upvotes: number }>();
    filtered.forEach((article) => {
      const key = article.category?.trim() || 'Uncategorised';
      const item = grouped.get(key) || { articles: 0, views: 0, upvotes: 0 };
      item.articles += 1;
      item.views += Number(article.views) || 0;
      item.upvotes += Number(article.upvotes) || 0;
      grouped.set(key, item);
    });
    return [...grouped.entries()]
      .map(([category, values]) => ({ category, ...values }))
      .sort((a, b) => b.views - a.views);
  }, [filtered]);

  const panel: React.CSSProperties = {
    background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 14,
  };
  const metricValue: React.CSSProperties = {
    color: text, fontSize: 24, fontWeight: 800, marginTop: 8, lineHeight: 1.1,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ color: text, fontSize: 17, fontWeight: 800 }}>📊 Newsroom Analytics</div>
          <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>Article performance using the view and engagement counters stored on your posts.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={range} onChange={(event) => setRange(event.target.value as Range)} style={{ background: card, color: text, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 11px' }}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All published articles</option>
          </select>
          <button onClick={() => void load()} disabled={loading} style={{ background: 'transparent', color: text, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 12px', cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Loading…' : '↻ Refresh'}</button>
        </div>
      </div>

      {error && <div style={{ ...panel, color: '#dc2626', marginBottom: 14 }}>Could not load newsroom metrics: {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 10, marginBottom: 18 }}>
        {[
          ['Published articles', totals.published],
          ['Recorded views', totals.views],
          ['Upvotes', totals.upvotes],
          ['Comments', totals.comments],
        ].map(([label, value]) => (
          <div key={label} style={panel}>
            <div style={{ color: muted, fontSize: 11, fontWeight: 650 }}>{label}</div>
            <div style={metricValue}>{loading ? '—' : number(Number(value))}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
        <section style={panel}>
          <div style={{ color: text, fontWeight: 750, fontSize: 14, marginBottom: 12 }}>🏆 Most-read articles</div>
          {loading ? <div style={{ color: muted, fontSize: 12 }}>Loading articles…</div> : topArticles.length === 0 ? <div style={{ color: muted, fontSize: 12 }}>No published articles in this period.</div> : topArticles.map((article, index) => (
            <div key={article.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderTop: `1px solid ${border}` }}>
              <div style={{ color: muted, fontSize: 12, fontWeight: 800, minWidth: 20 }}>{index + 1}.</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: text, fontSize: 12, fontWeight: 650, lineHeight: 1.45 }}>{article.title}</div>
                <div style={{ color: muted, fontSize: 10, marginTop: 4 }}>{article.category || 'Uncategorised'}</div>
              </div>
              <div style={{ color: text, fontSize: 12, fontWeight: 750, whiteSpace: 'nowrap' }}>{number(Number(article.views) || 0)} views</div>
            </div>
          ))}
        </section>

        <section style={panel}>
          <div style={{ color: text, fontWeight: 750, fontSize: 14, marginBottom: 12 }}>🗂️ Category performance</div>
          {loading ? <div style={{ color: muted, fontSize: 12 }}>Loading categories…</div> : categories.length === 0 ? <div style={{ color: muted, fontSize: 12 }}>No category data available.</div> : categories.map((item) => {
            const maxViews = Math.max(...categories.map((category) => category.views), 1);
            const width = Math.round((item.views / maxViews) * 100);
            return (
              <div key={item.category} style={{ padding: '9px 0', borderTop: `1px solid ${border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: text, fontSize: 11, marginBottom: 6 }}>
                  <strong>{item.category}</strong>
                  <span style={{ color: muted }}>{number(item.views)} views · {item.articles} articles</span>
                </div>
                <div style={{ height: 7, background: darkMode ? '#252b36' : '#e8edf0', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${width}%`, height: '100%', background: '#16834a', borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <div style={{ color: muted, fontSize: 10, marginTop: 12 }}>
        {loading ? 'Updating metrics…' : `Last refreshed: ${updatedAt}. Date filters group articles by publication date; view totals are the current stored counters, not views recorded only within that date range.`}
      </div>
    </div>
  );
}
