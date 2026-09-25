'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

// Home is wired to a real page. The rest point at routes that don't
// exist yet (search, auth, forum, jobs, admin, etc. are all separate,
// larger pieces of work) — they're kept here so the nav visually
// matches the original site, but will 404 until those pages are built.
const NAV_TABS: [string, string][] = [
  ['/', '🏠 Home'],
  ['/trending', '🔥 Trending'],
  ['/forum', '💬 Forum'],
  ['/jobs', '💼 Jobs & Scholarships'],
  ['/resources', '📚 Resources'],
  ['/scores', '⚽ Fixtures & Scores'],
  ['/saved', '🔖 Saved'],
  ['/contact', '📩 Contact'],
];

export default function SiteHeader({
  articleCount,
  memberCount,
}: {
  articleCount: number;
  memberCount: number | null;
}) {
  const { darkMode, toggleDarkMode, border, muted, text } = useTheme();
  const pathname = usePathname();

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
              textDecoration: 'none',
              borderLeft: `3px solid ${G.green}`,
              paddingLeft: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: G.green,
                  letterSpacing: '-0.5px',
                  lineHeight: 1,
                  textShadow: `0 0 20px ${G.green}66`,
                }}
              >
                NaijaToday
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: '#a0aab8',
                  letterSpacing: 2.5,
                  textTransform: 'uppercase',
                  marginTop: 3,
                }}
              >
                Nigeria&apos;s #1 Digital Media
              </div>
            </div>
          </Link>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              background: darkMode ? 'rgba(0,135,81,0.06)' : 'rgba(0,135,81,0.05)',
              border: `1px solid ${darkMode ? 'rgba(0,135,81,0.18)' : 'rgba(0,135,81,0.15)'}`,
              borderRadius: 8,
              padding: '3px 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 12px',
                borderRight: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#00c96a',
                  display: 'inline-block',
                  animation: 'naija-pulse 2s infinite',
                }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: darkMode ? '#c8e8d8' : '#1a4a30', lineHeight: 1 }}>
                  {articleCount}
                </div>
                <div style={{ fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Articles
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 12px',
                borderRight: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: darkMode ? '#c8e8d8' : '#1a4a30', lineHeight: 1 }}>
                  {memberCount !== null ? memberCount.toLocaleString() : '…'}
                </div>
                <div style={{ fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Members
                </div>
              </div>
            </div>
            <div style={{ padding: '2px 10px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  background: darkMode ? 'rgba(0,201,106,0.12)' : 'rgba(0,135,81,0.08)',
                  border: `1px solid ${darkMode ? 'rgba(0,201,106,0.25)' : 'rgba(0,135,81,0.2)'}`,
                  borderRadius: 10,
                  padding: '2px 7px',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: '#00c96a',
                    display: 'inline-block',
                    animation: 'naija-pulse 1.5s infinite',
                  }}
                />
                <span style={{ fontSize: 9, color: '#00c96a', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Live
                </span>
              </span>
            </div>
          </div>

          {/* Search is visual-only for now — wiring it to real results is a
              separate piece of work, deferred to a later phase. */}
          <div style={{ flex: 1, maxWidth: 320, minWidth: 160 }}>
            <input
              placeholder="🔍  Search Nigerian news, topics…"
              disabled
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 24,
                border: `1.5px solid ${border}`,
                background: darkMode ? '#111520' : '#f7fbf9',
                color: text,
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
                opacity: 0.7,
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button
              onClick={toggleDarkMode}
              style={{
                background: 'none',
                border: `1px solid ${border}`,
                cursor: 'pointer',
                fontSize: 16,
                padding: '6px 10px',
                borderRadius: 8,
                color: muted,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {darkMode ? '☀️' : '🌙'}
              <span style={{ fontSize: 8, color: muted, letterSpacing: 0.5 }}>{darkMode ? 'LIGHT' : 'DARK'}</span>
            </button>
            {/* Login/Join are visual-only — auth isn't ported yet. */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                style={{
                  background: 'none',
                  border: `1px solid ${G.green}`,
                  color: G.green,
                  borderRadius: 20,
                  padding: '7px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Login
              </button>
              <button
                style={{
                  background: `linear-gradient(135deg,${G.green},${G.greenDark})`,
                  border: 'none',
                  color: '#fff',
                  borderRadius: 20,
                  padding: '7px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: `0 2px 8px ${G.green}44`,
                }}
              >
                Join Free
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
          {NAV_TABS.map(([href, label]) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: active ? 700 : 400,
                    color: active ? G.green : muted,
                    background: active ? (darkMode ? 'rgba(0,135,81,0.08)' : 'rgba(0,135,81,0.06)') : 'none',
                    borderBottom: active ? `2px solid ${G.green}` : '2px solid transparent',
                    whiteSpace: 'nowrap',
                    borderRadius: '6px 6px 0 0',
                  }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes naija-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}`}</style>
    </header>
  );
}
