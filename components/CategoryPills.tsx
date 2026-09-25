'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATEGORIES, G } from '@/lib/theme';
import { categorySlug } from '@/lib/posts';
import { useTheme } from './ThemeProvider';

export default function CategoryPills() {
  const { darkMode, border, muted } = useTheme();
  const pathname = usePathname();
  const activeCategorySlug = pathname?.startsWith('/category/') ? pathname.split('/')[2] : null;

  return (
    <div style={{ background: darkMode ? '#111520' : '#fff', borderBottom: `1px solid ${border}`, position: 'relative' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 6, padding: '8px 16px', flexWrap: 'wrap' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span
            style={{
              display: 'inline-block',
              background: !activeCategorySlug ? G.green : 'none',
              color: !activeCategorySlug ? '#fff' : muted,
              border: `1px solid ${!activeCategorySlug ? G.green : border}`,
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: 12,
              whiteSpace: 'nowrap',
              fontWeight: !activeCategorySlug ? 600 : 400,
            }}
          >
            🌐 All
          </span>
        </Link>
        {CATEGORIES.map((cat) => {
          const slug = categorySlug(cat.name);
          const active = activeCategorySlug === slug;
          return (
            <Link key={cat.name} href={`/category/${slug}`} style={{ textDecoration: 'none' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: active ? G.green : 'none',
                  color: active ? '#fff' : muted,
                  border: `1px solid ${active ? G.green : border}`,
                  padding: '5px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {cat.icon} {cat.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
