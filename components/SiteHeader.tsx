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
    <header className="naija-site-header"
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
          <Link href="/" aria-label="NaijaToday home" className="naija-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="NaijaToday — Nigeria's No. 1 Digital Media" />
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
        .naija-main-nav { display:flex; align-items:center; gap:5px; padding:5px 18px 6px; margin:0 -18px; min-height:49px; flex-wrap:wrap; background:#075c37; }
        .naija-main-nav > a:hover, .naija-more-panel a:hover { background:${darkMode ? 'rgba(0,135,81,.16)' : '#edf6f0'} !important; color:${G.green} !important; }
        .naija-more-menu { position:relative; }
        .naija-more-menu summary { display:inline-flex; align-items:center; gap:7px; min-height:40px; padding:9px 12px; border-radius:8px; color:${muted}; font-size:12px; font-weight:700; cursor:pointer; list-style:none; }
        .naija-more-menu summary::-webkit-details-marker { display:none; }
        .naija-more-menu[open] summary { color:${G.green}; background:${darkMode ? 'rgba(0,135,81,.14)' : '#edf6f0'}; }
        .naija-more-panel { position:absolute; top:calc(100% + 7px); left:0; z-index:300; display:flex; flex-direction:column; min-width:210px; padding:7px; border:1px solid ${darkMode ? '#30443a' : '#dce8df'}; border-radius:10px; background:${darkMode ? '#101a24' : '#ffffff'}; box-shadow:0 14px 35px rgba(0,0,0,.18); }
        .naija-more-panel a { width:100%; padding:9px 10px; border-radius:6px; color:${darkMode ? '#e2eee7' : '#254535'} !important; }
        .naija-more-panel a:hover { background:${darkMode ? '#1b3026' : '#edf6f0'} !important; color:#008751 !important; }
        .naija-main-nav a:focus-visible, .naija-more-menu summary:focus-visible { outline:2px solid ${G.green}; outline-offset:2px; }
        @media (max-width: 900px) {
          .naija-header-stats { display:none !important; }
          .naija-header-search { max-width:260px !important; }
        }
        /* Premium NaijaToday masthead and navigation refresh */
        .naija-site-header {
          background: ${darkMode ? "#0d1520" : "#ffffff"} !important;
          border-bottom: 1px solid ${darkMode ? "#26352e" : "#e4ebe6"} !important;
          box-shadow: ${darkMode ? "0 5px 22px rgba(0,0,0,.28)" : "0 5px 22px rgba(18,45,30,.07)"} !important;
        }
        .naija-site-header > div:first-child {
          height: 4px !important;
          background: linear-gradient(90deg, #006b3c 0%, #008751 48%, #e2b64d 100%) !important;
        }
        .naija-site-header .naija-header-row {
          min-height: 108px;
          padding: 10px 0 !important;
          gap: 16px !important;
          border-bottom: 1px solid ${darkMode ? "#26352e" : "#e8eee9"};
        }
        .naija-site-header .naija-brand { display:flex; align-items:center; flex:0 0 auto; line-height:0; }
        .naija-site-header .naija-brand img {
          display:block; width:270px; height:104px; object-fit:contain;
          border:0; border-radius:7px; background:transparent; filter:none;
          box-shadow:0 3px 12px rgba(0,0,0,.12);
        }
        .naija-site-header .naija-header-row > a {
          border-left: 0 !important;
          padding-left: 0 !important;
        }
        .naija-site-header .naija-header-stats {
          padding:8px 12px !important; gap:14px !important;
          border-radius:10px !important;
          background:${darkMode ? "#111f28" : "#f5f9f6"} !important;
          border:1px solid ${darkMode ? "#294236" : "#e1ebe4"} !important;
        }
        .naija-site-header .naija-header-search { max-width:310px; }
        .naija-site-header .naija-header-actions { gap:8px; }
        .naija-site-header .naija-main-nav {
          background:#075c37; margin:0 -18px; padding:5px 18px 6px;
          gap:5px; min-height:49px;
        }
        .naija-site-header .naija-main-nav > a,
        .naija-site-header .naija-more-menu summary {
          color: #f4faf6 !important;
          border-radius: 6px !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          min-height: 39px !important;
          padding: 9px 14px !important;
        }
        .naija-site-header .naija-main-nav > a[aria-current="page"] {
          color: #ffe09a !important;
          background: rgba(255,255,255,.12) !important;
          box-shadow: inset 0 -3px 0 #e2b64d;
        }
        .naija-site-header .naija-main-nav > a:hover,
        .naija-site-header .naija-more-menu summary:hover,
        .naija-site-header .naija-more-menu[open] summary {
          color: #ffe09a !important;
          background: rgba(255,255,255,.12) !important;
        }
        .naija-site-header .naija-more-panel {
          top:calc(100% + 5px);
          background:${darkMode ? "#101a24" : "#ffffff"} !important;
          border-color:${darkMode ? "#30443a" : "#dce8df"} !important;
        }
        .naija-site-header .naija-more-panel a {
          color:${darkMode ? "#e2eee7" : "#254535"} !important;
          padding:9px 10px; border-radius:6px;
        }
        .naija-site-header .naija-more-panel a:hover {
          background:${darkMode ? "#1b3026" : "#edf6f0"} !important;
          color:#008751 !important;
        }
        @media (max-width: 900px) {
          .naija-site-header .naija-header-row { min-height: 92px; }
          .naija-site-header .naija-main-nav > a,
          .naija-site-header .naija-more-menu summary { padding-left: 10px !important; padding-right: 10px !important; }
        }
        @media (max-width: 680px) {
          .naija-site-header .naija-header-row { min-height: 0; padding: 11px 0 !important; }
          .naija-site-header .naija-brand img { width:218px !important; height:84px !important; }
          .naija-site-header .naija-main-nav {
            margin: 0 -18px;
            padding: 5px 12px 6px;
            gap: 2px;
          }
          .naija-site-header .naija-main-nav > a,
          .naija-site-header .naija-more-menu summary {
            min-height: 35px !important;
            padding: 7px 9px !important;
            font-size: 10px !important;
          }
        }
        /* Editorial masthead refresh */
        .naija-site-header {
          background: #fff !important;
          border-bottom: 0 !important;
          box-shadow: 0 8px 28px rgba(12,42,27,.10) !important;
        }
        .naija-site-header[data-theme='dark'] { background:#0b121b !important; box-shadow:0 8px 28px rgba(0,0,0,.35) !important; }
        .naija-site-header > div:first-child { height:5px !important; background:linear-gradient(90deg,#004b2d 0%,#008751 55%,#e2b64d 100%) !important; }
        .naija-site-header .naija-header-row { min-height:126px; padding:15px 0 16px !important; gap:22px !important; border-bottom:0 !important; }
        .naija-site-header .naija-brand { display:flex; align-items:center; flex:0 0 auto; padding:7px; background:#101114; border:1px solid rgba(226,182,77,.72); border-radius:9px; box-shadow:0 5px 16px rgba(0,0,0,.16); }
        .naija-site-header .naija-brand img { display:block; width:250px !important; height:106px !important; object-fit:contain; border:0 !important; border-radius:4px; background:#101114 !important; filter:none !important; box-shadow:none !important; }
        .naija-site-header .naija-header-stats { display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:5px !important; min-width:105px; padding:8px 0 8px 17px !important; border:0 !important; border-left:1px solid #dce8df !important; border-radius:0 !important; background:transparent !important; }
        .naija-site-header[data-theme='dark'] .naija-header-stats { border-left-color:#30443a !important; }
        .naija-site-header .naija-header-stats > div { display:flex; align-items:baseline; gap:6px; }
        .naija-site-header .naija-header-stats > div > div:first-child { font-size:14px !important; font-weight:900 !important; }
        .naija-site-header .naija-header-stats > div > div:last-child { font-size:9px !important; }
        .naija-site-header .naija-header-stats > span { margin-top:2px; }
        .naija-site-header .naija-header-search { max-width:340px; margin-left:auto; }
        .naija-site-header .naija-header-actions { gap:9px !important; }
        .naija-site-header .naija-admin-link { padding:9px 13px !important; border-radius:7px !important; background:#075c37 !important; }
        .naija-site-header .naija-main-nav { margin:0 -18px !important; padding:0 18px !important; min-height:52px !important; gap:7px !important; background:#075c37 !important; border-top:3px solid #e2b64d; }
        .naija-site-header .naija-main-nav > a, .naija-site-header .naija-more-menu summary { min-height:46px !important; padding:10px 15px !important; border-radius:0 !important; font-size:12px !important; letter-spacing:.15px; }
        .naija-site-header .naija-main-nav > a[aria-current='page'] { color:#ffe09a !important; background:rgba(255,255,255,.10) !important; box-shadow:inset 0 -3px 0 #e2b64d !important; }
        .naija-site-header .naija-more-panel { top:calc(100% + 2px) !important; }
        @media (max-width:1050px) {
          .naija-site-header .naija-header-row { gap:14px !important; }
          .naija-site-header .naija-brand img { width:220px !important; height:94px !important; }
          .naija-site-header .naija-header-stats { display:none !important; }
          .naija-site-header .naija-header-search { max-width:290px; }
        }
        @media (max-width:680px) {
          .naija-site-header .naija-header-row { min-height:0; padding:11px 0 !important; gap:9px !important; }
          .naija-site-header .naija-brand { padding:5px; }
          .naija-site-header .naija-brand img { width:190px !important; height:78px !important; }
          .naija-site-header .naija-header-search { max-width:none !important; min-width:100% !important; }
          .naija-site-header .naija-main-nav { margin:0 -12px !important; padding:0 9px !important; gap:0 !important; }
          .naija-site-header .naija-main-nav > a, .naija-site-header .naija-more-menu summary { min-height:41px !important; padding:8px 9px !important; font-size:10px !important; }
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
