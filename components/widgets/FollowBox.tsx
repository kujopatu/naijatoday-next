'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SOCIAL_LINKS_DEFAULTS, SOCIAL_PLATFORM_META, SocialLinks } from '@/lib/social';
import { useTheme } from '../ThemeProvider';
import WidgetCard from './WidgetCard';

// "Follow NaijaToday" buttons. Links come from Admin → Social Links
// (site_settings, key "social_links"); empty ones are hidden. Follower
// counts are not shown, because the original numbers were typed in by hand.
export default function FollowBox() {
  const { muted } = useTheme();
  const [links, setLinks] = useState<SocialLinks>(SOCIAL_LINKS_DEFAULTS);

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'social_links')
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.value) return;
        try {
          const saved = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          setLinks({ ...SOCIAL_LINKS_DEFAULTS, ...saved });
        } catch {
          /* keep defaults */
        }
      });
  }, []);

  const active = SOCIAL_PLATFORM_META.filter((m) => links[m.key]);
  if (active.length === 0) return null;

  return (
    <WidgetCard title="📱 Follow NaijaToday">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {active.map((m) => (
          <a
            key={m.key}
            href={links[m.key]}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: m.color, color: m.key === 'snapchat' ? '#000' : '#fff', borderRadius: 6, padding: '9px 10px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>{m.emoji}</span>
            <span>{m.label}</span>
          </a>
        ))}
      </div>
      <div style={{ fontSize: 10, color: muted, marginTop: 8, textAlign: 'center' }}>Opens in a new tab</div>
    </WidgetCard>
  );
}
