'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DataPlan } from '@/lib/plans';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import WidgetCard from './WidgetCard';

const ACTIVITIES = [
  { name: 'WhatsApp chats', mbPerHour: 1 },
  { name: 'WhatsApp calls', mbPerHour: 30 },
  { name: 'YouTube (360p)', mbPerHour: 250 },
  { name: 'YouTube (720p)', mbPerHour: 700 },
  { name: 'TikTok browsing', mbPerHour: 300 },
  { name: 'Instagram browsing', mbPerHour: 150 },
  { name: 'Music streaming', mbPerHour: 60 },
  { name: 'Web browsing', mbPerHour: 50 },
  { name: 'Zoom call (720p)', mbPerHour: 450 },
];

// "How long will my data last?" using the plans kept in Admin → Data Plans.
export default function DataCalculator() {
  const { darkMode: D, border, text, muted } = useTheme();
  const [grouped, setGrouped] = useState<Record<string, DataPlan[]>>({});
  const [loading, setLoading] = useState(true);
  const [network, setNetwork] = useState('');
  const [planIdx, setPlanIdx] = useState(0);
  const [activity, setActivity] = useState(0);
  const [hours, setHours] = useState(1);

  useEffect(() => {
    supabase
      .from('data_plans')
      .select('*')
      .order('network', { ascending: true })
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && data.length) {
          const g: Record<string, DataPlan[]> = {};
          (data as DataPlan[]).forEach((p) => {
            (g[p.network] ||= []).push(p);
          });
          setGrouped(g);
          setNetwork(Object.keys(g)[0]);
        }
        setLoading(false);
      });
  }, []);

  const networks = Object.keys(grouped);
  if (loading) {
    return (
      <WidgetCard title="📱 Data Calculator">
        <div style={{ textAlign: 'center', color: muted, fontSize: 13 }}>Loading data plans…</div>
      </WidgetCard>
    );
  }
  if (networks.length === 0) return null;

  const plans = grouped[network] || [];
  const plan = plans[Math.min(planIdx, plans.length - 1)];
  const act = ACTIVITIES[activity];
  const usedMB = act.mbPerHour * hours;
  const dataMB = Math.max(1, plan.data_mb);
  const remaining = Math.max(0, dataMB - usedMB);
  const pct = Math.min(100, Math.round((usedMB / dataMB) * 100));
  const hoursLeft = remaining / act.mbPerHour;

  const inp: React.CSSProperties = {
    background: D ? '#1e2535' : '#f5f7fa', border: `1px solid ${border}`, borderRadius: 6,
    padding: '7px 10px', fontSize: 12, color: text, width: '100%', boxSizing: 'border-box',
  };
  const box = D ? '#111520' : '#f5f7fa';

  return (
    <WidgetCard title="📱 Data Calculator">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Network</div>
          <select style={inp} value={network} onChange={(e) => { setNetwork(e.target.value); setPlanIdx(0); }}>
            {networks.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Plan</div>
          <select style={inp} value={planIdx} onChange={(e) => setPlanIdx(Number(e.target.value))}>
            {plans.map((p, i) => <option key={p.id} value={i}>{p.name} — ₦{Number(p.price).toLocaleString()}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Activity</div>
        <select style={inp} value={activity} onChange={(e) => setActivity(Number(e.target.value))}>
          {ACTIVITIES.map((a, i) => <option key={a.name} value={i}>{a.name} (~{a.mbPerHour}MB/hr)</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Hours per day: <strong>{hours}h</strong></div>
        <input type="range" min={0.5} max={12} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div style={{ background: D ? '#1e2535' : '#f0f0f0', borderRadius: 6, height: 10, marginBottom: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? G.red : pct > 50 ? '#F4A800' : G.green, borderRadius: 6, transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div style={{ background: box, borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: muted }}>Used per day</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: pct > 80 ? G.red : text }}>
            {usedMB >= 1024 ? (usedMB / 1024).toFixed(1) + 'GB' : usedMB.toFixed(0) + 'MB'}
          </div>
        </div>
        <div style={{ background: box, borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: muted }}>Data lasts</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: G.green }}>
            {remaining <= 0 ? 'Not enough' : hoursLeft >= 24 ? `${((remaining / dataMB) * plan.days).toFixed(0)} days` : `${hoursLeft.toFixed(1)} hrs`}
          </div>
        </div>
      </div>
      {pct > 80 && <div style={{ fontSize: 11, color: G.red, marginTop: 8, fontWeight: 600 }}>⚠️ This activity will use {pct}% of your {plan.name} in one day!</div>}
    </WidgetCard>
  );
}
