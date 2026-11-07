'use client';

import { useMemo, useState } from 'react';
import { useTheme } from '../ThemeProvider';
import { Intro, useInputStyle } from './ToolShared';

// Basic pre-publish SEO checks on text you paste in (no need to pick a post).
export default function SeoChecklist() {
  const { card, border, text, muted } = useTheme();
  const inp = useInputStyle();
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');

  const result = useMemo(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const hasHeading = /#{2,3}\s/.test(content) || /<h[23][\s>]/i.test(content);
    const checks = [
      { label: 'Title length (40–65 chars ideal for search)', pass: title.length >= 40 && title.length <= 65, detail: `${title.length} chars` },
      { label: 'Meta/excerpt length (120–160 chars ideal)', pass: excerpt.length >= 120 && excerpt.length <= 160, detail: `${excerpt.length} chars` },
      { label: 'Article body ≥ 800 words', pass: words >= 800, detail: `${words} words` },
      { label: 'Has at least one subheading', pass: hasHeading, detail: hasHeading ? 'found' : 'none found' },
      { label: "Title doesn't end with stray punctuation", pass: !/[,;:]$/.test(title.trim()), detail: title.trim().slice(-1) || '—' },
    ];
    return { checks, score: checks.filter((c) => c.pass).length };
  }, [title, excerpt, content]);

  return (
    <div>
      <Intro>Paste a title, excerpt and article body (or the text you&apos;re about to publish) to check it against basic SEO best practice before you hit publish.</Intro>
      <input style={inp} placeholder="Article title…" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input style={inp} placeholder="Meta description / excerpt…" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
      <textarea style={{ ...inp, minHeight: 120, resize: 'vertical' }} placeholder="Article body…" value={content} onChange={(e) => setContent(e.target.value)} />
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 16, marginTop: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 12 }}>Score: {result.score}/{result.checks.length}</div>
        {result.checks.map((c, i) => (
          <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < result.checks.length - 1 ? `1px solid ${border}` : 'none' }}>
            <span style={{ fontSize: 13, color: text }}>{c.pass ? '✅' : '⚠️'} {c.label}</span>
            <span style={{ fontSize: 12, color: muted, whiteSpace: 'nowrap' }}>{c.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
