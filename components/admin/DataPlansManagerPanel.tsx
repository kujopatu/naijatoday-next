'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DataPlan } from '@/lib/plans';
import { G } from '@/lib/theme';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

type EditedMap = Record<number, { price: string; data_mb: string; days: string }>;
const emptyPlan = { network: 'MTN', name: '', price: '', data_mb: '', days: '30', sort_order: '0' };

export default function DataPlansManagerPanel() {
  const { showToast } = useToast();
  const { card, border, text, muted, darkMode } = useTheme();
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState<EditedMap>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlan, setNewPlan] = useState(emptyPlan);

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: darkMode ? '#111520' : '#f5f7fa',
    color: text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Georgia,serif',
  };

  const loadPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('data_plans').select('*').order('network', { ascending: true }).order('sort_order', { ascending: true });
    if (!error && data) {
      const rows = data as DataPlan[];
      setPlans(rows);
      const map: EditedMap = {};
      rows.forEach((p) => {
        map[p.id] = { price: String(p.price), data_mb: String(p.data_mb), days: String(p.days) };
      });
      setEdited(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPlans();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (id: number, field: 'price' | 'data_mb' | 'days', value: string) => {
    setEdited((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setHasChanges(true);
  };

  const saveAll = async () => {
    setSaving(true);
    let success = true;
    for (const p of plans) {
      const e = edited[p.id];
      if (!e) continue;
      const { error } = await supabase
        .from('data_plans')
        .update({ price: parseInt(e.price, 10), data_mb: parseInt(e.data_mb, 10), days: parseInt(e.days, 10), updated_at: new Date().toISOString() })
        .eq('id', p.id);
      if (error) {
        success = false;
        showToast(`❌ ${p.network} ${p.name}: ${error.message}`);
      }
    }
    setSaving(false);
    setHasChanges(false);
    if (success) {
      showToast('✅ Data plans updated!');
      loadPlans();
    }
  };

  const handleAddPlan = async () => {
    if (!newPlan.name || !newPlan.price || !newPlan.data_mb) {
      showToast('Fill in name, price and data size');
      return;
    }
    const { error } = await supabase.from('data_plans').insert([
      {
        network: newPlan.network,
        name: newPlan.name,
        price: parseInt(newPlan.price, 10),
        data_mb: parseInt(newPlan.data_mb, 10),
        days: parseInt(newPlan.days, 10) || 30,
        sort_order: parseInt(newPlan.sort_order, 10) || 0,
      },
    ]);
    if (error) {
      showToast(`❌ Add failed: ${error.message}`);
      return;
    }
    showToast('✅ Plan added!');
    setNewPlan(emptyPlan);
    setShowAddForm(false);
    loadPlans();
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('data_plans').delete().eq('id', id);
    if (error) {
      showToast(`❌ Delete failed: ${error.message}`);
      return;
    }
    showToast('✅ Plan deleted');
    loadPlans();
  };

  const networks = Array.from(new Set(plans.map((p) => p.network)));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: text, fontFamily: 'Georgia,serif' }}>📱 Data Plans Manager</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAddForm((s) => !s)} style={{ background: 'none', border: `1px solid ${border}`, color: text, borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {showAddForm ? '✕ Cancel' : '➕ Add Plan'}
          </button>
          <button
            onClick={saveAll}
            disabled={!hasChanges || saving}
            style={{ background: hasChanges ? G.green : '#444', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: hasChanges ? 'pointer' : 'not-allowed', opacity: hasChanges ? 1 : 0.5 }}
          >
            {saving ? 'Saving…' : '💾 Save All Changes'}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div style={{ background: darkMode ? '#1a1200' : '#fffbeb', border: `1px solid ${darkMode ? '#3a2a00' : '#fde68a'}`, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: darkMode ? '#fcd34d' : '#92400e', fontWeight: 600 }}>
          ⚠️ You have unsaved changes — click &quot;Save All Changes&quot; to apply them.
        </div>
      )}

      <div style={{ background: darkMode ? '#0d1520' : '#f0fdf4', border: `1px solid ${darkMode ? '#1a2a1a' : '#bbf7d0'}`, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: darkMode ? '#86efac' : '#166534' }}>
        💡 Update prices below. Changes go live on the site instantly — no redeploy needed.
      </div>

      {showAddForm && (
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 12 }}>Add New Plan</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Network</label>
              <select style={inp} value={newPlan.network} onChange={(e) => setNewPlan((p) => ({ ...p, network: e.target.value }))}>
                {['MTN', 'Airtel', 'Glo', '9mobile'].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Plan Name</label>
              <input style={inp} placeholder="e.g. 2GB" value={newPlan.name} onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Price (₦)</label>
              <input style={inp} type="number" placeholder="800" value={newPlan.price} onChange={(e) => setNewPlan((p) => ({ ...p, price: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Data (MB)</label>
              <input style={inp} type="number" placeholder="2048" value={newPlan.data_mb} onChange={(e) => setNewPlan((p) => ({ ...p, data_mb: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Validity (days)</label>
              <input style={inp} type="number" placeholder="30" value={newPlan.days} onChange={(e) => setNewPlan((p) => ({ ...p, days: e.target.value }))} />
            </div>
          </div>
          <button onClick={handleAddPlan} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            🚀 Add Plan
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: muted }}>⏳ Loading plans…</div>
      ) : (
        networks.map((net) => (
          <div key={net} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: G.green, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{net}</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {plans
                .filter((p) => p.network === net)
                .map((p) => (
                  <div key={p.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 70, fontSize: 14, fontWeight: 700, color: text }}>{p.name}</div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <label style={{ fontSize: 10, color: muted, display: 'block', marginBottom: 3 }}>Price (₦)</label>
                      <input type="number" value={edited[p.id]?.price ?? p.price} onChange={(e) => handleChange(p.id, 'price', e.target.value)} style={inp} />
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <label style={{ fontSize: 10, color: muted, display: 'block', marginBottom: 3 }}>Data (MB)</label>
                      <input type="number" value={edited[p.id]?.data_mb ?? p.data_mb} onChange={(e) => handleChange(p.id, 'data_mb', e.target.value)} style={inp} />
                    </div>
                    <div style={{ minWidth: 90 }}>
                      <label style={{ fontSize: 10, color: muted, display: 'block', marginBottom: 3 }}>Days</label>
                      <input type="number" value={edited[p.id]?.days ?? p.days} onChange={(e) => handleChange(p.id, 'days', e.target.value)} style={inp} />
                    </div>
                    <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: `1px solid ${G.red}`, color: G.red, borderRadius: 6, padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                      🗑️
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
