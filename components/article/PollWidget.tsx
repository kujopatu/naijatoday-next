'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { getVoterKey } from '@/lib/voter';
import { useAuth } from '../AuthProvider';
import { useTheme } from '../ThemeProvider';

type Poll = { id: string; question: string; options: string[]; post_id?: string | null; is_active?: boolean; closes_at?: string | null };

// Shows the poll attached to this article (polls.post_id), if any. One vote
// per member/device, stored in poll_votes.
export default function PollWidget({ postId }: { postId: string }) {
  const { card, border, text, muted } = useTheme();
  const { userEmail } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [counts, setCounts] = useState<number[]>([]);
  const [mine, setMine] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: p } = await supabase.from('polls').select('*').eq('post_id', postId).limit(1).maybeSingle();
      if (!active || !p) return;
      const options: string[] = Array.isArray(p.options) ? p.options : [];
      setPoll({ ...p, options } as Poll);
      const { data: votes } = await supabase.from('poll_votes').select('option_index, voter_key').eq('poll_id', p.id);
      if (!active) return;
      const c = options.map(() => 0);
      (votes ?? []).forEach((v) => { if (c[v.option_index] !== undefined) c[v.option_index]++; });
      setCounts(c);
      const key = getVoterKey(userEmail);
      const own = (votes ?? []).find((v) => v.voter_key === key);
      if (own) setMine(own.option_index);
    })();
    return () => { active = false; };
  }, [postId, userEmail]);

  if (!poll || poll.options.length === 0) return null;
  const total = counts.reduce((a, b) => a + b, 0);
  const pollOpen = poll.is_active !== false && (!poll.closes_at || new Date(poll.closes_at).getTime() > Date.now());

  const vote = async (i: number) => {
    if (mine !== null || !pollOpen) return;
    setMine(i);
    setCounts((c) => c.map((n, idx) => (idx === i ? n + 1 : n)));
    const { error } = await supabase.from('poll_votes').insert({ poll_id: poll.id, option_index: i, voter_key: getVoterKey(userEmail) });
    if (error) {
      setMine(null);
      setCounts((c) => c.map((n, idx) => (idx === i ? n - 1 : n)));
    }
  };

  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: 18, margin: '24px 0' }}>
      <div style={{ fontSize: 11, color: G.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>📊 Reader Poll</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: text, marginBottom: 12 }}>{poll.question}</div>
      {poll.options.map((opt, i) => {
        const pct = total ? Math.round((counts[i] / total) * 100) : 0;
        const voted = mine !== null;
        return (
          <button key={i} onClick={() => vote(i)} disabled={voted || !pollOpen}
            style={{ position: 'relative', display: 'block', width: '100%', textAlign: 'left', marginBottom: 8, padding: '10px 14px', borderRadius: 8, border: `1px solid ${mine === i ? G.green : border}`, background: 'transparent', color: text, cursor: voted ? 'default' : 'pointer', overflow: 'hidden', fontSize: 14 }}>
            {voted && <span style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: 'rgba(0,135,81,0.15)' }} />}
            <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span>{opt}{mine === i ? ' ✓' : ''}</span>
              {voted && <span style={{ color: muted, fontWeight: 700 }}>{pct}%</span>}
            </span>
          </button>
        );
      })}
      <div style={{ fontSize: 11, color: muted }}>{total} vote{total !== 1 ? 's' : ''}{!pollOpen ? ' · Voting closed' : voted ? ' · Results are live' : ' · Vote to see results'}</div>
    </div>
  );
}
