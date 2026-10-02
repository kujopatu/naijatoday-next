'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FuelPrice } from '@/lib/fuel';
import { G } from '@/lib/theme';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

type EditedMap = Record<number, { price: string; trend: string }>;

export default function FuelPriceManagerPanel() {
  const { showToast } = useToast();
  const { card, border, text, muted, darkMode } = useTheme();
  const [prices, setPrices] = useState<FuelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState<EditedMap>({});
  const [hasChanges, setHasChanges] = useState(false);

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

  const loadPrices = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('fuel_prices').select('*').order('state', { ascending: true });
    if (!error && data) {
      const rows = data as FuelPrice[];
      setPrices(rows);
      const map: EditedMap = {};
      rows.forEach((p) => {
        map[p.id] = { price: String(p.price), trend: p.trend };
      });
      setEdited(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPrices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (id: number, field: 'price' | 'trend', value: string) => {
    setEdited((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setHasChanges(true);
  };

  const saveAll = async () => {
    setSaving(true);
    let success = true;
    for (const p of prices) {
      const e = edited[p.id];
      if (!e) continue;
      const { error } = await supabase.from('fuel_prices').update({ price: parseInt(e.price, 10), trend: e.trend, updated_at: new Date().toISOString() }).eq('id', p.id);
      if (error) success = false;
    }
    setSaving(false);
    setHasChanges(false);
    if (success) {
      showToast('✅ Fuel prices updated!');
      loadPrices();
    } else showToast('❌ Some updates failed. Try again.');
  };

  const trendOptions = ['stable', 'up', 'down'];
  const trendEmoji: Record<string, string> = { stable: '➡️ Stable', up: '📈 Up', down: '📉 Down' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: text, fontFamily: 'Georgia,serif' }}>⛽ Fuel Price Manager</div>
        <button
          onClick={saveAll}
          disabled={!hasChanges || saving}
          style={{ background: hasChanges ? G.green : '#444', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: hasChanges ? 'pointer' : 'not-allowed', opacity: hasChanges ? 1 : 0.5 }}
        >
          {saving ? 'Saving…' : '💾 Save All Changes'}
        </button>
      </div>

      {hasChanges && (
        <div style={{ background: darkMode ? '#1a1200' : '#fffbeb', border: `1px solid ${darkMode ? '#3a2a00' : '#fde68a'}`, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: darkMode ? '#fcd34d' : '#92400e', fontWeight: 600 }}>
          ⚠️ You have unsaved changes — click &quot;Save All Changes&quot; to apply them.
        </div>
      )}

      <div style={{ background: darkMode ? '#0d1520' : '#f0fdf4', border: `1px solid ${darkMode ? '#1a2a1a' : '#bbf7d0'}`, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: darkMode ? '#86efac' : '#166534' }}>
        💡 Update prices below. Changes go live on the site instantly — no redeploy needed.
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: muted }}>⏳ Loading prices…</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {prices.map((p) => (
            <div key={p.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 100, fontSize: 14, fontWeight: 700, color: text }}>{p.state}</div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Price per litre (₦)</label>
                <input type="number" value={edited[p.id]?.price ?? p.price} onChange={(e) => handleChange(p.id, 'price', e.target.value)} style={{ ...inp, fontSize: 15, fontWeight: 700 }} />
              </div>
              <div style={{ minWidth: 140 }}>
                <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Trend</label>
                <select value={edited[p.id]?.trend ?? p.trend} onChange={(e) => handleChange(p.id, 'trend', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  {trendOptions.map((t) => (
                    <option key={t} value={t}>
                      {trendEmoji[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: 11, color: muted, minWidth: 120 }}>
                Last updated:
                <br />
                <span style={{ color: text, fontWeight: 600 }}>{new Date(p.updated_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
