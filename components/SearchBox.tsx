'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from './ThemeProvider';

export default function SearchBox() {
  const { darkMode, border, text } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim();
    if (q.length > 1) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form onSubmit={submitSearch} role="search" aria-label="Search NaijaToday" style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
      <input
        type="search"
        aria-label="Search Nigerian news and topics"
        placeholder="Search Nigerian news, topics…"
        value={query}
        minLength={2}
        maxLength={100}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '10px 14px',
          borderRadius: 24,
          border: `1.5px solid ${border}`,
          background: darkMode ? '#111520' : '#f7fbf9',
          color: text,
          fontSize: 13,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <button
        type="submit"
        disabled={query.trim().length < 2}
        aria-label="Submit search"
        style={{
          flexShrink: 0,
          padding: '10px 15px',
          borderRadius: 22,
          border: 'none',
          background: query.trim().length >= 2 ? '#008751' : (darkMode ? '#26332d' : '#dce9e1'),
          color: query.trim().length >= 2 ? '#fff' : (darkMode ? '#819187' : '#718078'),
          fontSize: 12,
          fontWeight: 800,
          cursor: query.trim().length >= 2 ? 'pointer' : 'not-allowed',
        }}
      >
        Search
      </button>
    </form>
  );
}
