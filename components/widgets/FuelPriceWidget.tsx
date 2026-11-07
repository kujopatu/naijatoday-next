'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FuelPrice } from '@/lib/fuel';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import WidgetCard from './WidgetCard';

// Reads the prices an admin keeps in Admin → Fuel Prices.
export default function FuelPriceWidget() {
  const { darkMode: D, border, text, muted } = useTheme();
  const [prices, setPrices] = useState<FuelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    supabase
      .from('fuel_prices')
      .select('*')
      .order('state', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setPrices(data as FuelPrice[]);
        setLoading(false);
      });
  }, []);

  if (!loading && prices.length === 0) return null;

  const visible = expanded ? prices : prices.slice(0, 5);
  const avg = prices.length ? Math.round(prices.reduce((s, p) => s + Number(p.price), 0) / prices.length) : 0;
  const latest = prices.length ? new Date(Math.max(...prices.map((p) => new Date(p.updated_at).getTime()))) : null;

  return (
    <WidgetCard title="⛽ Fuel Price Tracker" right={<div style={{ fontSize: 10, color: muted }}>Per litre</div>}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: muted, fontSize: 13 }}>Loading prices…</div>
      ) : (
        <>
          <div style={{ background: D ? '#1a1200' : '#fffbeb', border: `1px solid ${D ? '#3a2a00' : '#fde68a'}`, borderRadius: 8, padding: '8px 12px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: D ? '#fcd34d' : '#92400e' }}>National Average</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: D ? '#fcd34d' : '#b45309' }}>₦{avg.toLocaleString()}</div>
          </div>
          {visible.map(({ state, price, trend }) => (
            <div key={state} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${border}`, fontSize: 13 }}>
              <span style={{ color: muted }}>{state}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700, color: text }}>₦{Number(price).toLocaleString()}</span>
                <span style={{ fontSize: 12 }}>{trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️'}</span>
              </div>
            </div>
          ))}
          {prices.length > 5 && (
            <button onClick={() => setExpanded((e) => !e)} style={{ background: 'none', border: 'none', color: G.green, fontSize: 12, cursor: 'pointer', fontWeight: 600, marginTop: 8, padding: 0 }}>
              {expanded ? '▲ Show less' : `▼ See all ${prices.length} states`}
            </button>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ fontSize: 10, color: muted }}>Actual prices may vary by station.</div>
            {latest && <div style={{ fontSize: 10, color: muted }}>Updated: {latest.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
