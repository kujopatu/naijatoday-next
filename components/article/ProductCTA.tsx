'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/products';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';

const CATEGORY_MAP: Record<string, string[]> = {
  Business: ['Business Templates', 'Funding & Grants', 'Business Registration'],
  Politics: ['Business Registration'],
  Technology: ['Business Templates'],
};

// "Recommended Resource" box: picks a product that suits the article's
// category (falls back to the first active product) and links to /resources.
export default function ProductCTA({ category }: { category: string | null }) {
  const { card, border, text, muted } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setProducts((data ?? []) as Product[]));
  }, []);

  if (products.length === 0) return null;
  const preferred = CATEGORY_MAP[category ?? ''] ?? [];
  const match = products.find((p) => p.category && preferred.includes(p.category)) ?? products[0];

  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: 18, margin: '28px 0', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      {match.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={match.cover_image} alt={match.title} style={{ width: 70, height: 96, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 11, color: G.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Recommended Resource</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 4 }}>{match.title}</div>
        <div style={{ fontSize: 12.5, color: muted }}>{match.short_description}</div>
      </div>
      <Link href="/resources" style={{ background: G.green, color: '#fff', borderRadius: 8, padding: '12px 22px', fontSize: 13, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap', textDecoration: 'none' }}>
        {match.price_naira ? `Get it — ₦${match.price_naira.toLocaleString()}` : 'View Resource'}
      </Link>
    </div>
  );
}
