import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import { G } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Advertise with NaijaToday',
  description: 'Reach readers across Nigeria with advertising and brand partnership opportunities from NaijaToday.',
};

const opportunities = [
  { title: 'Sponsored stories', description: 'Share a clearly labelled brand story, product announcement or campaign with our readers.' },
  { title: 'Display placements', description: 'Promote your business through suitable placements across NaijaToday.' },
  { title: 'Campaign partnerships', description: 'Discuss a tailored editorial or promotional partnership for your organisation.' },
];

export default function AdvertisePage() {
  const email = 'kujopatu@gmail.com';
  const subject = encodeURIComponent('NaijaToday advertising enquiry');
  return (
    <PageShell>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '42px 16px 56px' }}>
        <section style={{ background: 'linear-gradient(135deg,#071b13,#0b4930)', color: '#fff', borderRadius: 18, padding: 'clamp(26px,5vw,48px)', marginBottom: 28 }}>
          <div style={{ color: '#8ce0b5', fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Partner with NaijaToday</div>
          <h1 style={{ fontSize: 'clamp(30px,5vw,46px)', lineHeight: 1.1, margin: '0 0 14px', fontFamily: 'Georgia,serif' }}>Put your brand in the conversation.</h1>
          <p style={{ maxWidth: 640, color: '#d4e9dd', lineHeight: 1.75, margin: 0 }}>Explore advertising and partnership opportunities with an independent Nigerian digital media platform covering the stories, people and ideas shaping the country.</p>
        </section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 30 }}>
          {opportunities.map((item, index) => (
            <article key={item.title} style={{ border: '1px solid #dce5df', borderRadius: 14, padding: 22, background: 'var(--background,#fff)' }}>
              <div style={{ color: G.green, fontWeight: 800, fontSize: 12, marginBottom: 12 }}>0{index + 1}</div>
              <h2 style={{ fontSize: 19, margin: '0 0 8px', fontFamily: 'Georgia,serif' }}>{item.title}</h2>
              <p style={{ color: '#718096', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{item.description}</p>
            </article>
          ))}
        </div>
        <section style={{ border: '1px solid #dce5df', borderRadius: 14, padding: 24 }}>
          <h2 style={{ fontSize: 22, margin: '0 0 8px', fontFamily: 'Georgia,serif' }}>Let&apos;s discuss your campaign</h2>
          <p style={{ color: '#718096', lineHeight: 1.7, margin: '0 0 18px' }}>Send your organisation name, campaign objective, preferred dates and the type of placement you have in mind. Our team can follow up with the next steps.</p>
          <a href={`mailto:${email}?subject=${subject}`} style={{ display: 'inline-block', background: G.green, color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '12px 20px', fontWeight: 700 }}>Email our team</a>
          <p style={{ color: '#718096', fontSize: 12, margin: '14px 0 0' }}>Advertising enquiries are reviewed by the NaijaToday team. Placement and publication are subject to agreement.</p>
          <div style={{ marginTop: 18 }}><Link href="/contact" style={{ color: G.green, fontWeight: 700, textDecoration: 'none' }}>Other enquiries →</Link></div>
        </section>
      </main>
    </PageShell>
  );
}
