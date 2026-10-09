'use client';

import { useState } from 'react';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import BannedUsersPanel from './BannedUsersPanel';
import ActivityLogPanel from './ActivityLogPanel';
import DuplicateTitleChecker from './DuplicateTitleChecker';

type SubTab = 'duplicates' | 'bans' | 'activity';

const SUB_TABS: [SubTab, string][] = [
  ['duplicates', '🔍 Duplicate Titles'],
  ['bans', '🚫 Banned Users'],
  ['activity', '📜 Activity Log'],
];

export default function AdminToolsHub() {
  const { card, border, text, muted } = useTheme();
  const [subTab, setSubTab] = useState<SubTab>('duplicates');

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 16, fontFamily: 'Georgia,serif' }}>🛠️ Admin Tools</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {SUB_TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            style={{
              background: subTab === key ? G.green : 'none',
              color: subTab === key ? '#fff' : muted,
              border: `1px solid ${subTab === key ? G.green : border}`,
              borderRadius: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: subTab === key ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20 }}>
        {subTab === 'duplicates' && <DuplicateTitleChecker />}
        {subTab === 'bans' && <BannedUsersPanel />}
        {subTab === 'activity' && <ActivityLogPanel />}
      </div>

      <div style={{ fontSize: 12, color: muted, marginTop: 16, lineHeight: 1.6 }}>
        🚧 <b>Still to come in this tab:</b> SEO checklist, stale-content report, image/CDN checker, expired-deadlines report, and the Monetag ad-stats importer.
      </div>
    </div>
  );
}
