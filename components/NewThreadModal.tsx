'use client';

import { useState } from 'react';
import { CATEGORIES, G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

export type NewThreadInput = { title: string; body: string; category: string; poll?: { question: string; options: string[] } | null };

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
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

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
    const valid = pollOptions.map((o) => o.trim()).filter(Boolean);
    const poll = showPoll && pollQuestion.trim() && valid.length >= 2 ? { question: pollQuestion.trim(), options: valid } : null;
    const ok = await onSubmit({ title: title.trim(), body: body.trim(), category, poll });
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
        {!showPoll ? (
          <button onClick={() => setShowPoll(true)} style={{ background: 'none', border: `1px solid ${border}`, color: muted, borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer', marginBottom: 12 }}>
            🗳️ + Add a Poll (optional)
          </button>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: muted }}>🗳️ Poll</span>
              <button onClick={() => { setShowPoll(false); setPollQuestion(''); setPollOptions(['', '']); }} style={{ background: 'none', border: 'none', color: G.red, fontSize: 12, cursor: 'pointer' }}>Remove poll</button>
            </div>
            <input type="text" placeholder="Poll question" style={inp} value={pollQuestion} maxLength={150} onChange={(e) => setPollQuestion(e.target.value)} />
            {pollOptions.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="text" placeholder={`Option ${i + 1}`} style={{ ...inp, marginBottom: 0, flex: 1 }} value={opt} maxLength={80}
                  onChange={(e) => setPollOptions((o) => o.map((x, xi) => (xi === i ? e.target.value : x)))} />
                {pollOptions.length > 2 && (
                  <button onClick={() => setPollOptions((o) => o.filter((_, xi) => xi !== i))} style={{ background: 'none', border: `1px solid ${G.red}`, color: G.red, borderRadius: 8, padding: '0 14px', cursor: 'pointer' }}>✕</button>
                )}
              </div>
            ))}
            {pollOptions.length < 6 && (
              <button onClick={() => setPollOptions((o) => [...o, ''])} style={{ background: 'none', border: `1px solid ${border}`, color: muted, borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer' }}>+ Add Option</button>
            )}
          </div>
        )}
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
