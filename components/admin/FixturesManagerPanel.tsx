'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Fixture } from '@/lib/fixtures';
import { G } from '@/lib/theme';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

type FixtureForm = {
  competition: string;
  home_team: string;
  away_team: string;
  kickoff_display: string;
  home_score: string;
  away_score: string;
  status: string;
  sort_order: string;
  active: boolean;
};
const emptyFixture: FixtureForm = {
  competition: 'Football',
  home_team: '',
  away_team: '',
  kickoff_display: '',
  home_score: '',
  away_score: '',
  status: 'upcoming',
  sort_order: '0',
  active: true,
};

export default function FixturesManagerPanel() {
  const { showToast } = useToast();
  const { card, border, text, muted, darkMode } = useTheme();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FixtureForm>(emptyFixture);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  const loadFixtures = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('fixtures').select('*').order('sort_order', { ascending: true });
      if (!error && data) setFixtures(data as Fixture[]);
      else if (error) showToast('Error loading fixtures: ' + error.message);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFixtures();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!form.home_team || !form.away_team) {
      showToast('Please fill in both team names');
      return;
    }
    setSaving(true);
    const payload = {
      competition: form.competition,
      home_team: form.home_team,
      away_team: form.away_team,
      kickoff_display: form.kickoff_display,
      home_score: form.home_score === '' ? null : parseInt(form.home_score, 10),
      away_score: form.away_score === '' ? null : parseInt(form.away_score, 10),
      status: form.status,
      sort_order: form.sort_order ? parseInt(form.sort_order, 10) : 0,
      active: form.active,
      updated_at: new Date().toISOString(),
    };
    try {
      if (editId !== null) {
        const { error } = await supabase.from('fixtures').update(payload).eq('id', editId);
        if (error) {
          showToast('Error: ' + error.message);
          setSaving(false);
          return;
        }
        showToast('Fixture updated! ✅');
      } else {
        const { error } = await supabase.from('fixtures').insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) {
          showToast('Error: ' + error.message);
          setSaving(false);
          return;
        }
        showToast('Fixture added! 🎉');
      }
      setForm(emptyFixture);
      setEditId(null);
      setShowForm(false);
      loadFixtures();
    } catch {
      showToast('Connection error');
    }
    setSaving(false);
  };

  const handleEdit = (f: Fixture) => {
    setForm({
      competition: f.competition || 'Football',
      home_team: f.home_team || '',
      away_team: f.away_team || '',
      kickoff_display: f.kickoff_display || '',
      home_score: f.home_score === null || f.home_score === undefined ? '' : String(f.home_score),
      away_score: f.away_score === null || f.away_score === undefined ? '' : String(f.away_score),
      status: f.status || 'upcoming',
      sort_order: f.sort_order ? String(f.sort_order) : '0',
      active: f.active !== false,
    });
    setEditId(f.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this fixture?')) return;
    const { error } = await supabase.from('fixtures').delete().eq('id', id);
    if (error) {
      showToast('Delete failed: ' + error.message);
      return;
    }
    showToast('Fixture deleted');
    loadFixtures();
  };

  const toggleSelect = (id: number) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === fixtures.length ? [] : fixtures.map((f) => f.id));

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected fixture(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const { error } = await supabase.from('fixtures').delete().in('id', selectedIds);
      if (error) {
        showToast('Bulk delete failed: ' + error.message);
        setBulkDeleting(false);
        return;
      }
      showToast(`🗑️ Deleted ${selectedIds.length} fixture(s)`);
      setSelectedIds([]);
      loadFixtures();
    } catch {
      showToast('Connection error during bulk delete');
    }
    setBulkDeleting(false);
  };

  const handleToggleActive = async (f: Fixture) => {
    const { error } = await supabase.from('fixtures').update({ active: !f.active }).eq('id', f.id);
    if (error) {
      showToast('Error: ' + error.message);
      return;
    }
    loadFixtures();
  };

  const statusColors: Record<string, string> = { upcoming: G.gold, live: G.red, finished: G.green };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: text, fontFamily: 'Georgia,serif' }}>⚽ Fixtures &amp; Scores Manager ({fixtures.length})</div>
        <button
          onClick={() => {
            setShowForm((s) => !s);
            if (showForm) {
              setEditId(null);
              setForm(emptyFixture);
            }
          }}
          style={{ background: showForm ? 'none' : G.green, color: showForm ? text : '#fff', border: `1px solid ${showForm ? border : G.green}`, borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          {showForm ? '✕ Cancel' : '➕ Add Fixture'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 14 }}>{editId !== null ? 'Edit Fixture' : 'New Fixture'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 10 }}>
            <input placeholder="Competition" style={inp} value={form.competition} onChange={(e) => setForm((f) => ({ ...f, competition: e.target.value }))} />
            <input placeholder="Home team *" style={inp} value={form.home_team} onChange={(e) => setForm((f) => ({ ...f, home_team: e.target.value }))} />
            <input placeholder="Away team *" style={inp} value={form.away_team} onChange={(e) => setForm((f) => ({ ...f, away_team: e.target.value }))} />
            <input placeholder="Kickoff (e.g. Sat, 4:30 PM WAT)" style={inp} value={form.kickoff_display} onChange={(e) => setForm((f) => ({ ...f, kickoff_display: e.target.value }))} />
            <input placeholder="Home score" type="number" style={inp} value={form.home_score} onChange={(e) => setForm((f) => ({ ...f, home_score: e.target.value }))} />
            <input placeholder="Away score" type="number" style={inp} value={form.away_score} onChange={(e) => setForm((f) => ({ ...f, away_score: e.target.value }))} />
            <select style={inp} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {['upcoming', 'live', 'finished'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input placeholder="Sort order" type="number" style={inp} value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={handleSave} disabled={saving} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : editId !== null ? 'Update Fixture' : 'Add Fixture'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: `1px solid ${border}`, color: muted, borderRadius: 8, padding: '10px 24px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {fixtures.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap', background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: text, cursor: 'pointer' }}>
            <input type="checkbox" checked={selectedIds.length === fixtures.length} onChange={toggleSelectAll} style={{ width: 16, height: 16, accentColor: G.green }} />
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
          </label>
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} disabled={bulkDeleting} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: `1px solid ${G.red}`, color: G.red, background: 'none', cursor: 'pointer' }}>
              🗑 Delete Selected
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: muted }}>⏳ Loading fixtures…</div>
      ) : fixtures.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: muted }}>No fixtures yet — click &quot;Add Fixture&quot; to create your first one.</div>
      ) : (
        fixtures.map((f) => (
          <div key={f.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 14, marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', opacity: f.active ? 1 : 0.5 }}>
            <input type="checkbox" checked={selectedIds.includes(f.id)} onChange={() => toggleSelect(f.id)} style={{ width: 16, height: 16, accentColor: G.green, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 13, color: muted, marginBottom: 2 }}>{f.competition}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: text }}>
                {f.home_team} <span style={{ color: muted }}>{f.home_score ?? '-'} : {f.away_score ?? '-'}</span> {f.away_team}
              </div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                {f.kickoff_display} · <span style={{ color: statusColors[f.status] || muted, fontWeight: 700, textTransform: 'uppercase' }}>{f.status}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => handleToggleActive(f)} style={{ background: 'none', border: `1px solid ${border}`, color: text, borderRadius: 6, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>
                {f.active ? 'Hide' : 'Show'}
              </button>
              <button onClick={() => handleEdit(f)} style={{ background: 'none', border: `1px solid ${border}`, color: text, borderRadius: 6, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>
                ✏️ Edit
              </button>
              <button onClick={() => handleDelete(f.id)} style={{ background: 'none', border: `1px solid ${G.red}`, color: G.red, borderRadius: 6, padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                🗑️
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
