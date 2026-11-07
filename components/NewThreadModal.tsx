'use client';

import { useState } from 'react';
import { CATEGORIES, G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

export type NewThreadInput = { title: string; body: string; category: string };

export default function NewThreadModal({
  onClose,
  onSubmit,
  canModerate,
}: {
  onClose: () => void;
  onSubmit: (t: NewThreadInput) => Promise<boolean>;
  canModerate: boolean;
}) {
  const { darkMode: D, card, border, text, muted } = useTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [sending, setSending] = useState(false);

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: D ? '#111520' : '#f5f7fa',
    color: text,
    fontSize: 14,
    marginBottom: 12,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Georgia,serif',
  };

  const submit = async () => {
    if (!title.trim() || !body.trim() || sending) return;
    setSending(true);
    const ok = await onSubmit({ title: title.trim(), body: body.trim(), category });
    setSending(false);
    if (ok) onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 8500,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 20,
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: card,
          borderRadius: 16,
          padding: 28,
          width: '100%',
          maxWidth: 560,
          border: `1px solid ${border}`,
          marginTop: 20,
          marginBottom: 40,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, color: text, marginBottom: 6, fontFamily: 'Georgia,serif' }}>
          💬 Start New Discussion
        </div>
        {!canModerate && (
          <div style={{ fontSize: 12, color: muted, marginBottom: 16 }}>
            New threads are reviewed by a moderator before they go live.
          </div>
        )}
        <input
          type="text"
          placeholder="Thread title"
          style={inp}
          value={title}
          maxLength={150}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select style={inp} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Share your thoughts…"
          style={{ ...inp, minHeight: 140, resize: 'vertical' }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={submit}
            disabled={sending}
            style={{
              background: G.green,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '11px 24px',
              fontWeight: 700,
              cursor: sending ? 'not-allowed' : 'pointer',
              opacity: sending ? 0.7 : 1,
              flex: 1,
              fontSize: 15,
            }}
          >
            {sending ? 'Posting…' : 'Post Thread'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              color: text,
              border: `1px solid ${border}`,
              borderRadius: 8,
              padding: '11px 24px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
