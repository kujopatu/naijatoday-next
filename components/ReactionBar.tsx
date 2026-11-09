'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import { useToast } from './ToastProvider';

const REACTIONS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😡', label: 'Angry' },
  { emoji: '👏', label: 'Clap' },
];

// Port of the original ReactionBar. Totals live in `post_reactions`, each
// member's pick in `post_reaction_users`, and the existing database
// functions increment_reaction / decrement_reaction do the counting. The
// pick is also remembered in the browser (naija_reaction_<postId>) so
// guests keep it across refreshes.
type Adjust = { ok: true } | { ok: false; message: string };

// Change one emoji's total by +1 / -1. Uses the database function first and,
// if that is missing or blocked, updates the post_reactions row directly.
async function adjustReaction(postId: string, emoji: string, delta: 1 | -1): Promise<Adjust> {
  const fn = delta === 1 ? 'increment_reaction' : 'decrement_reaction';
  const rpc = await supabase.rpc(fn, { p_id: postId, p_emoji: emoji });
  if (!rpc.error) return { ok: true };
  console.warn(`[reactions] ${fn} failed, trying direct update:`, rpc.error);

  const { data: row, error: readErr } = await supabase
    .from('post_reactions').select('count').eq('post_id', postId).eq('emoji', emoji).maybeSingle();
  if (readErr) return { ok: false, message: `${fn}: ${rpc.error.message} | read: ${readErr.message}` };
  if (row) {
    const { error } = await supabase.from('post_reactions')
      .update({ count: Math.max(0, (Number(row.count) || 0) + delta) }).eq('post_id', postId).eq('emoji', emoji);
    return error ? { ok: false, message: `${fn}: ${rpc.error.message} | update: ${error.message}` } : { ok: true };
  }
  if (delta === 1) {
    const { error } = await supabase.from('post_reactions').insert([{ post_id: postId, emoji, count: 1 }]);
    return error ? { ok: false, message: `${fn}: ${rpc.error.message} | insert: ${error.message}` } : { ok: true };
  }
  return { ok: true };
}

export default function ReactionBar({ postId }: { postId: string }) {
  const { border, muted, darkMode } = useTheme();
  const { userEmail } = useAuth();
  const { showToast } = useToast();

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const storageKey = `naija_reaction_${postId}`;

  useEffect(() => {
    let active = true;
    supabase
      .from('post_reactions')
      .select('emoji, count')
      .eq('post_id', postId)
      .then(({ data }) => {
        if (!active || !data) return;
        const map: Record<string, number> = {};
        data.forEach((r: { emoji: string; count: number | string }) => {
          map[r.emoji] = Number(r.count) || 0;
        });
        setCounts(map);
      });

    let saved: string | null = null;
    try {
      saved = localStorage.getItem(storageKey);
    } catch {
      /* storage unavailable */
    }
    if (saved) {
      setMine(saved);
    } else if (userEmail) {
      supabase
        .from('post_reaction_users')
        .select('emoji')
        .eq('post_id', postId)
        .eq('user_email', userEmail)
        .maybeSingle()
        .then(({ data }) => {
          if (!active || !data) return;
          setMine(data.emoji);
          try {
            localStorage.setItem(storageKey, data.emoji);
          } catch {
            /* ignore */
          }
        });
    }
    return () => {
      active = false;
    };
  }, [postId, userEmail, storageKey]);

  const handleReact = async (emoji: string) => {
    if (busy) return;
    setBusy(true);
    const prev = mine;
    const newMine = emoji === prev ? null : emoji;

    // Optimistic update.
    setCounts((c) => {
      const next = { ...c };
      if (prev) next[prev] = Math.max(0, (next[prev] || 0) - 1);
      if (newMine) next[newMine] = (next[newMine] || 0) + 1;
      return next;
    });
    setMine(newMine);
    try {
      if (newMine) localStorage.setItem(storageKey, newMine);
      else localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }

    let failure = '';
    try {
      if (prev) {
        const r = await adjustReaction(postId, prev, -1);
        if (!r.ok) failure = r.message;
        else if (userEmail) {
          const { error } = await supabase.from('post_reaction_users').delete()
            .eq('post_id', postId).eq('user_email', userEmail).eq('emoji', prev);
          if (error) console.warn('[reactions] could not clear your pick:', error.message);
        }
      }
      if (!failure && newMine) {
        const r = await adjustReaction(postId, newMine, 1);
        if (!r.ok) failure = r.message;
        else if (userEmail) {
          const { error } = await supabase.from('post_reaction_users')
            .upsert([{ post_id: postId, user_email: userEmail, emoji: newMine }], { onConflict: 'post_id,user_email' });
          if (error) console.warn('[reactions] could not save your pick:', error.message);
        }
      }
    } catch (e) {
      failure = e instanceof Error ? e.message : 'Unknown error';
    }

    if (failure) {
      console.error('[reactions] not saved:', failure);
      // Roll back the screen to what it was.
      setCounts((c) => {
        const next = { ...c };
        if (newMine) next[newMine] = Math.max(0, (next[newMine] || 0) - 1);
        if (prev) next[prev] = (next[prev] || 0) + 1;
        return next;
      });
      setMine(prev);
      try {
        if (prev) localStorage.setItem(storageKey, prev);
        else localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      showToast('Reaction not saved: ' + failure.slice(0, 160));
    }
    setBusy(false);
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, padding: '14px 0', margin: '24px 0 20px' }}>
      <div
        style={{ fontSize: 11, color: muted, marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}
      >
        How does this story make you feel?{' '}
        {total > 0 && (
          <span style={{ color: darkMode ? '#555' : '#aaa', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            · {total.toLocaleString()} reaction{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {REACTIONS.map(({ emoji, label }) => {
          const count = counts[emoji] || 0;
          const active = mine === emoji;
          return (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              title={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: active ? G.green + '22' : darkMode ? '#1e2535' : '#f5f7fa',
                border: `1px solid ${active ? G.green : darkMode ? '#2a3044' : '#e2e8f0'}`,
                borderRadius: 20,
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: active ? 700 : 400,
                color: active ? G.green : darkMode ? '#c8d0dc' : '#4a5568',
                transform: active ? 'scale(1.08)' : 'scale(1)',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: 17 }}>{emoji}</span>
              {count > 0 && <span>{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
