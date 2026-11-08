'use client';

import { useEffect, useState } from 'react';
import { G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// "Add NaijaToday to your home screen" banner, shown 30 seconds after the
// browser says the site is installable. Dismissal lasts for the session.
export default function InstallPrompt() {
  const { card, text, muted } = useTheme();
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    try { if (sessionStorage.getItem('naija_install_dismissed')) return; } catch { /* ignore */ }
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    let timer: ReturnType<typeof setTimeout>;
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      timer = setTimeout(() => setShow(true), 30000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => { window.removeEventListener('beforeinstallprompt', handler); clearTimeout(timer); };
  }, []);

  const dismiss = () => {
    setShow(false);
    try { sessionStorage.setItem('naija_install_dismissed', '1'); } catch { /* ignore */ }
  };
  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
    dismiss();
  };
  if (!show || !evt) return null;
  return (
    <div style={{ position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 9000, background: card, border: `1px solid ${G.green}`, borderRadius: 14, padding: '14px 16px', boxShadow: '0 8px 32px rgba(0,135,81,0.25)', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 480, margin: '0 auto' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={44} height={44} style={{ borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: text }}>Install NaijaToday</div>
        <div style={{ fontSize: 12, color: muted }}>Add to your home screen for faster access, even on slow networks.</div>
      </div>
      <button onClick={install} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Install</button>
      <button onClick={dismiss} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: muted, fontSize: 18, cursor: 'pointer' }}>✕</button>
    </div>
  );
}
