'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { CATEGORIES, G } from '@/lib/theme';
import { categorySlug } from '@/lib/posts';
import SearchBox from './SearchBox';
import { useTheme } from './ThemeProvider';

const DISCOVERY_CATEGORIES = [
  'Politics',
  'Business',
  'Economy',
  'Entertainment',
  'Sports',
  'Technology',
  'Education',
];

export default function HomeDiscovery() {
  const { card, border, muted, text, darkMode } = useTheme();
  const categories = DISCOVERY_CATEGORIES
    .map((name) => CATEGORIES.find((category) => category.name === name))
    .filter((category): category is (typeof CATEGORIES)[number] => Boolean(category));

  return (
    <section
      aria-label="Search and explore news"
      style={{
        margin: '0 0 22px',
        padding: '16px 17px',
        border: `1px solid ${border}`,
        borderRadius: 13,
        background: card,
        boxShadow: darkMode ? 'none' : '0 5px 18px rgba(20,50,35,.045)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 31, height: 31, borderRadius: 9, background: darkMode ? 'rgba(0,135,81,.18)' : '#eaf5ee', fontSize: 16 }}>🔎</span>
        <div>
          <div style={{ color: text, fontSize: 15, fontWeight: 800, fontFamily: 'Georgia,serif' }}>Find the stories that matter</div>
          <div style={{ color: muted, fontSize: 11, marginTop: 2 }}>Search headlines, people and topics across NaijaToday</div>
        </div>
      </div>
      <Suspense fallback={<div style={{ height: 42, borderRadius: 24, background: darkMode ? '#111520' : '#f3f7f4' }} />}>
        <SearchBox />
      </Suspense>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
        <span style={{ color: muted, fontSize: 10, fontWeight: 800, letterSpacing: '.7px', marginRight: 2 }}>EXPLORE</span>
        {categories.map((category) => (
          <Link
            key={category.name}
            href={`/category/${categorySlug(category.name)}`}
            style={{
              textDecoration: 'none',
              color: darkMode ? '#c9dfd2' : '#315b42',
              background: darkMode ? 'rgba(0,135,81,.12)' : '#f1f7f3',
              border: `1px solid ${darkMode ? 'rgba(0,135,81,.25)' : '#dfebe2'}`,
              borderRadius: 18,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {category.icon} {category.name}
          </Link>
        ))}
      </div>
      <style>{`
        @media (max-width: 600px) {
          .home-discovery-placeholder { display: none; }
        }
      `}</style>
    </section>
  );
}
