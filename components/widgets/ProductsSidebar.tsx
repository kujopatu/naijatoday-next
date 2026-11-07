'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/products';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';

// Rotating "Our Resources" card fed by the active products in Admin → Products.
export default function ProductsSidebar() {
  const { darkMode: D, card, border, text, muted } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setProducts(data as Product[]);
      });
  }, []);

  useEffect(() => {
    if (products.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % products.length), 8000);
    return () => clearInterval(t);
  }, [products.length]);

  if (products.length === 0) return null;
  const p = products[idx % products.length];

  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '8px 12px', background: D ? 'rgba(0,135,81,0.08)' : 'rgba(0,135,81,0.06)', fontSize: 11, fontWeight: 700, color: G.green, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Our Resources
      </div>
      {p.cover_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.cover_image} alt={p.title} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: 140, background: D ? '#1a1f2b' : '#eef1f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>📄</div>
      )}
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: text, marginBottom: 6, lineHeight: 1.3 }}>{p.title}</div>
        <div style={{ fontSize: 12, color: muted, marginBottom: 10, lineHeight: 1.4 }}>{p.short_description}</div>
        {p.price_naira ? <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 10 }}>₦{p.price_naira.toLocaleString()}</div> : null}
        <Link href="/resources" style={{ display: 'block', textAlign: 'center', background: G.green, color: '#fff', borderRadius: 8, padding: '9px 12px', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>
          View All Resources →
        </Link>
      </div>
    </div>
  );
}
