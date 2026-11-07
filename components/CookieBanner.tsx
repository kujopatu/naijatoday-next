'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { G } from '@/lib/theme';

// Same storage key as the original site, so earlier choices are remembered.
export default function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { setShow(localStorage.getItem('naija_cookie_consent') === null); } catch { /* ignore */ }
  }, []);
  if (!show) return null;
  const choose = (v: 'accepted' | 'declined') => {
    try { localStorage.setItem('naija_cookie_consent', v); } catch { /* ignore */ }
    setShow(false);
  };
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0f1117', borderTop: `2px solid ${G.green}`, padding: '16px 24px', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, boxShadow: '0 -4px 20px rgba(0,0,0,0.5)' }}>
      <div style={{ flex: 1, minWidth: 250 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>🍪 We use cookies</div>
        <div style={{ fontSize: 12, color: '#8892a4', lineHeight: 1.6 }}>
          NaijaToday uses cookies to improve your experience and show relevant ads. By accepting, you agree to our{' '}
          <Link href="/privacy" style={{ color: G.green, textDecoration: 'underline' }}>Privacy Policy</Link>.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button onClick={() => choose('declined')} style={{ background: 'none', color: '#8892a4', border: '1px solid #252a36', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Decline</button>
        <button onClick={() => choose('accepted')} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Accept All</button>
      </div>
    </div>
  );
}
