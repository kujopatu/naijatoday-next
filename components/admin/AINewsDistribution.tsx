'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';

type NewsItem = { id: string; source_title: string; source_name: string; status: string; generated_title?: string | null };
type Distribution = { id: string; item_id: string; destination: string; status: string; confidence: number; reason: string | null; payload: Record<string, any>; ai_newsroom_items?: { source_title?: string; source_name?: string; source_url?: string } | null };
const labels: Record<string,string> = { forum_thread: 'Forum thread', job: 'Job vacancy', scholarship: 'Scholarship' };

export default function AINewsDistribution({ items }: { items: NewsItem[] }) {
  const { card, border, text, muted } = useTheme();
  const [selected, setSelected] = useState('');
  const [destination, setDestination] = useState('forum_thread');
  const [payloadText, setPayloadText] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [reason, setReason] = useState('');
  const [queue, setQueue] = useState<Distribution[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const token = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) throw new Error('Your admin session has expired. Sign in again.');
    return data.session.access_token;
  };
  const call = async (method: 'GET' | 'POST', body?: unknown) => {
    const accessToken = await token();
    const response = await fetch('/api/admin/ai-newsroom/distribute', {
      method, headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Distribution request failed.');
    return result;
  };
  const refresh = async () => { const result = await call('GET'); setQueue(result.distributions || []); };
  useEffect(() => { void refresh().catch((e) => setError(e.message)); }, []);

  const classify = async () => {
    if (!selected) { setError('Select a newsroom story first.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await call('POST', { action: 'classify', item_id: selected });
      const value = result.classification;
      if (value.destination === 'news') {
        setDestination('forum_thread');
        setPayloadText(JSON.stringify({ title: '', body: '', category: 'Nigeria' }, null, 2));
        setReason(value.reason || 'AI recommends keeping this in the main news workflow.');
        setConfidence(value.confidence || 0);
        setMessage('AI recommends keeping this story in the main News Articles workflow. You can still prepare a forum discussion manually if appropriate.');
      } else {
        setDestination(value.destination);
        setPayloadText(JSON.stringify(value.payload || {}, null, 2));
        setReason(value.reason || '');
        setConfidence(value.confidence || 0);
        setMessage('Classification ready. Review and edit the content below before adding it to the approval queue.');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Classification failed.'); }
    finally { setBusy(false); }
  };
  const addToQueue = async () => {
    if (!selected) return;
    let payload: Record<string, any>;
    try { payload = JSON.parse(payloadText); } catch { setError('The content must be valid JSON. Correct it before queueing.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      await call('POST', { action: 'queue', item_id: selected, destination, payload, confidence, reason });
      setMessage('Added to the distribution approval queue.');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not queue this item.'); }
    finally { setBusy(false); }
  };
  const review = async (id: string, decision: 'approve' | 'reject') => {
    setBusy(true); setError(''); setMessage('');
    try {
      await call('POST', { action: 'review', id, decision });
      setMessage(decision === 'approve' ? 'Approved and sent to its destination.' : 'Distribution rejected.');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Review failed.'); }
    finally { setBusy(false); }
  };
  const panel: React.CSSProperties = { background: card, border: `1px solid ${border}`, borderRadius: 11, padding: 15, marginBottom: 14 };
  const input: React.CSSProperties = { width: '100%', background: 'transparent', color: text, border: `1px solid ${border}`, borderRadius: 7, padding: 9, fontSize: 12 };
  const pending = queue.filter((x) => x.status === 'pending');
  return <section style={panel}>
    <div style={{ color: text, fontSize: 14, fontWeight: 800, marginBottom: 5 }}>🧭 Intelligent News Distribution</div>
    <div style={{ color: muted, fontSize: 11, marginBottom: 12 }}>AI recommends a destination. You review the extracted details, then approve each item before it reaches the Forum or Jobs & Scholarships.</div>
    {error && <div style={{ color: G.red, fontSize: 11, marginBottom: 8 }}>{error}</div>}
    {message && <div style={{ color: G.green, fontSize: 11, marginBottom: 8 }}>{message}</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(130px,1fr)', gap: 8 }}>
      <select aria-label="Choose newsroom story" value={selected} onChange={(e) => setSelected(e.target.value)} style={input}>
        <option value="">Select a newsroom story…</option>
        {items.map((item) => <option key={item.id} value={item.id}>{item.generated_title || item.source_title} · {item.source_name}</option>)}
      </select>
      <button disabled={busy || !selected} onClick={() => void classify()} style={{ background: G.green, color: '#fff', border: 0, borderRadius: 7, padding: 9, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>{busy ? 'Working…' : '✨ Classify story'}</button>
    </div>
    {payloadText && <div style={{ marginTop: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px,1fr) minmax(0,2fr)', gap: 8, marginBottom: 8 }}>
        <select value={destination} onChange={(e) => setDestination(e.target.value)} style={input}>
          <option value="forum_thread">Forum thread</option><option value="job">Job vacancy</option><option value="scholarship">Scholarship</option>
        </select>
        <div style={{ color: muted, fontSize: 10, alignSelf: 'center' }}>AI confidence: {confidence}% · {reason}</div>
      </div>
      <label style={{ color: muted, fontSize: 10, display: 'block', marginBottom: 5 }}>Review and edit the proposed content (JSON)</label>
      <textarea value={payloadText} onChange={(e) => setPayloadText(e.target.value)} rows={8} style={{ ...input, resize: 'vertical', fontFamily: 'monospace' }} />
      <button disabled={busy} onClick={() => void addToQueue()} style={{ marginTop: 8, background: G.gold, color: '#111', border: 0, borderRadius: 7, padding: '9px 13px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Add to approval queue</button>
    </div>}
    <div style={{ borderTop: `1px solid ${border}`, marginTop: 14, paddingTop: 12 }}>
      <div style={{ color: text, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>Awaiting distribution approval ({pending.length})</div>
      {pending.length === 0 ? <div style={{ color: muted, fontSize: 11 }}>No items waiting for approval.</div> : pending.map((entry) => <div key={entry.id} style={{ borderTop: `1px solid ${border}`, padding: '10px 0' }}>
        <div style={{ color: text, fontSize: 12, fontWeight: 700 }}>{entry.payload?.title || entry.ai_newsroom_items?.source_title || 'Untitled distribution'}</div>
        <div style={{ color: muted, fontSize: 10, margin: '4px 0 8px' }}>{labels[entry.destination] || entry.destination} · AI confidence {entry.confidence}% · {entry.reason || 'No reason supplied'}</div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button disabled={busy} onClick={() => void review(entry.id, 'approve')} style={{ background: G.green, color: '#fff', border: 0, borderRadius: 6, padding: '7px 10px', fontSize: 10, fontWeight: 800 }}>Approve &amp; send</button>
          <button disabled={busy} onClick={() => void review(entry.id, 'reject')} style={{ background: 'transparent', color: G.red, border: `1px solid ${G.red}`, borderRadius: 6, padding: '7px 10px', fontSize: 10, fontWeight: 800 }}>Reject</button>
        </div>
      </div>)}
    </div>
  </section>;
}
