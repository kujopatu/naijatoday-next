'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SOCIAL_LINKS_DEFAULTS, SOCIAL_PLATFORM_META, SocialLinks } from '@/lib/social';
import { G } from '@/lib/theme';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

export default function SocialLinksManagerPanel() {
  const { showToast } = useToast();
  const { card, border, text, muted, darkMode } = useTheme();
  const [links, setLinks] = useState<SocialLinks>({ ...SOCIAL_LINKS_DEFAULTS });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('site_settings').select('value').eq('key', 'social_links').maybeSingle();
        if (data?.value) setLinks((prev) => ({ ...prev, ...JSON.parse(data.value) }));
      } catch {}
    })();
  }, []);

  const handleChange = (key: keyof SocialLinks, val: string) => {
    setLinks((l) => ({ ...l, [key]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert([{ key: 'social_links', value: JSON.stringify(links), updated_at: new Date().toISOString() }], { onConflict: 'key' });
      if (error) {
        showToast('Error: ' + error.message);
        setSaving(false);
        return;
      }
      setDirty(false);
      showToast('Social links saved ✅ — changes are live immediately!');
    } catch {
      showToast('Connection error');
    }
    setSaving(false);
  };

  const handleReset = () => {
    setLinks({ ...SOCIAL_LINKS_DEFAULTS });
    setDirty(true);
  };

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: darkMode ? '#111520' : '#f5f7fa',
    color: text,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Georgia,serif',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: text, fontFamily: 'Georgia,serif' }}>🔗 Social Links Manager</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>Update your social media URLs — changes go live on the site instantly.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleReset} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 8, padding: '9px 16px', fontSize: 13, color: muted, cursor: 'pointer' }}>
            ↩ Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{ background: dirty ? G.green : '#444', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, color: '#fff', fontWeight: 700, cursor: saving || !dirty ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : '💾 Save All Changes'}
          </button>
        </div>
      </div>

      {dirty && (
        <div style={{ background: G.gold + '22', border: `1px solid ${G.gold}`, borderRadius: 8, padding: '10px 16px', margin: '16px 0', fontSize: 13, color: G.gold, fontWeight: 600 }}>
          ⚠️ You have unsaved changes — click &quot;Save All Changes&quot; to apply them.
        </div>
      )}

      <div style={{ background: darkMode ? '#0a1a10' : '#f0fdf4', border: `1px solid ${darkMode ? '#1a3a20' : '#bbf7d0'}`, borderRadius: 10, padding: '12px 16px', margin: '16px 0 20px', fontSize: 12, color: muted, lineHeight: 1.7 }}>
        💡 Leave a field <strong style={{ color: text }}>blank</strong> to hide that platform&apos;s button from the site.
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {SOCIAL_PLATFORM_META.map(({ key, label, color, placeholder, emoji }) => {
          const val = links[key] || '';
          const hasVal = val.trim().length > 0;
          return (
            <div
              key={key}
              style={{ background: card, border: `1px solid ${hasVal ? color + '55' : border}`, borderRadius: 12, padding: 16, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: hasVal ? color : darkMode ? '#252a36' : '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 20,
                }}
              >
                {emoji}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {label}
                  {hasVal ? (
                    <span style={{ fontSize: 10, background: G.green + '22', color: G.green, padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>✓ Active</span>
                  ) : (
                    <span style={{ fontSize: 10, background: darkMode ? '#252a36' : '#f0f4f8', color: muted, padding: '1px 7px', borderRadius: 10 }}>Hidden</span>
                  )}
                </div>
                <input type="url" value={val} onChange={(e) => handleChange(key, e.target.value)} placeholder={placeholder} style={{ ...inp, borderColor: hasVal ? color + '66' : border }} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {hasVal && (
                  <button onClick={() => window.open(val, '_blank')} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, padding: '6px 12px', fontSize: 12, color: muted, cursor: 'pointer' }}>
                    🔗 Test
                  </button>
                )}
                {val && (
                  <button onClick={() => handleChange(key, '')} style={{ background: 'none', border: `1px solid ${G.red}33`, borderRadius: 6, padding: '6px 10px', fontSize: 12, color: G.red, cursor: 'pointer' }}>
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          style={{ background: dirty ? G.green : '#444', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, color: '#fff', fontWeight: 700, cursor: saving || !dirty ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : '💾 Save All Changes'}
        </button>
      </div>
    </div>
  );
}
