'use client';

import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { text, muted } = useTheme();
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '90px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 56 }}>⚠️</div>
      <h1 style={{ fontSize: 26, fontFamily: 'Georgia,serif', margin: '12px 0 8px', color: text }}>Something went wrong</h1>
      <p style={{ color: muted, lineHeight: 1.7, marginBottom: 24 }}>We hit a problem loading this page. It&apos;s usually temporary — try again.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={reset} style={{ background: '#008751', color: '#fff', border: 'none', padding: '11px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Try again</button>
        <Link href="/" style={{ border: '1px solid #008751', color: '#008751', padding: '11px 24px', borderRadius: 8, fontWeight: 600, textDecoration: 'none' }}>Go Home</Link>
      </div>
    </div>
  );
}
