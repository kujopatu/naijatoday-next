'use client';

import Link from 'next/link';
import { useTheme } from './ThemeProvider';

export default function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  const { muted, text } = useTheme();
  return (
    <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: muted, marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <Link href="/" style={{ color: muted, textDecoration: 'none' }}>🏠 Home</Link>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', minWidth: 0 }}>
          <span aria-hidden>›</span>
          {it.href ? (
            <Link href={it.href} style={{ color: muted, textDecoration: 'none' }}>{it.label}</Link>
          ) : (
            <span style={{ color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
