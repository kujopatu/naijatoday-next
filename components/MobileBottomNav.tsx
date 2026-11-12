'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { G } from '@/lib/theme';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';

const ITEMS = [
  { href: '/', label: 'Home', icon: '⌂', active: (path: string) => path === '/' },
  { href: '/category/national', label: 'News', icon: '▤', active: (path: string) => path.startsWith('/category/') || path.startsWith('/article/') },
  { href: '/trending', label: 'Trending', icon: '↗', active: (path: string) => path === '/trending' },
  { href: '/polls', label: 'Polls', icon: '▥', active: (path: string) => path.startsWith('/polls') },
  { href: '/profile', label: 'Account', icon: '○', active: (path: string) => path.startsWith('/profile') || path.startsWith('/saved') },
];

export default function MobileBottomNav() {
  const pathname = usePathname() || '/';
  const { loggedIn, openModal } = useAuth();
  const { darkMode, border } = useTheme();

  return (
    <nav className="naija-mobile-bottom-nav" aria-label="Mobile navigation" style={{
      background: darkMode ? '#101720' : '#fff',
      borderTop: `1px solid ${border}`,
      boxShadow: '0 -5px 22px rgba(0,0,0,.09)',
    }}>
      {ITEMS.map((item) => {
        const active = item.active(pathname);
        return (
          <Link key={item.href} href={item.href}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            onClick={(event) => {
              if (item.label === 'Account' && !loggedIn) {
                event.preventDefault();
                openModal('login');
              }
            }}
            style={{ color: active ? G.green : (darkMode ? '#aab6b0' : '#65736b') }}>
            <span className="naija-mobile-nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
            {active && <i aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}
