'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Fixture } from '@/lib/fixtures';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';

const STATUS_COLORS: Record<string, string> = { upcoming: '#CC9900', live: '#e74c3c', finished: G.green };

// Top five active fixtures from Admin → Fixtures, linking to the full /scores page.
export default function FixturesSidebar() {
  const { card, border, text, muted } = useTheme();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);

  useEffect(() => {
    supabase
      .from('fixtures')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .limit(5)
      .then(({ data, error }) => {
        if (!error && data) setFixtures(data as Fixture[]);
      });
  }, []);

  if (fixtures.length === 0) return null;

  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '10px 14px', background: G.green, fontSize: 13, fontWeight: 800, color: '#fff' }}>⚽ Fixtures &amp; Scores</div>
      {fixtures.map((f) => (
        <div key={f.id} style={{ padding: '10px 14px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: text, flex: 1 }}>{f.home_team}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: text, padding: '0 8px' }}>
              {f.home_score ?? '-'} : {f.away_score ?? '-'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: text, flex: 1, textAlign: 'right' }}>{f.away_team}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <div style={{ fontSize: 11, color: muted }}>{f.kickoff_display}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLORS[f.status] || muted, textTransform: 'uppercase' }}>● {f.status}</div>
          </div>
        </div>
      ))}
      <Link href="/scores" style={{ display: 'block', textAlign: 'center', color: G.green, padding: 12, fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>
        View All Scores &amp; Leagues →
      </Link>
    </div>
  );
}
