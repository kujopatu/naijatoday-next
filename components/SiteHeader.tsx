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

const PRIMARY_NAV: [string, string][] = [
  ['/', 'Home'],
  ['/trending', 'Trending'],
  ['/polls', 'Polls'],
  ['/forum', 'Forum'],
  ['/jobs', 'Jobs & Scholarships'],
  ['/resources', 'Resources'],
  ['/scores', 'Fixtures & Scores'],
];

const MORE_NAV: [string, string][] = [
  ['/saved', 'Saved articles'],
  ['/about', 'About NaijaToday'],
  ['/submit-story', 'Submit a Story'],
  ['/advertise', 'Advertise with us'],
  ['/contact', 'Contact'],
];

export default function SiteHeader({
  articleCount,
  memberCount,
}: {
  articleCount: number;
  memberCount: number | null;
}) {
  const { darkMode, toggleDarkMode, border, muted } = useTheme();
  const { isAdmin, loggedIn } = useAuth();
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && !!pathname?.startsWith(href + '/'));

  const linkStyle = (active: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 40,
    padding: '9px 12px',
    color: active ? G.green : muted,
    background: active ? (darkMode ? 'rgba(0,135,81,0.14)' : 'rgba(0,135,81,0.08)') : 'transparent',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: active ? 800 : 600,
    whiteSpace: 'nowrap' as const,
    textDecoration: 'none',
  });

  return (
    <header
      style={{
        background: darkMode
          ? 'linear-gradient(135deg,#0a0e17 0%,#0d1520 100%)'
          : 'linear-gradient(135deg,#ffffff 0%,#f7faf8 100%)',
        borderBottom: `2px solid ${G.green}`,
        position: 'sticky',
        top: 0,
        zIndex: 200,
        boxShadow: darkMode ? '0 4px 24px rgba(0,135,81,0.15)' : '0 2px 16px rgba(0,135,81,0.08)',
      }}
    >
      <div style={{ height: 2, background: `linear-gradient(90deg, ${G.green}, #e4b84c, transparent)`, width: '100%' }} />
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 18px' }}>
        <div className="naija-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0 9px', gap: 14 }}>
          <Link href="/" aria-label="NaijaToday home" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, textDecoration: 'none', borderLeft: `3px solid ${G.green}`, paddingLeft: 11 }}>
            <span>
              <span style={{ display: 'block', fontSize: 25, fontWeight: 900, color: G.green, letterSpacing: '-0.8px', lineHeight: 1 }}>NaijaToday</span>
              <span style={{ display: 'block', fontSize: 9, color: '#929e97', letterSpacing: 2, textTransform: 'uppercase', marginTop: 5 }}>Nigeria&apos;s Digital Media</span>
            </span>
          </Link>

          <div className="naija-header-stats" aria-label="Site statistics" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '5px 11px', borderRadius: 9, background: darkMode ? 'rgba(0,135,81,0.08)' : '#f0f7f3', border: `1px solid ${darkMode ? 'rgba(0,135,81,0.2)' : '#e0eee5'}` }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: darkMode ? '#c8e8d8' : '#1a4a30' }}>{articleCount.toLocaleString()}</div>
              <div style={{ fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Articles</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: darkMode ? '#c8e8d8' : '#1a4a30' }}>{memberCount !== null ? memberCount.toLocaleString() : '—'}</div>
              <div style={{ fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Members</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#00a85a', fontSize: 9, fontWeight: 900, letterSpacing: 0.8 }}>
              <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: '#00c96a' }} /> LIVE
            </span>
          </div>

          <div className="naija-header-search" style={{ flex: 1, maxWidth: 340, minWidth: 160 }}>
            <Suspense fallback={<div style={{ height: 40 }} />}>
              <SearchBox />
            </Suspense>
          </div>

          <div className="naija-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {isAdmin && (
              <Link href="/admin" className="naija-admin-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: G.green, color: '#fff', fontSize: 12, fontWeight: 800, textDecoration: 'none', boxShadow: '0 3px 10px rgba(0,135,81,.2)' }}>
                ⚙ Admin
              </Link>
            )}
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ background: 'none', border: `1px solid ${border}`, cursor: 'pointer', fontSize: 16, padding: '6px 8px', borderRadius: 8, color: muted }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>

        <nav aria-label="Main navigation" className="naija-main-nav">
          {PRIMARY_NAV.map(([href, label]) => {
            const active = isActive(href);
            return <Link key={href} href={href} aria-current={active ? 'page' : undefined} style={linkStyle(active)}>{label}</Link>;
          })}
          <details className="naija-more-menu">
            <summary aria-label="More navigation links">More <span aria-hidden="true">▾</span></summary>
            <div className="naija-more-panel">
              {MORE_NAV.map(([href, label]) => (
                <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} style={linkStyle(isActive(href))}>{label}</Link>
              ))}
              {loggedIn && <Link href="/profile" aria-current={isActive('/profile') ? 'page' : undefined} style={linkStyle(isActive('/profile'))}>My profile</Link>}
              {isAdmin && <Link href="/admin" aria-current={isActive('/admin') ? 'page' : undefined} style={linkStyle(isActive('/admin'))}>Admin dashboard</Link>}
            </div>
          </details>
        </nav>
      </div>
      <style>{`
        .naija-main-nav { display:flex; align-items:center; gap:5px; padding:3px 0 8px; flex-wrap:wrap; }
        .naija-main-nav > a:hover, .naija-more-panel a:hover { background:${darkMode ? 'rgba(0,135,81,.16)' : '#edf6f0'} !important; color:${G.green} !important; }
        .naija-more-menu { position:relative; }
        .naija-more-menu summary { display:inline-flex; align-items:center; gap:7px; min-height:40px; padding:9px 12px; border-radius:8px; color:${muted}; font-size:12px; font-weight:700; cursor:pointer; list-style:none; }
        .naija-more-menu summary::-webkit-details-marker { display:none; }
        .naija-more-menu[open] summary { color:${G.green}; background:${darkMode ? 'rgba(0,135,81,.14)' : '#edf6f0'}; }
        .naija-more-panel { position:absolute; top:calc(100% + 7px); left:0; z-index:300; display:flex; flex-direction:column; min-width:205px; padding:7px; border:1px solid ${border}; border-radius:11px; background:${darkMode ? '#101a24' : '#fff'}; box-shadow:0 14px 35px rgba(0,0,0,.16); }
        .naija-more-panel a { width:100%; }
        .naija-main-nav a:focus-visible, .naija-more-menu summary:focus-visible { outline:2px solid ${G.green}; outline-offset:2px; }
        @media (max-width: 900px) {
          .naija-header-stats { display:none !important; }
          .naija-header-search { max-width:260px !important; }
        }
        @media (max-width: 680px) {
          .naija-header-row { flex-wrap:wrap !important; gap:9px !important; padding:9px 0 !important; }
          .naija-header-search { order:3; flex:1 1 100% !important; max-width:none !important; min-width:100% !important; }
          .naija-header-actions { margin-left:auto; }
          .naija-admin-link { padding:7px 9px !important; font-size:11px !important; }
          .naija-main-nav { gap:3px; padding:2px 0 8px; }
          .naija-main-nav > a, .naija-more-menu summary { min-height:36px; padding:8px 9px; font-size:11px; }
          .naija-more-panel { left:auto; right:0; }
        }
      `}</style>
    </header>
  );
}
