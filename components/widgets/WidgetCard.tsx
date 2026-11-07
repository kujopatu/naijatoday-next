'use client';

import { ReactNode } from 'react';
import { useTheme } from '../ThemeProvider';

// Shared box + title used by every sidebar widget.
export default function WidgetCard({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  const { card, border, text } = useTheme();
  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: text }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}
