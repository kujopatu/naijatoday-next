'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useAuth } from '../AuthProvider';
import { useTheme } from '../ThemeProvider';

type Source = { id: string; name: string; is_active: boolean; feed_url: string };
type Item = {
  id: string; source_name: string; source_title: string; status: string;
  created_at: string; updated_at: string; generation_error?: string | null;
  generated_title?: string | null; post_id?: string | null;
  source_published_at?: string | null;
};
type Activity = { action: string; detail: string | null; created_at: string };
type ScheduledPost = { id: string; title: string; scheduled_at: string };

const fmt = (value?: string | null) => value ? new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const count = (items: Item[], status: string) => items.filter((item) => item.status === status).length;

export default function AINewsroomMonitor() {
  const { isAdmin } = useAuth();
  const { card, border, text, muted } = useTheme();
  const [sources, setSources] = useState<Source[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [collectionRunning, setCollectionRunning] = useState(false);
  const [retryingId, setRetryingId] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [queueFilter, setQueueFilter] = useState('all');
  const [queueSearch, setQueueSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (sessionError || !token) throw new Error('Your admin session has expired. Sign in again.');
      const [newsroomResponse, activityResult, scheduledResult] = await Promise.all([
        fetch('/api/admin/ai-newsroom', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
        supabase.from('admin_activity_log').select('action,detail,created_at')
          .in('action', ['ai_newsroom_cycle', 'ai_newsroom_manual_collection_started', 'ai_newsroom_manual_collection_failed', 'ai_newsroom_feed_checked', 'ai_newsroom_feed_failed', 'ai_newsroom_queue_failed', 'ai_newsroom_draft_failed', 'scheduled_articles_published', 'scheduled_publishing_failed', 'scheduled_publishing_sync_failed'])
          .order('created_at', { ascending: false }).limit(60),
        supabase.from('posts').select('id,title,scheduled_at').eq('workflow_status', 'scheduled')
          .eq('published', false).order('scheduled_at', { ascending: true }).limit(12),
      ]);
      const payload = await newsroomResponse.json().catch(() => ({}));
      if (!newsroomResponse.ok) throw new Error(payload.error || 'Could not load AI Newsroom status.');
      setSources((payload.sources || []) as Source[]);
      setItems((payload.items || []) as Item[]);
      if (activityResult.error) throw new Error('Could not read automation activity: ' + activityResult.error.message);
      if (scheduledResult.error) throw new Error('Could not read scheduled articles: ' + scheduledResult.error.message);
      setActivity((activityResult.data || []) as Activity[]);
      setScheduled((scheduledResult.data || []) as ScheduledPost[]);
      setUpdatedAt(new Date().toLocaleString('en-NG'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load AI Newsroom monitor.');
    } finally {
      setLoading(false);
    }
  }, []);

  const runCollection = useCallback(async () => {
    setCollectionRunning(true);
    setActionMessage('');
    setError('');
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (sessionError || !token) throw new Error('Your admin session has expired. Sign in again.');
      const response = await fetch('/.netlify/functions/collect-ai-news-manual-background', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 202) throw new Error(payload.error || payload.message || 'Could not start news collection.');
      setActionMessage(typeof payload.feedsChecked === 'number'
        ? 'Collection finished: checked ' + payload.feedsChecked + ' feeds, discovered ' + payload.storiesAdded + ' new stories, generated ' + payload.drafted + ' drafts, with ' + payload.failed + ' errors.'
        : payload.message || 'News collection has started in the background. Refresh the monitor in a few moments to see the results.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start news collection.');
    } finally {
      setCollectionRunning(false);
    }
  }, []);

  const retryDraft = useCallback(async (itemId: string) => {
    setRetryingId(itemId);
    setActionMessage('');
    setError('');
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (sessionError || !token) throw new Error('Your admin session has expired. Sign in again.');
      const response = await fetch('/api/admin/ai-newsroom', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', item_id: itemId, format: 'news' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Draft retry failed.');
      setActionMessage('Draft generated successfully. Please review it in the AI Newsroom before saving it to Articles.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Draft retry failed.');
    } finally {
      setRetryingId('');
    }
  }, [load]);

  const dismissItem = useCallback(async (itemId: string) => {
    setError('');
    setActionMessage('');
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (sessionError || !token) throw new Error('Your admin session has expired. Sign in again.');
      const response = await fetch('/api/admin/ai-newsroom', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', item_id: itemId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not dismiss this story.');
      setActionMessage('Story removed from the active newsroom queue.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not dismiss this story.');
    }
  }, [load]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => [
    { label: 'Active feeds', value: sources.filter((source) => source.is_active).length, note: `of ${sources.length} configured` },
    { label: 'Discovered', value: count(items, 'discovered'), note: 'waiting for drafting' },
    { label: 'Generated drafts', value: items.filter((item) => ['generated', 'draft_saved', 'scheduled', 'published'].includes(item.status)).length, note: 'including saved and scheduled' },
    { label: 'Generation failures', value: count(items, 'generation_failed'), note: 'need review or retry' },
    { label: 'Scheduled articles', value: scheduled.length, note: 'awaiting publication' },
  ], [sources, items, scheduled]);

  const visibleItems = useMemo(() => items.filter((item) => {
    const matchesStatus = queueFilter === 'all' || item.status === queueFilter;
    const haystack = (item.generated_title || item.source_title) + ' ' + item.source_name;
    return matchesStatus && haystack.toLowerCase().includes(queueSearch.toLowerCase().trim());
  }), [items, queueFilter, queueSearch]);
  const latestFeedEvent = (sourceName: string) => activity.find((entry) =>
    ['ai_newsroom_feed_checked', 'ai_newsroom_feed_failed'].includes(entry.action)
    && (entry.detail || '').startsWith(sourceName + ':'));
  const panel: React.CSSProperties = { background: card, border: `1px solid ${border}`, borderRadius: 11, padding: 15 };
  const statusColor = (status: string) => status === 'generation_failed' || status.includes('failed') ? G.red
    : ['published', 'scheduled', 'draft_saved', 'generated'].includes(status) ? G.green : G.gold;

  if (!isAdmin) return <div style={{ ...panel, color: muted }}>The AI Newsroom monitor is available to administrators only.</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ color: text, fontSize: 18, fontWeight: 800 }}>🤖 AI Newsroom Monitor</div>
          <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>Feed health, automated drafting, failures and scheduled publishing in one view.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => void runCollection()} disabled={collectionRunning || loading} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 12px', cursor: collectionRunning ? 'wait' : 'pointer', fontWeight: 800, opacity: collectionRunning ? 0.7 : 1 }}>
            {collectionRunning ? 'Starting collection…' : '▶ Run feed collection'}
          </button>
          <button onClick={() => void load()} disabled={loading} style={{ background: 'transparent', color: text, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 12px', cursor: loading ? 'wait' : 'pointer', fontWeight: 700 }}>
            {loading ? 'Refreshing…' : '↻ Refresh status'}
          </button>
        </div>
      </div>

      {error && <div style={{ ...panel, borderColor: G.red, color: G.red, marginBottom: 14, fontSize: 12 }}>{error}</div>}
      {actionMessage && <div style={{ ...panel, borderColor: G.green, color: G.green, marginBottom: 14, fontSize: 12 }}>{actionMessage}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 10, marginBottom: 16 }}>
        {stats.map((stat) => (
          <div key={stat.label} style={panel}>
            <div style={{ color: muted, fontSize: 11, fontWeight: 700 }}>{stat.label}</div>
            <div style={{ color: text, fontSize: 26, fontWeight: 850, marginTop: 7 }}>{loading ? '—' : stat.value}</div>
            <div style={{ color: muted, fontSize: 10, marginTop: 4 }}>{stat.note}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginBottom: 14 }}>
        <section style={panel}>
          <div style={{ color: text, fontSize: 14, fontWeight: 800, marginBottom: 10 }}>📡 Approved news feeds</div>
          {loading ? <div style={{ color: muted, fontSize: 12 }}>Loading feeds…</div> : sources.length === 0 ? <div style={{ color: muted, fontSize: 12 }}>No feeds configured yet.</div> : sources.map((source) => (
            <div key={source.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: `1px solid ${border}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: text, fontSize: 12, fontWeight: 700 }}>{source.name}</div>
                <div style={{ color: muted, fontSize: 10, overflowWrap: 'anywhere' }}>{source.feed_url}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: source.is_active ? G.green : G.red, fontSize: 10, fontWeight: 800 }}>{source.is_active ? 'ACTIVE' : 'PAUSED'}</div>
                {(() => {
                  const last = latestFeedEvent(source.name);
                  const health = !last ? 'NOT CHECKED' : last.action === 'ai_newsroom_feed_failed' ? 'FEED ERROR' : 'HEALTHY';
                  const color = !last ? muted : last.action === 'ai_newsroom_feed_failed' ? G.red : G.green;
                  return <div style={{ color, fontSize: 9, marginTop: 4, fontWeight: 800 }}>{health}<div style={{ color: muted, fontWeight: 400, marginTop: 2 }}>{last ? fmt(last.created_at) : 'No check recorded'}</div></div>;
                })()}
              </div>
            </div>
          ))}
        </section>

        <section style={panel}>
          <div style={{ color: text, fontSize: 14, fontWeight: 800, marginBottom: 10 }}>🕒 Scheduled publishing queue</div>
          {loading ? <div style={{ color: muted, fontSize: 12 }}>Loading schedule…</div> : scheduled.length === 0 ? <div style={{ color: muted, fontSize: 12 }}>No articles are currently scheduled.</div> : scheduled.map((post) => (
            <div key={post.id} style={{ padding: '9px 0', borderTop: `1px solid ${border}` }}>
              <div style={{ color: text, fontSize: 12, fontWeight: 700 }}>{post.title}</div>
              <div style={{ color: G.green, fontSize: 10, marginTop: 4 }}>Publishes: {fmt(post.scheduled_at)}</div>
            </div>
          ))}
          <div style={{ color: muted, fontSize: 10, marginTop: 10 }}>The publishing worker checks for due articles every five minutes.</div>
        </section>
      </div>

      <section style={{ ...panel, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ color: text, fontSize: 14, fontWeight: 800 }}>📰 Draft queue management</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input aria-label="Search newsroom queue" value={queueSearch} onChange={(event) => setQueueSearch(event.target.value)} placeholder="Search title or feed…" style={{ minWidth: 170, maxWidth: '100%', background: 'transparent', color: text, border: `1px solid ${border}`, borderRadius: 7, padding: '7px 9px', fontSize: 11 }} />
            <select aria-label="Filter newsroom queue" value={queueFilter} onChange={(event) => setQueueFilter(event.target.value)} style={{ background: card, color: text, border: `1px solid ${border}`, borderRadius: 7, padding: '7px 9px', fontSize: 11 }}>
              <option value="all">All statuses</option>
              <option value="discovered">Discovered</option>
              <option value="generated">Generated</option>
              <option value="generation_failed">Generation failed</option>
              <option value="draft_saved">Saved drafts</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
        <div style={{ color: muted, fontSize: 10, marginBottom: 8 }}>Showing {visibleItems.length} of {items.length} recent newsroom stories. Use filters to focus on items needing attention.</div>
        {loading ? <div style={{ color: muted, fontSize: 12 }}>Loading queue…</div> : visibleItems.length === 0 ? <div style={{ color: muted, fontSize: 12 }}>No stories match this filter.</div> : visibleItems.slice(0, 20).map((item) => (
          <div key={item.id} style={{ padding: '10px 0', borderTop: `1px solid ${border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: text, fontSize: 12, fontWeight: 700, lineHeight: 1.45 }}>{item.generated_title || item.source_title}</div>
                <div style={{ color: muted, fontSize: 10, marginTop: 3 }}>{item.source_name} · Updated {fmt(item.updated_at || item.created_at)}</div>
              </div>
              <span style={{ color: statusColor(item.status), fontSize: 10, fontWeight: 850, whiteSpace: 'nowrap' }}>{item.status.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            {item.generation_error && <div style={{ color: G.red, fontSize: 10, marginTop: 5, overflowWrap: 'anywhere' }}>{item.generation_error}</div>}
            {item.status === 'generation_failed' && (
              <button onClick={() => void retryDraft(item.id)} disabled={retryingId === item.id} style={{ marginTop: 8, background: 'transparent', color: G.green, border: `1px solid ${border}`, borderRadius: 7, padding: '6px 9px', cursor: retryingId === item.id ? 'wait' : 'pointer', fontSize: 11, fontWeight: 800 }}>
                {retryingId === item.id ? 'Retrying draft…' : '↻ Retry draft generation'}
              </button>
            )}
            {['discovered', 'generation_failed'].includes(item.status) && (
              <button onClick={() => void dismissItem(item.id)} style={{ marginTop: 8, marginLeft: 7, background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 7, padding: '6px 9px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                Dismiss from queue
              </button>
            )}
          </div>
        ))}
      </section>

      <section style={panel}>
        <div style={{ color: text, fontSize: 14, fontWeight: 800, marginBottom: 10 }}>📜 Automation activity & errors</div>
        {loading ? <div style={{ color: muted, fontSize: 12 }}>Loading activity…</div> : activity.length === 0 ? <div style={{ color: muted, fontSize: 12 }}>No automation activity has been recorded yet. Check again after the next scheduled run.</div> : activity.slice(0, 25).map((entry, index) => (
          <div key={`${entry.created_at}-${index}`} style={{ padding: '9px 0', borderTop: `1px solid ${border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: statusColor(entry.action), fontSize: 11, fontWeight: 800 }}>{entry.action.replace(/_/g, ' ').toUpperCase()}</span>
              <span style={{ color: muted, fontSize: 10 }}>{fmt(entry.created_at)}</span>
            </div>
            <div style={{ color: text, fontSize: 11, marginTop: 4, overflowWrap: 'anywhere' }}>{entry.detail || 'No additional details.'}</div>
          </div>
        ))}
      </section>
      <div style={{ color: muted, fontSize: 10, marginTop: 12 }}>Last refreshed: {updatedAt || '—'}. The scheduled collector checks feeds every two hours and generates up to five drafts per cycle. Feed health reflects the latest recorded check or failure. The queue shows the 60 most recent stories returned by the newsroom API. All generated content remains subject to editorial review.</div>
    </div>
  );
}
