'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SOCIAL_LINKS_DEFAULTS, SOCIAL_PLATFORM_META, SocialLinks } from '@/lib/social';
import { categorySlug } from '@/lib/posts';
import { G } from '@/lib/theme';
import { useAuth } from './AuthProvider';

// Categories with published stories; Nigeria-labelled legacy posts live under National.
const FOOTER_CATS = [
  'National', 'Business', 'Celebrity', 'Education', 'Entertainment', 'Forum',
  'Health', 'Jobs', 'Lifestyle', 'Music', 'Politics', 'Relationship',
  'Religion', 'Scholarships', 'Sports', 'Technology', 'Viral',
];
const mail = (subject: string) => `mailto:kujopatu@gmail.com?subject=${encodeURIComponent(subject)}`;

export default function SiteFooter() {
  const { loggedIn, openModal } = useAuth();
  const [links, setLinks] = useState<SocialLinks>(SOCIAL_LINKS_DEFAULTS);

  // Social links are editable in Admin → Social Links.
  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', 'social_links').maybeSingle()
      .then(({ data }) => {
        try { if (data?.value) setLinks({ ...SOCIAL_LINKS_DEFAULTS, ...JSON.parse(data.value) }); } catch { /* keep defaults */ }
      });
  }, []);

  const colTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1.5 };
  const lnk: React.CSSProperties = { display: 'block', fontSize: 13, color: '#8a93a6', marginBottom: 8, textDecoration: 'none', cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' };

  return (
    <footer style={{ background: '#0a0d14', borderTop: `3px solid ${G.green}`, marginTop: 40, fontFamily: 'Georgia,serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 16px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 32, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>Naija<span style={{ color: G.green }}>Today</span></div>
            <p style={{ fontSize: 13, color: '#8a93a6', lineHeight: 1.7, margin: '0 0 16px' }}>Nigeria&apos;s independently owned digital media platform. Real news. Real Nigerians. 24/7.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SOCIAL_PLATFORM_META.filter((p) => links[p.key]).map((p) => (
                <a key={p.key} href={links[p.key]} target="_blank" rel="noopener noreferrer" title={p.label} aria-label={p.label}
                  style={{ width: 34, height: 34, background: p.color, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>{p.emoji}</a>
              ))}
            </div>
          </div>

          <div>
            <div style={colTitle}>Quick Links</div>
            {[['/', 'Home'], ['/trending', 'Trending'], ['/polls', 'Polls & Opinions'], ['/forum', 'Forum'], ['/jobs', 'Jobs & Scholarships'], ['/resources', 'Resources'], ['/scores', 'Fixtures & Scores'], ['/saved', 'Saved Articles'], ['/about', 'About Us'], ['/submit-story', 'Submit a Story'], ['/advertise', 'Advertise'], ['/contact', 'Contact Us']].map(([h, l]) => <Link key={h} href={h} style={lnk}>{l}</Link>)}
          </div>

          <div>
            <div style={colTitle}>Categories</div>
            {FOOTER_CATS.map((c) => <Link key={c} href={`/category/${categorySlug(c)}`} style={lnk}>{c}</Link>)}
          </div>

          <div>
            <div style={colTitle}>Community</div>
            <Link href="/forum" style={lnk}>Join Forum</Link>
            {!loggedIn && <button onClick={() => openModal('register')} style={lnk}>Register Free</button>}
            {!loggedIn && <button onClick={() => openModal('login')} style={lnk}>Login</button>}
            <Link href="/submit-story" style={lnk}>Submit Your Story</Link>
            <a href={mail('Correspondent Application')} style={lnk}>Be a Correspondent</a>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1a2035', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#6b7488' }}>© 2026 NaijaToday Media Limited. All rights reserved. Made with ❤️ in Nigeria 🇳🇬</span>
          <div style={{ display: 'flex', gap: 20, fontSize: 12, flexWrap: 'wrap' }}>
            {[['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Service'], ['/about', 'About Us'], ['/disclaimer', 'Disclaimer']].map(([h, l]) => <Link key={h} href={h} style={{ color: '#6b7488', textDecoration: 'none' }}>{l}</Link>)}
          </div>
        </div>
      </div>
    </footer>
  );
}
