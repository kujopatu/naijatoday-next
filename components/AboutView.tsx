'use client';

import { G } from '@/lib/theme';
import { ABOUT_ADVERTISE, ABOUT_CONTACT, ABOUT_COVERAGE, ABOUT_GROUPS, ABOUT_POLICY, ABOUT_POLICY_INTRO, ABOUT_TEAM, ABOUT_VALUES } from '@/lib/legalContent';
import { useTheme } from './ThemeProvider';

export default function AboutView() {
  const { card, border, text, muted, darkMode: D } = useTheme();
  const box: React.CSSProperties = { background: card, borderRadius: 16, padding: '32px 36px', border: `1px solid ${border}`, marginBottom: 16 };
  const h2: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: text, marginBottom: 14 };
  const inner = D ? '#111520' : '#f5f7fa';
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 16px', fontFamily: 'Georgia,serif' }}>
      <div style={{ background: 'linear-gradient(135deg,#008751 0%,#004d2e 100%)', borderRadius: 16, padding: '48px 36px', textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🇳🇬</div>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>About NaijaToday</h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>Nigeria&apos;s independently owned digital media platform — fast, credible, and unapologetically Nigerian.</p>
      </div>

      {ABOUT_GROUPS.map(([title, paras]) => (
        <div key={title} style={box}>
          <h2 style={h2}>{title}</h2>
          {paras.map((p, i) => <p key={i} style={{ fontSize: 15, color: muted, lineHeight: 1.9, margin: i === paras.length - 1 ? 0 : '0 0 14px' }}>{p}</p>)}
        </div>
      ))}

      <div style={box}>
        <h2 style={{ ...h2, marginBottom: 20 }}>Our Editorial Values</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
          {ABOUT_VALUES.map(([icon, title, desc]) => (
            <div key={title} style={{ background: inner, borderRadius: 12, padding: 20, border: `1px solid ${border}` }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 13, color: muted, lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={box}>
        <h2 style={h2}>Editorial Policy</h2>
        <p style={{ fontSize: 15, color: muted, lineHeight: 1.9, marginBottom: 16 }}>{ABOUT_POLICY_INTRO}</p>
        {ABOUT_POLICY.map(([icon, title, desc]) => (
          <div key={title} style={{ display: 'flex', gap: 14, marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${border}` }}>
            <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 14, color: muted, lineHeight: 1.8 }}>{desc}</div>
            </div>
          </div>
        ))}
        <p style={{ fontSize: 13, color: muted, margin: 0 }}>For editorial complaints or concerns, contact our Editor-in-Chief at <span style={{ color: G.green }}>kujopatu@gmail.com</span>.</p>
      </div>

      <div style={box}>
        <h2 style={{ ...h2, marginBottom: 20 }}>Meet the Team</h2>
        {ABOUT_TEAM.map(([icon, name, role, bio]) => (
          <div key={name} style={{ display: 'flex', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${border}` }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,135,81,0.15)', border: '1px solid rgba(0,135,81,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 2 }}>{name}</div>
              <div style={{ fontSize: 12, color: G.green, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>{role}</div>
              <div style={{ fontSize: 14, color: muted, lineHeight: 1.8 }}>{bio}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={box}>
        <h2 style={{ ...h2, marginBottom: 16 }}>What We Cover</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {ABOUT_COVERAGE.map((c) => <span key={c} style={{ background: 'rgba(0,135,81,0.15)', border: '1px solid rgba(0,135,81,0.3)', color: G.green, borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>{c}</span>)}
        </div>
      </div>

      <div style={box}>
        <h2 style={h2}>Advertise With Us</h2>
        <p style={{ fontSize: 15, color: muted, lineHeight: 1.9, marginBottom: 20 }}>{ABOUT_ADVERTISE}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
          {ABOUT_CONTACT.map(([icon, label, val]) => (
            <div key={label} style={{ background: 'rgba(0,135,81,0.08)', border: '1px solid rgba(0,135,81,0.2)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: G.green }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 12, color: muted, marginTop: 4 }}>© 2026 NaijaToday Media Limited. Registered in Lagos, Nigeria. All rights reserved.</p>
    </div>
  );
}
