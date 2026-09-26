'use client';

import { Product } from '@/lib/products';
import { G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

export default function ResourcesGrid({ products }: { products: Product[] }) {
  const { muted } = useTheme();

  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: muted }}>
        No resources published yet — check back soon.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
      {products.map((p) => (
        <ResourceCard key={p.id} product={p} />
      ))}
    </div>
  );
}

function ResourceCard({ product: p }: { product: Product }) {
  const { card, border, text, muted, darkMode } = useTheme();

  return (
    <div
      style={{
        background: card,
        border: `1px solid ${border}`,
        borderRadius: 14,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {p.cover_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.cover_image} alt={p.title} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
      ) : (
        <div
          style={{
            width: '100%',
            height: 200,
            background: darkMode ? '#1a1f2b' : '#eef1f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 48,
          }}
        >
          📄
        </div>
      )}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {p.category && (
          <div style={{ fontSize: 11, color: G.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            {p.category}
          </div>
        )}
        <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 6, lineHeight: 1.3 }}>{p.title}</div>
        <div style={{ fontSize: 12.5, color: muted, marginBottom: 12, lineHeight: 1.5, flex: 1 }}>
          {p.short_description}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: text, marginBottom: 10 }}>
          {p.price_naira ? `₦${p.price_naira.toLocaleString()}` : ''}
          {p.price_usd ? ` / $${p.price_usd}` : ''}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {p.selar_link && (
            <a
              href={p.selar_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                textAlign: 'center',
                background: G.green,
                color: '#fff',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Buy on Selar
            </a>
          )}
          {p.gumroad_link && (
            <a
              href={p.gumroad_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                textAlign: 'center',
                background: 'none',
                border: `1px solid ${border}`,
                color: text,
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Gumroad
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
