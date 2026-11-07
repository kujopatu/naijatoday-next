'use client';

import { ReactNode } from 'react';
import { useTheme } from '../ThemeProvider';

export function useInputStyle(): React.CSSProperties {
  const { border, text, darkMode } = useTheme();
  return {
    width: '100%', padding: '11px 14px', borderRadius: 8, border: `1px solid ${border}`,
    background: darkMode ? '#111520' : '#f5f7fa', color: text, fontSize: 14, marginBottom: 12,
    outline: 'none', boxSizing: 'border-box', fontFamily: 'Georgia,serif',
  };
}

export function Intro({ children }: { children: ReactNode }) {
  const { muted } = useTheme();
  return <div style={{ fontSize: 13, color: muted, marginBottom: 14, lineHeight: 1.6 }}>{children}</div>;
}

export function Row({ children, accent }: { children: ReactNode; accent?: string }) {
  const { darkMode, border } = useTheme();
  return (
    <div style={{ background: darkMode ? '#111520' : '#f5f7fa', border: `1px solid ${accent || border}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
      {children}
    </div>
  );
}

export function SetupNote({ table, sql }: { table: string; sql: string }) {
  const { darkMode: D, border, text, muted } = useTheme();
  return (
    <div style={{ background: D ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)', border: '1px solid #6366f1', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 6 }}>⚙️ Setup needed: &quot;{table}&quot; table not found</div>
      <div style={{ fontSize: 12, color: muted, marginBottom: 8 }}>Run this once in your Supabase SQL editor to enable this feature:</div>
      <pre style={{ background: D ? '#0a0d14' : '#eef0f4', border: `1px solid ${border}`, borderRadius: 6, padding: 10, fontSize: 11, color: text, overflowX: 'auto', fontFamily: 'monospace', margin: 0 }}>{sql}</pre>
    </div>
  );
}
