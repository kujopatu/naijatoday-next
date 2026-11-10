'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '../ThemeProvider';

type ActivityEntry = {
  id: number;
  action: string;
  detail: string | null;
  admin_email: string | null;
  created_at: string;
};

type DateRange = '7' | '30' | '90' | 'all';

const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  return '"' + text.replace(/"/g, '""') + '"';
};

export default function ActivityLogPanel() {
  const { card, border, text, muted, darkMode } = useTheme();
  const [log, setLog] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [updatedAt, setUpdatedAt] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('admin_activity_log')
      .select('id,action,detail,admin_email,created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (queryError) {
      setError(queryError.message);
      setLog([]);
    } else {
      setLog((data ?? []) as ActivityEntry[]);
      setUpdatedAt(new Date().toLocaleString());
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const actions = useMemo(
    () => [...new Set(log.map((entry) => entry.action).filter(Boolean))].sort(),
    [log],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const cutoff = dateRange === 'all' ? 0 : Date.now() - Number(dateRange) * 24 * 60 * 60 * 1000;

    return log.filter((entry) => {
      const matchesDate = new Date(entry.created_at).getTime() >= cutoff;
      const matchesAction = actionFilter === 'all' || entry.action === actionFilter;
      const searchable = [entry.action, entry.detail, entry.admin_email].filter(Boolean).join(' ').toLowerCase();
      return matchesDate && matchesAction && (!query || searchable.includes(query));
    });
  }, [log, search, actionFilter, dateRange]);

  const exportCsv = () => {
    const rows = [
      ['Date', 'Administrator', 'Action', 'Details'],
      ...filtered.map((entry) => [
        new Date(entry.created_at).toISOString(),
        entry.admin_email || '',
        entry.action,
        entry.detail || '',
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `naijatoday-admin-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const inputStyle: React.CSSProperties = {
    minWidth: 150,
    flex: '1 1 150px',
    padding: '9px 11px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: darkMode ? '#111520' : '#f5f7fa',
    color: text,
    fontSize: 12,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 6, fontFamily: 'Georgia,serif' }}>📜 Admin Activity Log</div>
          <div style={{ fontSize: 13, color: muted }}>Search and review up to 500 recent recorded admin actions.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void load()} disabled={loading} style={{ background: 'transparent', color: text, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 12px', cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
          <button onClick={exportCsv} disabled={loading || filtered.length === 0} style={{ background: '#16834a', color: '#fff', border: 0, borderRadius: 8, padding: '9px 12px', fontWeight: 700, cursor: filtered.length ? 'pointer' : 'not-allowed', opacity: filtered.length ? 1 : 0.55 }}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <input aria-label="Search activity" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search action, detail or admin…" style={inputStyle} />
        <select aria-label="Filter by action" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} style={inputStyle}>
          <option value="all">All actions</option>
          {actions.map((action) => <option key={action} value={action}>{action}</option>)}
        </select>
        <select aria-label="Filter by date" value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRange)} style={inputStyle}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All loaded dates</option>
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', color: muted, fontSize: 11, marginBottom: 12 }}>
        <span>{filtered.length.toLocaleString('en-NG')} matching actions · {log.length.toLocaleString('en-NG')} loaded</span>
        <span>{updatedAt ? `Updated ${updatedAt}` : ''}</span>
      </div>

      {error && <div style={{ color: '#dc2626', fontSize: 13, padding: 12, border: '1px solid #dc2626', borderRadius: 8, marginBottom: 12 }}>Could not load activity log: {error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: muted }}>Loading activity…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: 18, color: muted, fontSize: 13 }}>
          {log.length === 0 ? 'No activity records were found.' : 'No actions match these filters. Try a wider date range or clear the search.'}
        </div>
      ) : (
        filtered.map((entry) => (
          <div key={entry.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, color: text, fontWeight: 650 }}>
                {entry.action}{entry.detail ? ` — ${entry.detail}` : ''}
              </div>
              <div style={{ fontSize: 11, color: muted, whiteSpace: 'nowrap' }}>{new Date(entry.created_at).toLocaleString()}</div>
            </div>
            <div style={{ fontSize: 11, color: muted, marginTop: 5 }}>Administrator: {entry.admin_email || 'Unknown'}</div>
          </div>
        ))
      )}

      <div style={{ fontSize: 11, color: muted, marginTop: 14 }}>
        This log displays only actions that the application has recorded. It is not a complete record of every database or hosting-platform change. {log.length >= 500 ? 'The view is capped at the 500 most recent records.' : ''}
      </div>
    </div>
  );
}
