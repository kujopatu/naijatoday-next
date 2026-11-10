'use client';

import { useState } from 'react';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import ActivityLogPanel from './ActivityLogPanel';
import AdStatsImporter from './AdStatsImporter';
import AdvertisingManager from './AdvertisingManager';
import BannedUsersPanel from './BannedUsersPanel';
import DuplicateTitleChecker from './DuplicateTitleChecker';
import ExpiredDeadlinesReport from './ExpiredDeadlinesReport';
import ImageCdnChecker from './ImageCdnChecker';
import SeoChecklist from './SeoChecklist';
import SeoMetadataManager from './SeoMetadataManager';
import EditorialDesk from './EditorialDesk';
import MediaLibrary from './MediaLibrary';
import StaleContentReport from './StaleContentReport';
import SystemHealthPanel from './SystemHealthPanel';
import NewsroomAnalytics from './NewsroomAnalytics';

type SubTab = 'editorial' | 'seoMetadata' | 'seo' | 'duplicates' | 'stale' | 'images' | 'deadlines' | 'bans' | 'activity' | 'ads' | 'media' | 'system' | 'newsroom';

const SUB_TABS: [SubTab, string][] = [
  ['editorial', '🗞️ Editorial Desk'],
  ['newsroom', '📊 Newsroom Analytics'],
  ['media', '🖼️ Media Library'],
  ['seoMetadata', '🔎 SEO Metadata'],
  ['seo', '📝 SEO Checklist'],
  ['duplicates', '🔍 Duplicate Titles'],
  ['stale', '🕰️ Stale Content'],
  ['images', '🖼️ Image/CDN'],
  ['deadlines', '⏰ Expired Deadlines'],
  ['bans', '🚫 Banned Users'],
  ['activity', '📜 Activity Log'],
  ['ads', '🔌 Analytics & Ads'],
  ['system', '🛡️ System Health'],
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
        {subTab === 'newsroom' && <NewsroomAnalytics />}
        {subTab === 'media' && <MediaLibrary />}
        {subTab === 'seoMetadata' && <SeoMetadataManager />}
        {subTab === 'seo' && <SeoChecklist />}
        {subTab === 'duplicates' && <DuplicateTitleChecker />}
        {subTab === 'stale' && <StaleContentReport />}
        {subTab === 'images' && <ImageCdnChecker />}
        {subTab === 'deadlines' && <ExpiredDeadlinesReport />}
        {subTab === 'bans' && <BannedUsersPanel />}
        {subTab === 'activity' && <ActivityLogPanel />}
        {subTab === 'system' && <SystemHealthPanel />}
        {subTab === 'ads' && (
          <div style={{ display: 'grid', gap: 22 }}>
            <AdvertisingManager />
            <div style={{ borderTop: `1px solid ${border}`, paddingTop: 20 }}>
              <AdStatsImporter />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
