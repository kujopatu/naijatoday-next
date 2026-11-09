'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { G } from '@/lib/theme';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import SearchBox from './SearchBox';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';

const NAV_TABS: [string, string][] = [
  ['/', '🏠 Home'],
  ['/trending', '🔥 Trending'],
  ['/forum', '💬 Forum'],
  ['/jobs', '💼 Jobs & Scholarships'],
  ['/resources', '📚 Resources'],
  ['/scores', '⚽ Fixtures & Scores'],
  ['/saved', '🔖 Saved'],
  ['/about', 'ℹ️ About'],
  ['/submit-story', '📝 Submit a Story'],
  ['/advertise', '📣 Advertise'],
  ['/contact', '📩 Contact'],
];

export default function SiteHeader({
  articleCount,
  memberCount,
}: {
  articleCount: number;
  memberCount: number | null;
}) {
  const { darkMode, toggleDarkMode, border, muted } = useTheme();
  const { canModerate, loggedIn } = useAuth();
  const pathname = usePathname();

  const navItems = [
    ...NAV_TABS,
    ...(loggedIn ? ([['/profile', '👤 Profile']] as [string, string][]) : []),
    ...(canModerate ? ([['/admin', '⚡ Admin']] as [string, string][]) : []),
  ];

  return (
    <header
      style={{
        background: darkMode
          ? 'linear-gradient(135deg,#0a0e17 0%,#0d1520 100%)'
          : 'linear-gradient(135deg,#ffffff 0%,#f0f7f4 100%)',
        borderBottom: `2px solid ${G.green}`,
        position: 'sticky',
        top: 0,
        zIndex: 200,
        boxShadow: darkMode ? '0 4px 24px rgba(0,135,81,0.15)' : '0 2px 16px rgba(0,135,81,0.1)',
      }}
    >
      <div style={{ height: 2, background: `linear-gradient(90deg, ${G.green}, transparent)`, width: '100%' }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" aria-label="NaijaToday home" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, textDecoration: 'none', borderLeft: `3px solid ${G.green}`, paddingLeft: 10 }}>
            <span>
              <span style={{ display: 'block', fontSize: 24, fontWeight: 900, color: G.green, letterSpacing: '-0.5px', lineHeight: 1 }}>NaijaToday</span>
              <span style={{ display: 'block', fontSize: 9, color: '#a0aab8', letterSpacing: 2.2, textTransform: 'uppercase', marginTop: 4 }}>Nigeria&apos;s Digital Media</span>
            </span>
          </Link>

          <div aria-label="Site statistics" style={{ display: 'flex', alignItems: 'center', gap: 14, background: darkMode ? 'rgba(0,135,81,0.06)' : 'rgba(0,135,81,0.05)', border: `1px solid ${darkMode ? 'rgba(0,135,81,0.18)' : 'rgba(0,135,81,0.15)'}`, borderRadius: 8, padding: '6px 10px' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: darkMode ? '#c8e8d8' : '#1a4a30' }}>{articleCount.toLocaleString()}</div>
              <div style={{ fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Articles</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: darkMode ? '#c8e8d8' : '#1a4a30' }}>{memberCount !== null ? memberCount.toLocaleString() : '—'}</div>
              <div style={{ fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Members</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#00a85a', fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>
              <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: '#00c96a' }} /> LIVE
            </span>
          </div>

          <div style={{ flex: 1, maxWidth: 320, minWidth: 180 }}>
            <Suspense fallback={<div style={{ height: 40 }} />}>
              <SearchBox />
            </Suspense>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ background: 'none', border: `1px solid ${border}`, cursor: 'pointer', fontSize: 16, padding: '6px 9px', borderRadius: 8, color: muted }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>

        <nav aria-label="Main navigation" className="naija-main-nav">
          {navItems.map(([href, label]) => {
            const active = pathname === href || (href !== '/' && !!pathname?.startsWith(href + '/'));
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined} style={{ textDecoration: 'none', flexShrink: 0 }}>
                <span style={{
                  display: 'inline-block',
                  padding: '10px 13px',
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  color: active ? G.green : muted,
                  background: active ? (darkMode ? 'rgba(0,135,81,0.12)' : 'rgba(0,135,81,0.07)') : 'transparent',
                  borderBottom: active ? `2px solid ${G.green}` : '2px solid transparent',
                  whiteSpace: 'nowrap',
                  borderRadius: '6px 6px 0 0',
                }}>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <style>{`
        .naija-main-nav { display:flex; gap:2px; overflow-x:auto; overscroll-behavior-x:contain; scrollbar-width:thin; scrollbar-color:${G.green} transparent; }
        .naija-main-nav a:focus-visible { outline:2px solid ${G.green}; outline-offset:-2px; border-radius:6px; }
      `}</style>
    </header>
  );
}
