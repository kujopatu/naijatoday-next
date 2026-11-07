'use client';

import { useEffect, useState } from 'react';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import WidgetCard from './WidgetCard';

type Rates = { NGN: number; GBP: number; EUR: number; CAD: number };

// Live USD rates from a free public API, refreshed every 10 minutes.
// If the API can't be reached we say so instead of showing made-up numbers.
export default function NairaRateWidget() {
  const { darkMode: D, text, muted } = useTheme();
  const [rates, setRates] = useState<Rates | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        if (!active) return;
        if (data?.rates?.NGN) {
          setRates({ NGN: data.rates.NGN, GBP: data.rates.GBP, EUR: data.rates.EUR, CAD: data.rates.CAD });
          setUpdated(new Date());
          setFailed(false);
        } else setFailed(true);
      } catch {
        if (active) setFailed(true);
      }
      if (active) setLoading(false);
    };
    load();
    const t = setInterval(load, 10 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const boxBg = D ? '#111520' : '#f5f7fa';
  const cells = rates
    ? [
        { label: 'USD/GBP', symbol: '£', val: rates.GBP, digits: 4 },
        { label: 'USD/EUR', symbol: '€', val: rates.EUR, digits: 4 },
        { label: 'GBP/NGN', symbol: '₦', val: rates.GBP ? rates.NGN / rates.GBP : null, digits: 0 },
        { label: 'USD/CAD', symbol: 'C$', val: rates.CAD, digits: 4 },
      ]
    : [];

  return (
    <WidgetCard
      title="💱 Exchange Rates"
      right={updated && <div style={{ fontSize: 10, color: muted }}>Updated {updated.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</div>}
    >
      {loading ? (
        <div style={{ fontSize: 13, color: muted, textAlign: 'center', padding: '8px 0' }}>Loading rates…</div>
      ) : !rates ? (
        <div style={{ fontSize: 13, color: muted, textAlign: 'center', padding: '8px 0' }}>{failed ? 'Rates are unavailable right now.' : ''}</div>
      ) : (
        <>
          <div style={{ background: D ? '#0a1a10' : '#f0fdf4', border: `1px solid ${D ? '#1a3a20' : '#bbf7d0'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: muted, marginBottom: 2 }}>USD / NGN</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: G.green }}>₦{rates.NGN.toLocaleString('en-NG', { maximumFractionDigits: 0 })}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {cells.map(({ label, symbol, val, digits }) => (
              <div key={label} style={{ background: boxBg, borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: muted, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: text }}>
                  {symbol}
                  {val ? val.toLocaleString('en-NG', { maximumFractionDigits: digits }) : '—'}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: muted, marginTop: 8, textAlign: 'center' }}>Market rates · Refreshes every 10 minutes</div>
        </>
      )}
    </WidgetCard>
  );
}
