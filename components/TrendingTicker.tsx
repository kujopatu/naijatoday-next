'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from './ThemeProvider';

type Topic = { id: number; topic: string; volume: string; status: string };

const FALLBACK_TOPICS: Topic[] = [
  { id: 1, topic: '#TinubuAddress', volume: '142K', status: 'approved' },
  { id: 2, topic: 'ASUU Strike', volume: '98K', status: 'approved' },
  { id: 3, topic: '#NairaNow', volume: '87K', status: 'approved' },
  { id: 4, topic: 'Super Eagles', volume: '76K', status: 'approved' },
  { id: 5, topic: 'CBN Policy', volume: '54K', status: 'approved' },
];

export default function TrendingTicker() {
  const { darkMode, border, card, text, muted } = useTheme();
  const [topics, setTopics] = useState<Topic[]>(FALLBACK_TOPICS);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('trends')
          .select('id,topic,volume,status')
          .eq('status', 'approved')
          .order('id', { ascending: true })
          .limit(20);
        if (!error && data && data.length > 0) setTopics(data as Topic[]);
      } catch {}
    })();
  }, []);

  if (topics.length === 0) return null;
  const items = [...topics, ...topics];

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 16,
        background: card,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 12px',
          borderBottom: `1px solid ${border}`,
          background: darkMode ? '#1a2035' : '#f8f9fa',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            background: '#D85A30',
            color: '#fff',
            padding: '2px 7px',
            borderRadius: 4,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Trending
        </span>
        <span style={{ fontSize: 14 }}>🇳🇬</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: text }}>Nigeria right now</span>
        <span style={{ fontSize: 10, color: muted, marginLeft: 'auto' }}>Widget · Google Trends</span>
      </div>
      <div style={{ overflow: 'hidden', height: 40, display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            animation: 'naija-ticker-scroll 28s linear infinite',
            willChange: 'transform',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            alignItems: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = 'paused')}
          onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = 'running')}
        >
          {items.map((t, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 24px',
                borderRight: `1px solid ${border}`,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#D85A30' }}>
                #{(i % topics.length) + 1}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: text }}>{t.topic}</span>
              <span style={{ fontSize: 11, color: muted }}>{t.volume}</span>
            </span>
          ))}
        </div>
      </div>
      <style>{`@keyframes naija-ticker-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}
