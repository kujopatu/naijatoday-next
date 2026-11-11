'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from './ThemeProvider';

export default function SearchBox() {
  const { darkMode, border, text, muted } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [focused, setFocused] = useState(false);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim();
    if (q.length > 1) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form
      onSubmit={submitSearch}
      role="search"
      aria-label="Search NaijaToday"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        width: '100%',
        padding: 3,
        borderRadius: 26,
        border: `1px solid ${focused ? '#008751' : border}`,
        background: darkMode ? '#111520' : '#f7fbf9',
        boxShadow: focused ? '0 0 0 3px rgba(0,135,81,.10)' : 'none',
        transition: 'border-color .18s ease, box-shadow .18s ease',
        boxSizing: 'border-box',
      }}
    >
      <span aria-hidden="true" style={{ paddingLeft: 10, color: muted, fontSize: 15, lineHeight: 1 }}>⌕</span>
      <input
        type="search"
        aria-label="Search Nigerian news and topics"
        placeholder="Search news, topics and stories…"
        value={query}
        minLength={2}
        maxLength={100}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '8px 4px',
          border: 'none',
          background: 'transparent',
          color: text,
          fontSize: 12,
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
          padding: '8px 14px',
          borderRadius: 22,
          border: 'none',
          background: query.trim().length >= 2 ? '#008751' : (darkMode ? '#26332d' : '#dce9e1'),
          color: query.trim().length >= 2 ? '#fff' : (darkMode ? '#819187' : '#718078'),
          fontSize: 11,
          fontWeight: 800,
          cursor: query.trim().length >= 2 ? 'pointer' : 'not-allowed',
          transition: 'background .18s ease',
        }}
      >
        Search
      </button>
    </form>
  );
}
