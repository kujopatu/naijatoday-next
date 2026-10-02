'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendTopic } from '@/lib/trends';
import { G } from '@/lib/theme';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

export default function TrendManagerPanel() {
  const { showToast } = useToast();
  const { card, border, text, muted, darkMode } = useTheme();
  const [trends, setTrends] = useState<TrendTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTopic, setNewTopic] = useState({ topic: '', volume: '', status: 'approved' });
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: darkMode ? '#111520' : '#f5f7fa',
    color: text,
    fontSize: 14,
    marginBottom: 0,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Georgia,serif',
  };

  const loadTrends = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('trends').select('*').order('id', { ascending: false });
      if (!error && data) setTrends(data as TrendTopic[]);
      else if (error) showToast('Error: ' + error.message);
    } catch {
      showToast('Connection error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTrends();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (id: number) => {
    try {
      const { error } = await supabase.from('trends').update({ status: 'approved' }).eq('id', id);
      if (error) {
        showToast('Error: ' + error.message);
        return;
      }
      setTrends((t) => t.map((x) => (x.id === id ? { ...x, status: 'approved' } : x)));
      showToast('Topic approved ✅');
    } catch {
      showToast('Connection error');
    }
  };

  const handleReject = async (id: number) => {
    try {
      const { error } = await supabase.from('trends').update({ status: 'rejected' }).eq('id', id);
      if (error) {
        showToast('Error: ' + error.message);
        return;
      }
      setTrends((t) => t.map((x) => (x.id === id ? { ...x, status: 'rejected' } : x)));
      showToast('Topic rejected');
    } catch {
      showToast('Connection error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from('trends').delete().eq('id', id);
      if (error) {
        showToast('Error: ' + error.message);
        return;
      }
      setTrends((t) => t.filter((x) => x.id !== id));
      showToast('Topic deleted');
    } catch {
      showToast('Connection error');
    }
  };

  const handleApproveAll = async () => {
    const pending = trends.filter((t) => t.status === 'pending');
    if (pending.length === 0) {
      showToast('No pending topics');
      return;
    }
    try {
      const { error } = await supabase.from('trends').update({ status: 'approved' }).eq('status', 'pending');
      if (error) {
        showToast('Error: ' + error.message);
        return;
      }
      setTrends((t) => t.map((x) => (x.status === 'pending' ? { ...x, status: 'approved' } : x)));
      showToast(`✅ Approved all ${pending.length} pending topics`);
    } catch {
      showToast('Connection error');
    }
  };

  const handleAdd = async () => {
    if (!newTopic.topic.trim()) {
      showToast('Please enter a topic');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('trends')
        .insert([{ topic: newTopic.topic.trim(), volume: newTopic.volume.trim() || '0', status: newTopic.status, fetched_at: new Date().toISOString() }])
        .select();
      if (error) {
        showToast('Error: ' + error.message);
        setSaving(false);
        return;
      }
      if (data) setTrends((t) => [data[0] as TrendTopic, ...t]);
      setNewTopic({ topic: '', volume: '', status: 'approved' });
      showToast('Topic added ✅');
    } catch {
      showToast('Connection error');
    }
    setSaving(false);
  };

  const pending = trends.filter((t) => t.status === 'pending');
  const approved = trends.filter((t) => t.status === 'approved');
  const rejected = trends.filter((t) => t.status === 'rejected');
  const filtered = filter === 'all' ? trends : trends.filter((t) => t.status === filter);

  const statusBadge = (status: string) => {
    const cfg: Record<string, { bg: string; color: string; label: string }> = {
      approved: { bg: G.green, color: '#fff', label: 'Approved' },
      pending: { bg: G.gold, color: '#000', label: 'Pending' },
      rejected: { bg: G.red, color: '#fff', label: 'Rejected' },
    };
    const c = cfg[status] || cfg.pending;
    return <span style={{ fontSize: 11, fontWeight: 700, background: c.bg, color: c.color, padding: '2px 8px', borderRadius: 4 }}>{c.label}</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: text, fontFamily: 'Georgia,serif' }}>🔥 Trend Manager</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadTrends} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, color: muted, cursor: 'pointer' }}>
            🔄 Refresh
          </button>
          {pending.length > 0 && (
            <button onClick={handleApproveAll} style={{ background: G.green, border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              ✅ Approve All Pending ({pending.length})
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 12, marginBottom: 20 }}>
        {(
          [
            ['All', trends.length, muted, 'all'],
            ['Approved', approved.length, G.green, 'approved'],
            ['Pending', pending.length, G.gold, 'pending'],
            ['Rejected', rejected.length, G.red, 'rejected'],
          ] as const
        ).map(([label, count, color, key]) => (
          <div
            key={label}
            onClick={() => setFilter(key)}
            style={{ background: card, border: `1px solid ${filter === key ? color : border}`, borderRadius: 10, padding: 14, textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{count}</div>
            <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 14 }}>➕ Add Topic Manually</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 12, color: muted, display: 'block', marginBottom: 5 }}>Topic / Hashtag</label>
            <input value={newTopic.topic} onChange={(e) => setNewTopic((n) => ({ ...n, topic: e.target.value }))} placeholder="#Davido, Super Eagles…" style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: muted, display: 'block', marginBottom: 5 }}>Volume</label>
            <input value={newTopic.volume} onChange={(e) => setNewTopic((n) => ({ ...n, volume: e.target.value }))} placeholder="50K" style={{ ...inp, width: 90 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: muted, display: 'block', marginBottom: 5 }}>Status</label>
            <select value={newTopic.status} onChange={(e) => setNewTopic((n) => ({ ...n, status: e.target.value }))} style={{ ...inp, width: 120 }}>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, whiteSpace: 'nowrap' }}
          >
            {saving ? 'Adding…' : 'Add Topic'}
          </button>
        </div>
      </div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}` }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: text }}>
            {filter === 'all' ? `All Topics (${trends.length})` : `${filter.charAt(0).toUpperCase() + filter.slice(1)} (${filtered.length})`}
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: muted }}>Loading trends…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: muted }}>No topics found.</div>
        ) : (
          filtered.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: muted, minWidth: 28, fontWeight: 700 }}>#{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: text }}>{t.topic}</div>
                <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                  👁 {t.volume || '—'} · {t.fetched_at ? new Date(t.fetched_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              </div>
              {statusBadge(t.status)}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {t.status !== 'approved' && (
                  <button onClick={() => handleApprove(t.id)} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✅ Approve
                  </button>
                )}
                {t.status !== 'rejected' && (
                  <button onClick={() => handleReject(t.id)} style={{ background: 'none', color: G.red, border: `1px solid ${G.red}`, borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                    ✕ Reject
                  </button>
                )}
                <button onClick={() => handleDelete(t.id)} style={{ background: 'none', color: muted, border: `1px solid ${border}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
