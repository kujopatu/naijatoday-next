'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CATEGORIES, G } from '@/lib/theme';
import { SITE_URL } from '@/lib/site';
import { useTheme } from '../ThemeProvider';
import { useToast } from '../ToastProvider';

// The sitemap is generated automatically at /sitemap.xml (refreshed hourly),
// so nothing needs uploading — this panel just shows what it covers.
export default function SitemapPanel() {
  const { card, border, text, muted } = useTheme();
  const { showToast } = useToast();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true).then(({ count: c }) => setCount(c ?? 0));
  }, []);

  const staticPages = 11;
  const total = count === null ? null : count + staticPages + CATEGORIES.length;
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  const stat = (n: string | number, l: string) => (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: G.green }}>{n}</div>
      <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{l}</div>
    </div>
  );
  const btn: React.CSSProperties = { background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' };

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 6, fontFamily: 'Georgia,serif' }}>🗺️ Sitemap</div>
      <div style={{ fontSize: 13, color: muted, marginBottom: 16, lineHeight: 1.6 }}>
        Generated automatically from your published articles and refreshed every hour. New articles appear without any action from you.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
        {stat(count ?? '…', 'Articles')}{stat(CATEGORIES.length, 'Category pages')}{stat(staticPages, 'Site pages')}{stat(total ?? '…', 'Total URLs')}
      </div>
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 10 }}>Your sitemap</div>
        <code style={{ display: 'block', fontSize: 13, color: G.green, marginBottom: 14, wordBreak: 'break-all' }}>{sitemapUrl}</code>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" style={btn}>Open sitemap.xml</a>
          <a href="/robots.txt" target="_blank" rel="noopener noreferrer" style={{ ...btn, background: '#2563eb' }}>Open robots.txt</a>
          <button onClick={() => { navigator.clipboard.writeText(sitemapUrl); showToast('Sitemap URL copied'); }} style={{ ...btn, background: 'none', color: muted, border: `1px solid ${border}` }}>Copy URL</button>
        </div>
      </div>
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 10 }}>Submit to Google (once)</div>
        <ol style={{ fontSize: 13, color: muted, lineHeight: 1.9, paddingLeft: 20, margin: 0 }}>
          <li>Open Google Search Console and choose the naijatodayblog.com.ng property.</li>
          <li>Go to <strong>Sitemaps</strong>, enter <code>sitemap.xml</code> and press Submit.</li>
          <li>Google re-reads it on its own after that.</li>
        </ol>
      </div>
    </div>
  );
}
