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
  is_active: boolean;
  is_featured: boolean;
  closes_at: string | null;
};
type EnrichedPoll = Poll & { totalVotes: number; optionCounts: number[]; postTitle: string };

export default function PollAnalyticsPanel() {
  const { showToast } = useToast();
  const { card, border, text, muted, darkMode } = useTheme();
  const [polls, setPolls] = useState<EnrichedPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [closeDateValues, setCloseDateValues] = useState<Record<number, string>>({});
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(['', '']);
  const [creating, setCreating] = useState(false);
  const [editingPollId, setEditingPollId] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>([]);

  const loadPolls = async () => {
    setLoading(true);
    try {
      const { data: pollData, error: pollErr } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
      if (pollErr || !pollData) {
        setLoading(false);
        return;
      }

      const { data: voteData } = await supabase.rpc('get_poll_results', { p_poll_ids: (pollData as Poll[]).map((p) => p.id), p_voter_key: null });

      const postIds = (pollData as Poll[]).filter((p) => p.post_id).map((p) => p.post_id as string);
      const postTitles: Record<string, string> = {};
      if (postIds.length > 0) {
        const { data: posts } = await supabase.from('posts').select('id, title').in('id', postIds);
        if (posts) (posts as { id: string; title: string }[]).forEach((p) => (postTitles[p.id] = p.title));
      }

      const votes = (voteData ?? []) as { poll_id: number; option_index: number; vote_count: number }[];
      const enriched: EnrichedPoll[] = (pollData as Poll[]).map((poll) => {
        const pollVotes = votes.filter((v) => v.poll_id === poll.id);
        const totalVotes = pollVotes.reduce((sum, v) => sum + Number(v.vote_count), 0);
        const optionCounts = (poll.options || []).map((_, i) => Number(pollVotes.find((v) => v.option_index === i)?.vote_count ?? 0));
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

  const createPoll = async () => {
    const question = newQuestion.trim();
    const options = newOptions.map((option) => option.trim()).filter(Boolean);
    if (!question || options.length < 2) {
      showToast('Enter a poll question and at least two options.');
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('polls').insert({
      question,
      options,
      is_active: true,
      is_featured: false,
      post_id: null,
      thread_id: null,
    });
    setCreating(false);
    if (error) {
      showToast('Could not create poll: ' + error.message);
      return;
    }
    setNewQuestion('');
    setNewOptions(['', '']);
    showToast('Poll published to the public polls page.');
    loadPolls();
  };

  const beginEdit = (poll: EnrichedPoll) => {
    setEditingPollId(poll.id);
    setEditQuestion(poll.question);
    setEditOptions([...(poll.options || [])]);
  };

  const savePollEdit = async (poll: EnrichedPoll) => {
    const question = editQuestion.trim();
    const options = editOptions.map((option) => option.trim()).filter(Boolean);
    if (!question || options.length < 2) {
      showToast('A poll needs a question and at least two options.');
      return;
    }
    const { error } = await supabase.from('polls').update({ question, options }).eq('id', poll.id);
    if (error) {
      showToast('Could not save poll: ' + error.message);
      return;
    }
    setPolls((items) => items.map((item) => item.id === poll.id ? { ...item, question, options, optionCounts: options.map((_, i) => item.optionCounts[i] ?? 0) } : item));
    setEditingPollId(null);
    showToast('Poll updated');
  };

  const updatePoll = async (poll: EnrichedPoll, changes: Partial<Pick<Poll, 'is_active' | 'is_featured' | 'closes_at'>>) => {
    try {
      if (changes.is_featured) {
        const { error: clearError } = await supabase.from('polls').update({ is_featured: false }).neq('id', poll.id);
        if (clearError) throw clearError;
      }
      const { error } = await supabase.from('polls').update(changes).eq('id', poll.id);
      if (error) throw error;
      setPolls((items) => items.map((item) => ({
        ...item,
        ...(item.id === poll.id ? changes : {}),
        ...(changes.is_featured ? { is_featured: item.id === poll.id } : {}),
      })));
      showToast('Poll settings updated');
    } catch (error) {
      showToast('Could not update poll: ' + (error instanceof Error ? error.message : 'Please try again.'));
    }
  };

  const deletePoll = async (pollId: number) => {
    if (!window.confirm('Delete this poll and all its votes?')) return;
    try {
      const { error } = await supabase.from('polls').delete().eq('id', pollId);
      if (error) throw error;
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

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 12 }}>＋ Create a public poll</div>
        <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Ask a question for NaijaToday readers…" maxLength={240}
          style={{ width: '100%', boxSizing: 'border-box', background: darkMode ? '#111520' : '#f5f7fa', color: text, border: `1px solid ${border}`, borderRadius: 8, padding: '11px 12px', marginBottom: 10 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 8 }}>
          {newOptions.map((option, index) => <input key={index} value={option} onChange={(e) => setNewOptions((items) => items.map((item, i) => i === index ? e.target.value : item))}
            placeholder={`Option ${index + 1}`} maxLength={100}
            style={{ width: '100%', boxSizing: 'border-box', background: darkMode ? '#111520' : '#f5f7fa', color: text, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 12px' }} />)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {newOptions.length < 6 && <button onClick={() => setNewOptions((items) => [...items, ''])} style={{ background: 'transparent', color: G.green, border: `1px solid ${G.green}`, borderRadius: 7, padding: '7px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>＋ Add option</button>}
            {newOptions.length > 2 && <button onClick={() => setNewOptions((items) => items.slice(0, -1))} style={{ background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 7, padding: '7px 10px', fontSize: 12, cursor: 'pointer' }}>Remove last</button>}
          </div>
          <button onClick={createPoll} disabled={creating} style={{ background: G.green, color: '#fff', border: 0, borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 900, cursor: creating ? 'wait' : 'pointer', opacity: creating ? .7 : 1 }}>{creating ? 'Publishing…' : 'Publish public poll'}</button>
        </div>
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
                  <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>📰 {poll.postTitle} · {poll.is_active ? 'Open' : 'Closed'}{poll.is_featured ? ' · Poll of the Day' : ''}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: text, fontFamily: 'Georgia,serif' }}>🗳️ {poll.question}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  <div style={{ background: G.green + '22', color: G.green, fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                    {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}
                  </div>
                  <button onClick={() => beginEdit(poll)} style={{ background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 6, padding: '5px 9px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => updatePoll(poll, { is_active: !poll.is_active })} style={{ background: poll.is_active ? '#d9770620' : G.green + '22', color: poll.is_active ? '#d97706' : G.green, border: `1px solid ${poll.is_active ? '#d9770666' : G.green + '55'}`, borderRadius: 6, padding: '5px 9px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                    {poll.is_active ? 'Close poll' : 'Reopen'}
                  </button>
                  <button onClick={() => updatePoll(poll, { is_featured: !poll.is_featured })} style={{ background: poll.is_featured ? '#e4b84c22' : 'transparent', color: poll.is_featured ? '#b8860b' : muted, border: `1px solid ${border}`, borderRadius: 6, padding: '5px 9px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                    {poll.is_featured ? '★ Featured' : '☆ Feature'}
                  </button>
                  <button onClick={() => deletePoll(poll.id)} style={{ background: G.red + '22', color: G.red, border: `1px solid ${G.red}44`, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                    🗑
                  </button>
                </div>
              </div>

              {editingPollId === poll.id && <div style={{ background: darkMode ? '#111520' : '#f5f7fa', border: `1px solid ${border}`, borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <input value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} maxLength={240} aria-label="Edit poll question"
                  style={{ width: '100%', boxSizing: 'border-box', background: card, color: text, border: `1px solid ${border}`, borderRadius: 7, padding: 9, marginBottom: 8 }} />
                {editOptions.map((option, index) => <div key={index} style={{ display: 'flex', gap: 7, marginBottom: 7 }}>
                  <input value={option} onChange={(e) => setEditOptions((items) => items.map((item, i) => i === index ? e.target.value : item))} maxLength={100} aria-label={`Edit option ${index + 1}`}
                    style={{ flex: 1, minWidth: 0, background: card, color: text, border: `1px solid ${border}`, borderRadius: 7, padding: 8 }} />
                  {editOptions.length > 2 && <button onClick={() => setEditOptions((items) => items.filter((_, i) => i !== index))} style={{ color: G.red, background: 'transparent', border: `1px solid ${G.red}55`, borderRadius: 6, padding: '0 9px' }}>×</button>}
                </div>)}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {editOptions.length < 6 && <button onClick={() => setEditOptions((items) => [...items, ''])} style={{ background: 'transparent', color: G.green, border: `1px solid ${G.green}`, borderRadius: 6, padding: '6px 9px', fontSize: 11 }}>＋ Option</button>}
                  <button onClick={() => savePollEdit(poll)} style={{ background: G.green, color: '#fff', border: 0, borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 800 }}>Save changes</button>
                  <button onClick={() => setEditingPollId(null)} style={{ background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 6, padding: '6px 12px', fontSize: 11 }}>Cancel</button>
                </div>
              </div>}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '0 0 14px' }}>
                <label style={{ fontSize: 12, color: muted, fontWeight: 700 }}>Close voting at</label>
                <input
                  type="datetime-local"
                  value={closeDateValues[poll.id] ?? (poll.closes_at ? new Date(poll.closes_at).toISOString().slice(0, 16) : '')}
                  onChange={(e) => setCloseDateValues((v) => ({ ...v, [poll.id]: e.target.value }))}
                  style={{ background: darkMode ? '#111520' : '#f5f7fa', color: text, border: `1px solid ${border}`, borderRadius: 7, padding: '7px 9px', fontSize: 12 }}
                />
                <button onClick={() => {
                  const value = closeDateValues[poll.id] ?? (poll.closes_at ? new Date(poll.closes_at).toISOString().slice(0, 16) : '');
                  updatePoll(poll, { closes_at: value ? new Date(value).toISOString() : null });
                }} style={{ background: G.green, color: '#fff', border: 0, borderRadius: 7, padding: '7px 11px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Save schedule</button>
                <span style={{ fontSize: 11, color: muted }}>Leave blank for no automatic closing time.</span>
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
