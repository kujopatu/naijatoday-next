'use client';

import { Fixture } from '@/lib/fixtures';
import { G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

const STATUS_COLORS: Record<string, string> = { upcoming: '#CC9900', live: '#e74c3c', finished: G.green };

function FixtureRow({ f, text, muted, border }: { f: Fixture; text: string; muted: string; border: string }) {
  return (
    <div style={{ padding: '10px 14px', borderBottom: `1px solid ${border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: text, flex: 1 }}>{f.home_team}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: text, padding: '0 8px' }}>
          {f.home_score ?? '-'} : {f.away_score ?? '-'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: text, flex: 1, textAlign: 'right' }}>{f.away_team}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={{ fontSize: 11, color: muted }}>{f.kickoff_display}</div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: STATUS_COLORS[f.status] || muted,
            textTransform: 'uppercase',
          }}
        >
          ● {f.status}
        </div>
      </div>
    </div>
  );
}

export default function FixturesList({ fixtures }: { fixtures: Fixture[] }) {
  const { darkMode, card, border, text, muted } = useTheme();

  const grouped: Record<string, Fixture[]> = {};
  for (const f of fixtures) {
    const comp = f.competition || 'Other';
    if (!grouped[comp]) grouped[comp] = [];
    grouped[comp].push(f);
  }
  const competitions = Object.keys(grouped);

  if (competitions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: muted }}>No fixtures published yet — check back soon.</div>
    );
  }

  return (
    <>
      <div className="scores-columns">
        {competitions.map((comp) => (
          <div
            key={comp}
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: 14,
              overflow: 'hidden',
              breakInside: 'avoid',
              marginBottom: 20,
              display: 'inline-block',
              width: '100%',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                background: darkMode ? 'rgba(0,135,81,0.12)' : 'rgba(0,135,81,0.08)',
                fontSize: 15,
                fontWeight: 800,
                color: text,
              }}
            >
              {comp}
            </div>
            <div>
              {grouped[comp].map((f) => (
                <FixtureRow key={f.id} f={f} text={text} muted={muted} border={border} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .scores-columns { column-count: 3; column-gap: 20px; }
        @media (max-width: 1000px) { .scores-columns { column-count: 2; } }
        @media (max-width: 700px) { .scores-columns { column-count: 1; } }
      `}</style>
    </>
  );
}
