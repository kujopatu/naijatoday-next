'use client';

import { useState } from 'react';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import ActivityLogPanel from './ActivityLogPanel';
import AdStatsImporter from './AdStatsImporter';
import BannedUsersPanel from './BannedUsersPanel';
import DuplicateTitleChecker from './DuplicateTitleChecker';
import ExpiredDeadlinesReport from './ExpiredDeadlinesReport';
import ImageCdnChecker from './ImageCdnChecker';
import SeoChecklist from './SeoChecklist';
import SeoMetadataManager from './SeoMetadataManager';
import EditorialDesk from './EditorialDesk';
import StaleContentReport from './StaleContentReport';

type SubTab = 'editorial' | 'seoMetadata' | 'seo' | 'duplicates' | 'stale' | 'images' | 'deadlines' | 'bans' | 'activity' | 'ads';

const SUB_TABS: [SubTab, string][] = [
  ['editorial', '🗞️ Editorial Desk'],
  ['seoMetadata', '🔎 SEO Metadata'],
  ['seo', '📝 SEO Checklist'],
  ['duplicates', '🔍 Duplicate Titles'],
  ['stale', '🕰️ Stale Content'],
  ['images', '🖼️ Image/CDN'],
  ['deadlines', '⏰ Expired Deadlines'],
  ['bans', '🚫 Banned Users'],
  ['activity', '📜 Activity Log'],
  ['ads', '🔌 Analytics & Ads'],
];

export default function AdminToolsHub() {
  const { card, border, text, muted } = useTheme();
  const [subTab, setSubTab] = useState<SubTab>('seo');

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 6, fontFamily: 'Georgia,serif' }}>🛠️ Admin Tools</div>
      <div style={{ fontSize: 12, color: muted, marginBottom: 16 }}>Content quality, housekeeping and moderation utilities.</div>

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
              padding: '9px 16px',
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
        {subTab === 'editorial' && <EditorialDesk />}
        {subTab === 'seoMetadata' && <SeoMetadataManager />}
        {subTab === 'seo' && <SeoChecklist />}
        {subTab === 'duplicates' && <DuplicateTitleChecker />}
        {subTab === 'stale' && <StaleContentReport />}
        {subTab === 'images' && <ImageCdnChecker />}
        {subTab === 'deadlines' && <ExpiredDeadlinesReport />}
        {subTab === 'bans' && <BannedUsersPanel />}
        {subTab === 'activity' && <ActivityLogPanel />}
        {subTab === 'ads' && <AdStatsImporter />}
      </div>
    </div>
  );
}
