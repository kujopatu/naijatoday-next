'use client';

import { G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

const today = () => new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

// Privacy / Terms / Disclaimer: a titled list of numbered sections.
export default function LegalDoc({ icon, title, intro, sections, showDate = true }: {
  icon?: string; title: string; intro?: string; sections: [string, string][]; showDate?: boolean;
}) {
  const { card, border, text, muted, darkMode: D } = useTheme();
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 16px', fontFamily: 'Georgia,serif' }}>
      <div style={{ background: card, borderRadius: 16, padding: '36px 36px 28px', border: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          {icon && <div style={{ fontSize: 36 }}>{icon}</div>}
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: text, margin: 0 }}>{title}</h1>
            {showDate && <p style={{ fontSize: 13, color: muted, margin: '4px 0 0' }}>Last updated: {today()} · naijatodayblog.com.ng</p>}
          </div>
        </div>
        {intro && (
          <div style={{ background: 'rgba(0,135,81,0.1)', border: '1px solid rgba(0,135,81,0.3)', borderRadius: 10, padding: '14px 18px', margin: '24px 0 32px', fontSize: 14, color: muted, lineHeight: 1.7 }}>{intro}</div>
        )}
        {sections.map(([t, body]) => (
          <div key={t} style={{ marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${border}` }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: G.green, marginBottom: 10 }}>{t}</h2>
            <p style={{ fontSize: 14, color: muted, lineHeight: 1.9, margin: 0 }}>{body}</p>
          </div>
        ))}
        <div style={{ background: D ? '#111520' : '#f5f7fa', borderRadius: 10, padding: 20, marginTop: 8 }}>
          <p style={{ fontSize: 13, color: muted, margin: 0 }}>
            <strong style={{ color: text }}>NaijaToday Media Limited</strong> · Ikotun, Lagos, Nigeria · <span style={{ color: G.green }}>kujopatu@gmail.com</span>
          </p>
        </div>
        <p style={{ fontSize: 12, color: muted, marginTop: 20, marginBottom: 0 }}>© 2026 NaijaToday Media Limited. All rights reserved.</p>
      </div>
    </div>
  );
}
