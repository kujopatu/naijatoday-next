'use client';

import { useState } from 'react';
import { G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

const REASONS = ['Spam', 'Harassment or abuse', 'Hate speech', 'Misinformation', 'Inappropriate content', 'Other'];

export default function ReportModal({
  kind,
  onClose,
  onSubmit,
}: {
  kind: 'thread' | 'reply';
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const { darkMode: D, card, border, text, muted } = useTheme();
  const [reason, setReason] = useState('');
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: card, borderRadius: 16, padding: 28, width: '100%', maxWidth: 460, border: `1px solid ${border}` }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 16, fontFamily: 'Georgia,serif' }}>
          🚩 Report {kind === 'thread' ? 'Thread' : 'Reply'}
        </div>
        <div style={{ fontSize: 13, color: muted, marginBottom: 16 }}>
          Help us keep the community safe. Why are you reporting this {kind}?
        </div>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: `1px solid ${border}`, background: D ? '#111520' : '#f5f7fa', color: text, fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'Georgia,serif' }}
        >
          <option value="">Select a reason…</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => {
              if (reason) {
                onSubmit(reason);
                onClose();
              }
            }}
            disabled={!reason}
            style={{ background: G.red, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontWeight: 700, cursor: reason ? 'pointer' : 'not-allowed', opacity: reason ? 1 : 0.6, flex: 1, fontSize: 15 }}
          >
            Submit Report
          </button>
          <button
            onClick={onClose}
            style={{ background: 'none', color: text, border: `1px solid ${border}`, borderRadius: 8, padding: '11px 24px', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
