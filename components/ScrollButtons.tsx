'use client';

import { useEffect, useState } from 'react';
import { G } from '@/lib/theme';

// ↑ back-to-top with a progress ring showing how far down the page you are,
// plus ↓ jump-to-bottom. Same behaviour as the original site.
export default function ScrollButtons() {
  const [pct, setPct] = useState(0);
  const [y, setY] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setY(window.scrollY);
      setPct(h > 0 ? Math.min(100, Math.round((window.scrollY / h) * 100)) : 0);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const r = 18, circ = 2 * Math.PI * r;
  return (
    <>
      {y > 300 && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title={`Back to top · ${pct}% read`} aria-label="Back to top"
          style={{ position: 'fixed', bottom: 80, right: 20, width: 48, height: 48, borderRadius: '50%', background: G.greenDark, color: '#fff', border: 'none', cursor: 'pointer', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,135,81,0.45)', padding: 0 }}>
          <svg width="48" height="48" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle cx="24" cy="24" r={r} fill="none" stroke="#fff" strokeWidth="3" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} style={{ transition: 'stroke-dashoffset 0.3s ease' }} />
          </svg>
          <span style={{ fontSize: 16, position: 'relative', zIndex: 1 }}>↑</span>
        </button>
      )}
      <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} aria-label="Jump to bottom"
        style={{ position: 'fixed', bottom: 28, right: 20, width: 44, height: 44, borderRadius: '50%', background: G.greenDark, color: '#fff', border: 'none', fontSize: 20, cursor: 'pointer', zIndex: 999, boxShadow: '0 4px 16px rgba(0,92,55,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
    </>
  );
}
