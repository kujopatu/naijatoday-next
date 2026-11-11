'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';
import { useToast } from './ToastProvider';

const REACTIONS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😡', label: 'Angry' },
  { emoji: '👏', label: 'Clap' },
];

export default function ReactionBar({ postId }: { postId: string }) {
  const { border, muted, darkMode } = useTheme();
  const { showToast } = useToast();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string | null>(null);
  const [actorKey, setActorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [identityReady, setIdentityReady] = useState(false);

  const loadCounts = async () => {
    const { data, error } = await supabase
      .from('post_reactions')
      .select('emoji, count')
      .eq('post_id', postId);
    if (error) {
      console.error('[reactions] count load failed:', error.message);
      return;
    }
    const map: Record<string, number> = {};
    (data || []).forEach((r: { emoji: string; count: number | string }) => {
      map[r.emoji] = Number(r.count) || 0;
    });
    setCounts(map);
  };

  useEffect(() => {
    let active = true;
    const initialise = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        let user = sessionData.session?.user ?? null;

        // A visitor receives a private anonymous Supabase identity automatically.
        // No email, password, registration form or login prompt is shown.
        if (!user) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) throw error;
          user = data.user;
        }
        if (!user) throw new Error('Could not create a reaction identity.');

        const key = `auth:${user.id}`;
        if (!active) return;
        setActorKey(key);

        const { data: ownReaction, error: ownError } = await supabase
          .from('post_reaction_users')
          .select('emoji')
          .eq('post_id', postId)
          .eq('actor_key', key)
          .maybeSingle();
        if (ownError) throw ownError;
        if (active) setMine(ownReaction?.emoji ?? null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[reactions] anonymous identity failed:', message);
        if (active) showToast('Reactions are temporarily unavailable. Please try again later.');
      } finally {
        if (active) setIdentityReady(true);
      }
    };

    void initialise();
    void loadCounts();
    return () => { active = false; };
  }, [postId]);

  const handleReact = async (emoji: string) => {
    if (!actorKey || busy) return;
    setBusy(true);
    const previous = mine;
    const next = previous === emoji ? null : emoji;
    try {
      if (next) {
        const { error } = await supabase
          .from('post_reaction_users')
          .upsert(
            { post_id: postId, actor_key: actorKey, emoji: next },
            { onConflict: 'post_id,actor_key' }
          );
        if (error) throw error;
      } else if (previous) {
        const { error } = await supabase
          .from('post_reaction_users')
          .delete()
          .eq('post_id', postId)
          .eq('actor_key', actorKey);
        if (error) throw error;
      }

      setMine(next);
      await loadCounts();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showToast('Reaction not saved: ' + message.slice(0, 140));
      await loadCounts();
    } finally {
      setBusy(false);
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, padding: '14px 0', margin: '24px 0 20px' }}>
      <div style={{ fontSize: 11, color: muted, marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
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
              type="button"
              onClick={() => void handleReact(emoji)}
              title={label}
              disabled={!identityReady || !actorKey || busy}
              aria-pressed={active}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: active ? G.green + '22' : darkMode ? '#1e2535' : '#f5f7fa',
                border: `1px solid ${active ? G.green : darkMode ? '#2a3044' : '#e2e8f0'}`,
                borderRadius: 20, padding: '6px 14px', cursor: busy ? 'wait' : 'pointer',
                fontSize: 13, fontWeight: active ? 700 : 400,
                color: active ? G.green : darkMode ? '#c8d0dc' : '#4a5568',
                transform: active ? 'scale(1.08)' : 'scale(1)',
                transition: 'all 0.15s ease', opacity: busy || !identityReady ? 0.7 : 1,
              }}
            >
              <span style={{ fontSize: 17 }}>{emoji}</span>
              {count > 0 && <span>{count}</span>}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: muted }}>
        No account or sign-in needed. You can react instantly.
      </div>
    </div>
  );
}
