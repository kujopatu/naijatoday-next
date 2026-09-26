'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from './ThemeProvider';

export default function SearchBox() {
  const { darkMode, border, text } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  const submitSearch = () => {
    const q = query.trim();
    if (q.length > 1) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <input
      placeholder="🔍  Search Nigerian news, topics…"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submitSearch();
      }}
      style={{
        width: '100%',
        padding: '10px 16px',
        borderRadius: 24,
        border: `1.5px solid ${border}`,
        background: darkMode ? '#111520' : '#f7fbf9',
        color: text,
        fontSize: 13,
        outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  );
}
