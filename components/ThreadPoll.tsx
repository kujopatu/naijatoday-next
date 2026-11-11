'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { getVoterKey } from '@/lib/voter';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import { useToast } from './ToastProvider';

type Poll = { id: string | number; question: string; options: string[]; is_active?: boolean; closes_at?: string | null };
type Vote = { option_index: number; voter_key: string };

// Poll attached to a forum thread (polls.thread_id). One vote per member
// or device; results show once you've voted.
export default function ThreadPoll({ threadId }: { threadId: number }) {
  const { card, border, text, muted, darkMode: D } = useTheme();
  const { userEmail } = useAuth();
  const { showToast } = useToast();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: p } = await supabase.from('polls').select('*').eq('thread_id', threadId).limit(1).maybeSingle();
      if (!active || !p) return;
      const options: string[] = Array.isArray(p.options) ? p.options : [];
      setPoll({ id: p.id, question: p.question, options });
      const { data: vs } = await supabase.from('poll_votes').select('option_index, voter_key').eq('poll_id', p.id);
      if (!active) return;
      setVotes((vs ?? []) as Vote[]);
      const mine = (vs ?? []).find((v) => v.voter_key === getVoterKey(userEmail));
      if (mine) setMyVote(mine.option_index);
    })();
    return () => { active = false; };
  }, [threadId, userEmail]);

  if (!poll || poll.options.length === 0) return null;
  const pollOpen = poll.is_active !== false && (!poll.closes_at || new Date(poll.closes_at).getTime() > Date.now());

  const vote = async (i: number) => {
    if (myVote !== null || voting || !pollOpen) return;
    setVoting(true);
    const key = getVoterKey(userEmail);
    const { error } = await supabase.from('poll_votes').insert([{ poll_id: poll.id, option_index: i, voter_key: key }]);
    if (error) showToast('Error: ' + error.message);
    else {
      setVotes((v) => [...v, { option_index: i, voter_key: key }]);
      setMyVote(i);
      showToast('Vote recorded! 🗳️');
    }
    setVoting(false);
  };

  const total = votes.length;
  const counts = poll.options.map((_, i) => votes.filter((v) => v.option_index === i).length);

  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 18, margin: '20px 0' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 12, fontFamily: 'Georgia,serif' }}>🗳️ {poll.question}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {poll.options.map((opt, i) => {
          const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
          const mine = myVote === i;
          const show = myVote !== null;
          return (
            <div key={i} onClick={() => pollOpen && vote(i)}
              style={{ position: 'relative', border: `1px solid ${mine ? G.green : border}`, borderRadius: 8, padding: '10px 14px', cursor: myVote === null && pollOpen ? 'pointer' : 'default', overflow: 'hidden', background: D ? '#111520' : '#fff' }}>
              {show && <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: mine ? G.green + '22' : D ? '#1e2535' : '#f0f4f8', transition: 'width 0.4s' }} />}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: text, fontWeight: mine ? 700 : 400 }}>
                <span>{mine && '✓ '}{opt}</span>
                {show && <span style={{ color: muted }}>{pct}% ({counts[i]})</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: muted, marginTop: 10 }}>
        {total} vote{total !== 1 ? 's' : ''}{!pollOpen ? ' · Voting closed' : myVote === null ? ' · Tap an option to vote' : ' · Results are live'}
      </div>
    </div>
  );
}
