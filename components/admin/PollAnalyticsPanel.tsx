'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

type Poll = {
  id: number;
  post_id: string | null;
  question: string;
  options: string[];
  created_at: string;
};
type EnrichedPoll = Poll & { totalVotes: number; optionCounts: number[]; postTitle: string };

export default function PollAnalyticsPanel() {
  const { showToast } = useToast();
  const { card, border, text, muted, darkMode } = useTheme();
  const [polls, setPolls] = useState<EnrichedPoll[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPolls = async () => {
    setLoading(true);
    try {
      const { data: pollData, error: pollErr } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
      if (pollErr || !pollData) {
        setLoading(false);
        return;
      }

      const { data: voteData } = await supabase.from('poll_votes').select('poll_id, option_index');

      const postIds = (pollData as Poll[]).filter((p) => p.post_id).map((p) => p.post_id as string);
      const postTitles: Record<string, string> = {};
      if (postIds.length > 0) {
        const { data: posts } = await supabase.from('posts').select('id, title').in('id', postIds);
        if (posts) (posts as { id: string; title: string }[]).forEach((p) => (postTitles[p.id] = p.title));
      }

      const votes = (voteData ?? []) as { poll_id: number; option_index: number }[];
      const enriched: EnrichedPoll[] = (pollData as Poll[]).map((poll) => {
        const pollVotes = votes.filter((v) => v.poll_id === poll.id);
        const totalVotes = pollVotes.length;
        const optionCounts = (poll.options || []).map((_, i) => pollVotes.filter((v) => v.option_index === i).length);
        return {
          ...poll,
          totalVotes,
          optionCounts,
          postTitle: poll.post_id ? postTitles[poll.post_id] || 'Unknown article' : 'Forum thread',
        };
      });
      setPolls(enriched);
    } catch {
      showToast('Error loading polls');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPolls();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deletePoll = async (pollId: number) => {
    if (!window.confirm('Delete this poll and all its votes?')) return;
    try {
      await supabase.from('poll_votes').delete().eq('poll_id', pollId);
      await supabase.from('polls').delete().eq('id', pollId);
      setPolls((p) => p.filter((x) => x.id !== pollId));
      showToast('Poll deleted');
    } catch {
      showToast('Error deleting poll');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: text, fontFamily: 'Georgia,serif' }}>🗳️ Poll Analytics ({polls.length} polls)</div>
        <button onClick={loadPolls} style={{ background: 'none', border: `1px solid ${border}`, color: muted, borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: muted }}>⏳ Loading polls…</div>
      ) : polls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: muted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗳️</div>
          <div>No polls yet. Add a poll when writing an article.</div>
        </div>
      ) : (
        polls.map((poll) => {
          const maxCount = Math.max(...poll.optionCounts, 0);
          return (
            <div key={poll.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>📰 {poll.postTitle}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: text, fontFamily: 'Georgia,serif' }}>🗳️ {poll.question}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  <div style={{ background: G.green + '22', color: G.green, fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                    {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}
                  </div>
                  <button onClick={() => deletePoll(poll.id)} style={{ background: G.red + '22', color: G.red, border: `1px solid ${G.red}44`, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                    🗑
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(poll.options || []).map((opt, i) => {
                  const count = poll.optionCounts[i] || 0;
                  const pct = poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0;
                  const isWinner = count === maxCount && count > 0;
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: text, marginBottom: 5 }}>
                        <span style={{ fontWeight: isWinner ? 700 : 400 }}>
                          {isWinner ? '🏆 ' : ''}
                          {opt}
                        </span>
                        <span style={{ color: isWinner ? G.green : muted, fontWeight: isWinner ? 700 : 400 }}>
                          {pct}% ({count})
                        </span>
                      </div>
                      <div style={{ height: 10, background: darkMode ? '#1e2535' : '#f0f4f8', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: isWinner ? G.green : darkMode ? '#2d3748' : '#cbd5e0', borderRadius: 5, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {poll.totalVotes === 0 && <div style={{ marginTop: 12, fontSize: 12, color: muted, textAlign: 'center' }}>No votes yet</div>}

              <div style={{ marginTop: 12, fontSize: 11, color: muted }}>
                Created {poll.created_at ? new Date(poll.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
