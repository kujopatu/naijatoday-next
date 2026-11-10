'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';

type Check = { label: string; value: string; detail: string; state: 'ok' | 'warn' | 'error' | 'loading' };

export default function SystemHealthPanel() {
  const { card, border, text, muted } = useTheme();
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState('');

  const runChecks = useCallback(async () => {
    setLoading(true);
    setChecks([
      { label: 'Supabase database', value: 'Checking…', detail: 'Testing database access', state: 'loading' },
      { label: 'Article records', value: 'Checking…', detail: 'Reading publishing records', state: 'loading' },
      { label: 'SEO metadata', value: 'Checking…', detail: 'Checking article titles and descriptions', state: 'loading' },
      { label: 'Article images', value: 'Checking…', detail: 'Checking stored image delivery URLs', state: 'loading' },
      { label: 'Admin activity log', value: 'Checking…', detail: 'Checking activity log access', state: 'loading' },
      { label: 'Advertising campaigns', value: 'Checking…', detail: 'Checking campaign register access', state: 'loading' },
    ]);

    const [postsResult, activityResult, campaignsResult] = await Promise.all([
      supabase.from('posts').select('id,published,seo_title,seo_description,image', { count: 'exact' }).limit(1000),
      supabase.from('admin_activity_log').select('id', { count: 'exact', head: true }),
      supabase.from('ad_campaigns').select('id', { count: 'exact', head: true }),
    ]);

    const next: Check[] = [];
    if (postsResult.error) {
      next.push({ label: 'Supabase database', value: 'Needs attention', detail: postsResult.error.message, state: 'error' });
      next.push({ label: 'Article records', value: 'Unavailable', detail: 'Could not read article records', state: 'error' });
      next.push({ label: 'SEO metadata', value: 'Not checked', detail: 'Article data was unavailable', state: 'warn' });
      next.push({ label: 'Article images', value: 'Not checked', detail: 'Article data was unavailable', state: 'warn' });
    } else {
      const posts = postsResult.data || [];
      const published = posts.filter((p) => p.published).length;
      const drafts = posts.length - published;
      const missingSeo = posts.filter((p) => !String(p.seo_title || '').trim() || !String(p.seo_description || '').trim()).length;
      const missingImages = posts.filter((p) => !String(p.image || '').trim()).length;
      const cloudinaryImages = posts.filter((p) => String(p.image || '').includes('res.cloudinary.com')).length;
      next.push({ label: 'Supabase database', value: 'Connected', detail: 'Article records were read successfully', state: 'ok' });
      next.push({ label: 'Article records', value: String(postsResult.count ?? posts.length), detail: `${published} published · ${drafts} drafts in the latest ${posts.length} records checked`, state: 'ok' });
      next.push({ label: 'SEO metadata', value: `${missingSeo} need attention`, detail: 'Articles missing either an SEO title or description in the checked records', state: missingSeo ? 'warn' : 'ok' });
      next.push({ label: 'Article images', value: `${missingImages} missing`, detail: `${cloudinaryImages} Cloudinary image URLs found in the checked records`, state: missingImages ? 'warn' : 'ok' });
    }

    next.push(activityResult.error
      ? { label: 'Admin activity log', value: 'Unavailable', detail: activityResult.error.message, state: 'warn' }
      : { label: 'Admin activity log', value: 'Accessible', detail: `${activityResult.count ?? 0} recorded actions`, state: 'ok' });
    next.push(campaignsResult.error
      ? { label: 'Advertising campaigns', value: 'Unavailable', detail: campaignsResult.error.message, state: 'warn' }
      : { label: 'Advertising campaigns', value: 'Accessible', detail: `${campaignsResult.count ?? 0} campaign records`, state: 'ok' });

    setChecks(next);
    setUpdatedAt(new Date().toLocaleString());
    setLoading(false);
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  const stateColor = (state: Check['state']) => state === 'ok' ? G.green : state === 'error' ? G.red : state === 'warn' ? '#d97706' : muted;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ color: text, fontSize: 17, fontWeight: 800 }}>🛡️ System Health</div>
          <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>Read-only checks for database access, publishing data, SEO, images and admin tools. No settings or content are changed.</div>
        </div>
        <button onClick={runChecks} disabled={loading} style={{ border: `1px solid ${border}`, background: card, color: text, borderRadius: 8, padding: '9px 13px', cursor: loading ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700 }}>{loading ? 'Checking…' : '↻ Run checks'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 10 }}>
        {checks.map((check) => (
          <div key={check.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ color: text, fontSize: 12, fontWeight: 700 }}>{check.label}</span>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: stateColor(check.state), flexShrink: 0 }} />
            </div>
            <div style={{ color: stateColor(check.state), fontSize: 17, fontWeight: 800, marginTop: 9 }}>{check.value}</div>
            <div style={{ color: muted, fontSize: 11, marginTop: 5, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{check.detail}</div>
          </div>
        ))}
      </div>
      <div style={{ color: muted, fontSize: 10, marginTop: 12 }}>Last checked: {updatedAt || '—'}. These are application-level checks, not a full infrastructure or vulnerability scan.</div>
    </div>
  );
}
