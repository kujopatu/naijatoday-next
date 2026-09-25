'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type BreakingItem = { id: string; text: string; link?: string | null; source?: string | null };

export default function BreakingNewsBar() {
  const [items, setItems] = useState<BreakingItem[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('breaking_news')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(5);
        if (!error && data) setItems(data as BreakingItem[]);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;
  const current = items[idx];

  return (
    <div style={{ background: 'linear-gradient(90deg, #c0392b, #e74c3c)', padding: '7px 0' }}>
      <style>{`@keyframes naija-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}`}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            background: '#fff',
            color: '#c0392b',
            fontWeight: 800,
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#c0392b',
              display: 'inline-block',
              animation: 'naija-pulse 1.2s ease-in-out infinite',
            }}
          />
          BREAKING
        </span>
        {current.source && current.source !== 'NaijaToday' && (
          <span
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              textTransform: 'uppercase',
            }}
          >
            {current.source}
          </span>
        )}
        {current.link ? (
          <a
            href={current.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              flex: 1,
            }}
          >
            {current.text}
            <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.8 }}>→</span>
          </a>
        ) : (
          <span
            style={{
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {current.text}
          </span>
        )}
      </div>
    </div>
  );
}
