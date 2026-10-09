'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';

type PostTitle = { id: string; title: string };

// Same word-overlap similarity logic as the original: strips punctuation,
// drops short words, and scores by the fraction of shared words relative
// to the smaller title.
function normalizeTitle(t: string): string[] {
  return (t || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3);
}
function titleSimilarity(a: string, b: string): number {
  const wa = new Set(normalizeTitle(a));
  const wb = new Set(normalizeTitle(b));
  if (wa.size === 0 || wb.size === 0) return 0;
  let overlap = 0;
  wa.forEach((w) => {
    if (wb.has(w)) overlap++;
  });
  return overlap / Math.min(wa.size, wb.size);
}

export default function DuplicateTitleChecker() {
  const { card, border, text, muted, darkMode } = useTheme();
  const [posts, setPosts] = useState<PostTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('posts').select('id, title').order('created_at', { ascending: false }).limit(1000);
        if (!error && data) setPosts(data as PostTitle[]);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const matches = useMemo(() => {
    if (candidate.trim().length <= 8) return [];
    return posts
      .map((p) => ({ post: p, sim: titleSimilarity(candidate, p.title) }))
      .filter((m) => m.sim >= 0.5)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 5);
  }, [candidate, posts]);

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: darkMode ? '#111520' : '#f5f7fa',
    color: text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Georgia,serif',
  };

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 6, fontFamily: 'Georgia,serif' }}>🔍 Duplicate Title Checker</div>
      <div style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
        Type a headline you&apos;re considering — checked against your {loading ? '…' : posts.length} existing articles for close matches before you publish.
      </div>

      <input
        value={candidate}
        onChange={(e) => setCandidate(e.target.value)}
        placeholder="Type a candidate headline…"
        style={{ ...inp, marginBottom: 16 }}
      />

      {candidate.trim().length > 0 && candidate.trim().length <= 8 && (
        <div style={{ fontSize: 12, color: muted }}>Keep typing — need at least 9 characters to check.</div>
      )}

      {candidate.trim().length > 8 && (
        <div>
          {matches.length === 0 ? (
            <div style={{ fontSize: 13, color: G.green }}>✅ No close matches found — this title looks original.</div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: G.gold, fontWeight: 600, marginBottom: 10 }}>⚠️ {matches.length} similar title{matches.length !== 1 ? 's' : ''} found:</div>
              {matches.map(({ post, sim }) => (
                <div key={post.id} style={{ background: card, border: `1px solid ${G.gold}`, borderRadius: 8, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13, color: text }}>{post.title}</div>
                  <div style={{ fontSize: 11, color: G.gold, fontWeight: 700, flexShrink: 0 }}>{Math.round(sim * 100)}% match</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
