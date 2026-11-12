'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type BreakingItem = { id: string; text: string; link?: string | null; source?: string | null; created_at?: string | null };

const ALERTS_KEY = 'naijatoday-breaking-alerts';

export default function BreakingNewsBar() {
  const [items, setItems] = useState<BreakingItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('breaking_news')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(5);
        if (active && data) setItems(data as BreakingItem[]);
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setAlertsEnabled(localStorage.getItem(ALERTS_KEY) === 'on' && Notification.permission === 'granted');
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  useEffect(() => {
    if (!alertsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    let lastChecked = new Date().toISOString();
    let active = true;

    const checkForBreakingNews = async () => {
      try {
        const { data, error } = await supabase
          .from('breaking_news')
          .select('id,text,created_at')
          .eq('active', true)
          .gt('created_at', lastChecked)
          .order('created_at', { ascending: true })
          .limit(20);
        if (!active || error) return;
        lastChecked = new Date().toISOString();
        (data ?? []).forEach((item: { id: string; text: string }) => {
          try {
            const notification = new Notification('NaijaToday — Breaking News', {
              body: item.text.replace(/^🔴\\s*BREAKING:\\s*/i, ''),
              icon: '/icon-192.png',
              tag: `naijatoday-breaking-${item.id}`,
            });
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } catch {}
        });
      } catch {}
    };

    const timer = window.setInterval(checkForBreakingNews, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [alertsEnabled]);

  const enableAlerts = async () => {
    if (!('Notification' in window)) {
      setAlertMessage('This browser does not support notifications.');
      return;
    }
    if (!window.isSecureContext) {
      setAlertMessage('Alerts require a secure HTTPS connection.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem(ALERTS_KEY, 'on');
        setAlertsEnabled(true);
        setAlertMessage('Breaking news alerts enabled on this device.');
      } else {
        localStorage.removeItem(ALERTS_KEY);
        setAlertsEnabled(false);
        setAlertMessage(permission === 'denied' ? 'Notifications are blocked in your browser settings.' : 'You can enable alerts whenever you are ready.');
      }
    } catch {
      setAlertMessage('Unable to enable alerts in this browser.');
    }
    window.setTimeout(() => setAlertMessage(''), 4500);
  };

  const disableAlerts = () => {
    localStorage.removeItem(ALERTS_KEY);
    setAlertsEnabled(false);
    setAlertMessage('Breaking news alerts turned off on this device.');
    window.setTimeout(() => setAlertMessage(''), 3500);
  };

  if (items.length === 0 && !alertsEnabled) return null;
  const current = items[idx] ?? items[0];

  return (
    <div style={{ background: 'linear-gradient(90deg, #c0392b, #e74c3c)', padding: '7px 0' }}>
      <style>{`@keyframes naija-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}`}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {items.length > 0 && (
          <>
            <span style={{ background: '#fff', color: '#c0392b', fontWeight: 800, fontSize: 11, padding: '3px 10px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#c0392b', display: 'inline-block', animation: 'naija-pulse 1.2s ease-in-out infinite' }} />
              BREAKING
            </span>
            {current?.source && current.source !== 'NaijaToday' && (
              <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0, textTransform: 'uppercase' }}>
                {current.source}
              </span>
            )}
            {current?.link ? (
              <a href={current.link} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', flex: 1 }}>
                {current.text}<span style={{ fontSize: 11, marginLeft: 6, opacity: 0.8 }}>→</span>
              </a>
            ) : (
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {current?.text}
              </span>
            )}
          </>
        )}
        <button
          onClick={alertsEnabled ? disableAlerts : enableAlerts}
          title={alertsEnabled ? 'Turn off breaking news alerts on this device' : 'Enable breaking news alerts on this device'}
          style={{ marginLeft: 'auto', flexShrink: 0, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.45)', color: '#fff', borderRadius: 6, padding: '5px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          {alertsEnabled ? '🔔 Alerts On' : '🔔 Get Alerts'}
        </button>
      </div>
      {alertMessage && (
        <div role="status" style={{ maxWidth: 1200, margin: '5px auto 0', padding: '0 16px', color: '#fff', fontSize: 11 }}>
          {alertMessage}
        </div>
      )}
    </div>
  );
}
