'use client';

import Link from 'next/link';
import { G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

export default function NotFoundView() {
  const { text, muted, border } = useTheme();
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '70px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 64 }}>🔍</div>
      <h1 style={{ fontSize: 28, fontFamily: 'Georgia,serif', margin: '12px 0 8px', color: text }}>Page not found</h1>
      <p style={{ color: muted, lineHeight: 1.7, marginBottom: 24 }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Try the homepage, or search for the story.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" style={{ background: G.green, color: '#fff', padding: '11px 24px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>🏠 Go Home</Link>
        <Link href="/trending" style={{ border: `1px solid ${G.green}`, color: G.green, padding: '11px 24px', borderRadius: 8, fontWeight: 600, textDecoration: 'none' }}>🔥 Trending</Link>
        <Link href="/search" style={{ border: `1px solid ${border}`, color: text, padding: '11px 24px', borderRadius: 8, fontWeight: 600, textDecoration: 'none' }}>🔎 Search</Link>
      </div>
    </div>
  );
}
