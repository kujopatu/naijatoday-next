'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getVoterKey } from '@/lib/voter';
import { useAuth } from '@/components/AuthProvider';
import { useTheme } from '@/components/ThemeProvider';
import { G } from '@/lib/theme';

type Poll = {
  id: number;
  post_id: string | null;
  thread_id: number | null;
  question: string;
  options: string[];
  created_at: string;
  is_active: boolean;
  is_featured: boolean;
  closes_at: string | null;
  postTitle?: string;
};
type Vote = { poll_id: number; option_index: number; vote_count: number; is_mine: boolean };

export default function PollsExperience({ featuredOnly = false }: { featuredOnly?: boolean }) {
  const { userEmail } = useAuth();
  const { card, border, text, muted, darkMode } = useTheme();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myVotes, setMyVotes] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [tab, setTab] = useState<'active' | 'closed'>('active');

  useEffect(() => {
    let live = true;
    (async () => {
      const { data, error } = await supabase.from('polls')
        .select('id,post_id,thread_id,question,options,created_at,is_active,is_featured,closes_at')
        .order('created_at', { ascending: false }).limit(100);
      if (error || !data || !live) { setLoading(false); return; }
      const postIds = data.map(p => p.post_id).filter(Boolean) as string[];
      const titles: Record<string, string> = {};
      if (postIds.length) {
        const { data: posts } = await supabase.from('posts').select('id,title').in('id', postIds);
        (posts ?? []).forEach((p: {id:string;title:string}) => { titles[p.id] = p.title; });
      }
      const enriched = data.map(p => ({ ...p, options: Array.isArray(p.options) ? p.options : [], postTitle: p.post_id ? titles[p.post_id] : undefined })) as Poll[];
      const key = getVoterKey(userEmail);
      const { data: voteRows } = await supabase.rpc('get_poll_results', { p_poll_ids: enriched.map(p => p.id), p_voter_key: key });
      if (!live) return;
      const allVotes = (voteRows ?? []) as Vote[];
      setPolls(enriched);
      setVotes(allVotes);
      const own: Record<number, number> = {};
      allVotes.forEach(v => { if (v.is_mine) own[v.poll_id] = v.option_index; });
      setMyVotes(own);
      setLoading(false);
    })();
    return () => { live = false; };
  }, [userEmail]);

  const isOpen = (p: Poll) => p.is_active && (!p.closes_at || new Date(p.closes_at).getTime() > Date.now());
  const activePolls = useMemo(() => polls.filter(isOpen), [polls]);
  const closedPolls = useMemo(() => polls.filter(p => !isOpen(p)), [polls]);
  const featured = activePolls.find(p => p.is_featured) ?? activePolls[0] ?? null;
  const visible = featuredOnly ? (featured ? [featured] : []) : (tab === 'active' ? activePolls : closedPolls);
  const countFor = (pollId: number) => votes.filter(v => v.poll_id === pollId);
  const vote = async (poll: Poll, optionIndex: number) => {
    if (!isOpen(poll) || myVotes[poll.id] !== undefined || busy !== null) return;
    setBusy(poll.id);
    const key = getVoterKey(userEmail);
    const { error } = await supabase.from('poll_votes').insert({ poll_id: poll.id, option_index: optionIndex, voter_key: key });
    const { data: refreshed } = await supabase.rpc('get_poll_results', { p_poll_ids: [poll.id], p_voter_key: key });
    if (!error || error.code === '23505') {
      const fresh = (refreshed ?? []) as Vote[];
      setVotes(v => [...v.filter(row => row.poll_id !== poll.id), ...fresh]);
      const own = fresh.find(row => row.is_mine);
      if (own) setMyVotes(v => ({ ...v, [poll.id]: own.option_index }));
    }
    setBusy(null);
  };

  if (loading) return <div style={{ padding: 24, color: muted, textAlign: 'center' }}>Loading reader polls…</div>;
  if (featuredOnly && !featured) return null;

  const renderPoll = (poll: Poll, compact = false) => {
    const pollVotes = countFor(poll.id);
    const total = pollVotes.reduce((sum, row) => sum + Number(row.vote_count), 0);
    const myVote = myVotes[poll.id];
    const hasVoted = myVote !== undefined;
    const open = isOpen(poll);
    const shareUrl = typeof window !== 'undefined' ? window.location.origin + '/polls' : 'https://naijatodayblog.com.ng/polls';
    const shareText = encodeURIComponent(`NaijaToday Poll: ${poll.question}\nVote and see the results: ${shareUrl}`);
    return (
      <article key={poll.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: compact ? 18 : 22, boxShadow: compact ? '0 8px 26px rgba(0,0,0,.06)' : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ color: G.green, fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>{poll.is_featured ? '★ Poll of the Day' : '🗳 Reader Poll'}</span>
          <span style={{ fontSize: 11, color: muted }}>{open ? '● Voting open' : 'Voting closed'}</span>
        </div>
        <h2 style={{ color: text, fontSize: compact ? 19 : 21, lineHeight: 1.35, fontWeight: 850, margin: '0 0 8px' }}>{poll.question}</h2>
        {poll.postTitle && <div style={{ fontSize: 12, color: muted, marginBottom: 14 }}>Related article: {poll.postTitle}</div>}
        {poll.thread_id && <div style={{ fontSize: 12, color: muted, marginBottom: 14 }}>From the NaijaToday Forum</div>}
        <div style={{ display: 'grid', gap: 9, marginTop: 14 }}>
          {poll.options.map((option, i) => {
            const count = Number(pollVotes.find(v => v.option_index === i)?.vote_count ?? 0);
            const pct = total ? Math.round(count / total * 100) : 0;
            const selected = myVote === i;
            return (
              <button key={i} type="button" disabled={!open || hasVoted || busy === poll.id}
                onClick={() => vote(poll, i)}
                style={{ position: 'relative', overflow: 'hidden', textAlign: 'left', padding: '12px 14px', borderRadius: 10, border: `1px solid ${selected ? G.green : border}`, background: darkMode ? '#111a24' : '#f8faf9', color: text, cursor: !open || hasVoted ? 'default' : 'pointer', opacity: !open && !hasVoted ? .8 : 1 }}>
                {hasVoted && <span style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: selected ? 'rgba(0,135,81,.20)' : 'rgba(0,135,81,.08)' }} />}
                <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontWeight: selected ? 800 : 600 }}>{selected ? '✓ ' : ''}{option}</span>
                  {hasVoted && <span style={{ color: G.green, fontWeight: 800, whiteSpace: 'nowrap' }}>{pct}% · {count}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <span style={{ color: muted, fontSize: 12 }}>{total.toLocaleString()} vote{total === 1 ? '' : 's'}{hasVoted ? ' · Results are live' : open ? ' · Cast your vote to see results' : ' · Final results'}</span>
          <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer" style={{ color: G.green, fontWeight: 800, fontSize: 12, textDecoration: 'none' }}>Share on WhatsApp ↗</a>
        </div>
      </article>
    );
  };

  if (featuredOnly) return <section style={{ margin: '24px 0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <h2 style={{ margin: 0, color: text, fontSize: 19, fontWeight: 900 }}>🗳️ Poll of the Day</h2>
      <Link href="/polls" style={{ color: G.green, fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>All polls →</Link>
    </div>
    {renderPoll(featured!, true)}
  </section>;

  return <div style={{ maxWidth: 1100, margin: '0 auto', padding: '26px 18px 48px' }}>
    <div style={{ borderRadius: 18, padding: '28px 24px', marginBottom: 22, color: '#fff', background: 'linear-gradient(120deg,#005c37,#008751 58%,#13a86c)' }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, opacity: .85 }}>YOUR VOICE. YOUR NIGERIA.</div>
      <h1 style={{ fontSize: 'clamp(27px,5vw,40px)', lineHeight: 1.12, margin: '8px 0', fontWeight: 950 }}>NaijaToday Polls & Opinions</h1>
      <p style={{ margin: 0, maxWidth: 680, opacity: .92 }}>Have your say on the stories, issues and conversations shaping Nigeria. Vote and see where readers stand.</p>
    </div>
    <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
      {(['active','closed'] as const).map(t => <button key={t} onClick={() => setTab(t)} style={{ border: `1px solid ${tab === t ? G.green : border}`, background: tab === t ? G.green : card, color: tab === t ? '#fff' : text, borderRadius: 999, padding: '9px 17px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{t === 'active' ? `Active polls (${activePolls.length})` : `Past polls (${closedPolls.length})`}</button>)}
    </div>
    {visible.length ? <div style={{ display: 'grid', gap: 16 }}>{visible.map(p => renderPoll(p))}</div> : <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: 36, textAlign: 'center', color: muted }}>No {tab === 'active' ? 'active' : 'past'} polls to display right now. Check back soon.</div>}
    <p style={{ color: muted, fontSize: 11, marginTop: 18 }}>Polls reflect participation by NaijaToday readers and are not scientific public-opinion surveys.</p>
  </div>;
}
