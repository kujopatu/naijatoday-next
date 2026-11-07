'use client';

import { useState } from 'react';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import WidgetCard from './WidgetCard';

// Approximate Nigeria CPI by year (2010 = 100), copied from the original
// site. These are rough estimates: update them when official NBS figures change.
const CPI: Record<number, number> = {
  2010: 100, 2011: 110.8, 2012: 122.8, 2013: 131.7, 2014: 142.5, 2015: 155.0, 2016: 185.0, 2017: 219.0,
  2018: 243.0, 2019: 264.0, 2020: 299.0, 2021: 342.0, 2022: 413.0, 2023: 532.0, 2024: 698.0, 2025: 900.0,
};
const YEARS = Object.keys(CPI).map(Number);

export default function InflationCalculator() {
  const { darkMode: D, border, text, muted } = useTheme();
  const [amount, setAmount] = useState('10000');
  const [fromYear, setFromYear] = useState(2015);
  const [toYear, setToYear] = useState(2025);
  const [result, setResult] = useState<{ adjusted: number; change: number; amt: number } | null>(null);

  const calculate = () => {
    const amt = parseFloat(amount.replace(/,/g, ''));
    if (!amt || isNaN(amt)) return;
    setResult({
      amt,
      adjusted: (amt * CPI[toYear]) / CPI[fromYear],
      change: ((CPI[toYear] - CPI[fromYear]) / CPI[fromYear]) * 100,
    });
  };

  const inp: React.CSSProperties = {
    background: D ? '#1e2535' : '#f5f7fa', border: `1px solid ${border}`, borderRadius: 6,
    padding: '7px 10px', fontSize: 13, color: text, width: '100%', boxSizing: 'border-box',
  };

  return (
    <WidgetCard title="📈 Inflation Calculator">
      <div style={{ fontSize: 11, color: muted, marginBottom: 10 }}>How much is ₦X from year Y worth today?</div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Amount (₦)</div>
        <input style={inp} type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 10000" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>From year</div>
          <select style={inp} value={fromYear} onChange={(e) => setFromYear(Number(e.target.value))}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>To year</div>
          <select style={inp} value={toYear} onChange={(e) => setToYear(Number(e.target.value))}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <button onClick={calculate} style={{ width: '100%', background: G.green, color: '#fff', border: 'none', borderRadius: 6, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
        Calculate
      </button>
      {result && (
        <div style={{ background: D ? '#0a1a10' : '#f0fdf4', border: `1px solid ${D ? '#1a3a20' : '#bbf7d0'}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>₦{result.amt.toLocaleString()} in {fromYear} equals:</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: G.green }}>₦{result.adjusted.toLocaleString('en-NG', { maximumFractionDigits: 0 })}</div>
          <div style={{ fontSize: 11, color: G.red, marginTop: 4 }}>in {toYear} money ({result.change >= 0 ? '+' : ''}{result.change.toFixed(0)}% price change)</div>
        </div>
      )}
      <div style={{ fontSize: 10, color: muted, marginTop: 8 }}>Estimates based on approximate CPI figures.</div>
    </WidgetCard>
  );
}
