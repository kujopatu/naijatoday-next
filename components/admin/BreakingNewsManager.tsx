'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

type BreakingItem = { id: string; text: string; active: boolean; created_at: string };

export default function BreakingNewsManager() {
  const { showToast } = useToast();
  const { card, border, text, muted } = useTheme();
  const [items, setItems] = useState<BreakingItem[]>([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: '#111520',
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Georgia,serif',
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('breaking_news').select('*').order('created_at', { ascending: false });
      if (error) showToast("Couldn't load breaking news: " + error.message);
      else if (data) setItems(data as BreakingItem[]);
    } catch {
      showToast('Connection error loading breaking news');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!newText.trim()) {
      showToast('Please enter breaking news text');
      return;
    }
    const txt = newText.trim().startsWith('🔴') ? newText.trim() : '🔴 BREAKING: ' + newText.trim();
    setSaving(true);
    try {
      const { error } = await supabase.from('breaking_news').insert([{ text: txt, active: true, created_at: new Date().toISOString() }]);
      if (error) showToast('Error: ' + error.message);
      else {
        showToast('Breaking news added! 🔴');
        setNewText('');
        loadItems();
      }
    } catch {
      showToast('Connection error');
    }
    setSaving(false);
  };

  const handleToggle = async (item: BreakingItem) => {
    try {
      const { error } = await supabase.from('breaking_news').update({ active: !item.active }).eq('id', item.id);
      if (error) showToast('Error: ' + error.message);
      else {
        showToast(item.active ? 'Deactivated' : 'Activated ✅');
        loadItems();
      }
    } catch {
      showToast('Connection error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('breaking_news').delete().eq('id', id);
      if (error) showToast('Error: ' + error.message);
      else {
        showToast('Deleted');
        loadItems();
      }
    } catch {
      showToast('Connection error');
    }
  };

  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 24 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 6, fontFamily: 'Georgia,serif' }}>🔴 Breaking News Manager</div>
      <p style={{ fontSize: 13, color: muted, marginBottom: 24 }}>Add, activate, or remove items in the red breaking news ticker.</p>

      <div style={{ background: '#111520', borderRadius: 10, padding: 16, marginBottom: 24, border: `1px solid ${border}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>➕ Add New Breaking News</div>
        <input
          type="text"
          placeholder="e.g. Senate orders arrest of Mele Kyari"
          style={{ ...inp, marginBottom: 8 }}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>💡 &quot;🔴 BREAKING:&quot; prefix added automatically.</div>
        <button
          onClick={handleAdd}
          disabled={saving}
          style={{ background: '#C1292E', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 28px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Adding…' : '🔴 Add to Ticker'}
        </button>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 12 }}>📋 All Breaking News ({items.length})</div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: muted }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: muted }}>No breaking news yet. Add one above!</div>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            style={{
              background: '#111520',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 10,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              border: `1px solid ${item.active ? '#C1292E44' : border}`,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, fontSize: 13, color: item.active ? '#e2e8f0' : muted, lineHeight: 1.5, minWidth: 200 }}>{item.text}</div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => handleToggle(item)}
                style={{
                  background: item.active ? '#C1292E22' : '#00875122',
                  color: item.active ? '#C1292E' : '#008751',
                  border: `1px solid ${item.active ? '#C1292E44' : '#00875144'}`,
                  borderRadius: 6,
                  padding: '5px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {item.active ? '⏸ Deactivate' : '▶️ Activate'}
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                style={{ background: '#C1292E22', color: '#C1292E', border: '1px solid #C1292E44', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
