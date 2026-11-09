import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import { G } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Submit a Story — NaijaToday',
  description: 'Send a news tip, community story or eyewitness account to the NaijaToday editorial team.',
};

const email = 'kujopatu@gmail.com';

export default function SubmitStoryPage() {
  const subject = encodeURIComponent('Story submission for NaijaToday');
  return (
    <PageShell>
      <main style={{ maxWidth: 820, margin: '0 auto', padding: '42px 16px 56px' }}>
        <div style={{ color: G.green, fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Your voice matters</div>
        <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', lineHeight: 1.12, fontFamily: 'Georgia,serif', margin: '0 0 14px' }}>Have a story worth telling?</h1>
        <p style={{ color: '#718096', lineHeight: 1.8, fontSize: 16, margin: '0 0 28px' }}>NaijaToday welcomes credible news tips, community stories, eyewitness accounts and story ideas from readers across Nigeria.</p>
        <section style={{ border: '1px solid #dce5df', borderRadius: 16, padding: 'clamp(20px,4vw,32px)', marginBottom: 20 }}>
          <h2 style={{ fontSize: 21, fontFamily: 'Georgia,serif', margin: '0 0 14px' }}>What to include</h2>
          <ul style={{ color: '#718096', lineHeight: 2, paddingLeft: 22, margin: 0 }}>
            <li>A clear summary of what happened and where.</li>
            <li>The date and time, where relevant.</li>
            <li>Names or organisations involved, only when verified and appropriate.</li>
            <li>Supporting documents, photographs or public links, if available and safe to share.</li>
            <li>Your name and a way for our editorial team to contact you.</li>
          </ul>
        </section>
        <section style={{ background: '#f0f7f3', borderRadius: 16, padding: 'clamp(20px,4vw,30px)' }}>
          <h2 style={{ fontSize: 21, fontFamily: 'Georgia,serif', margin: '0 0 8px', color: '#164b32' }}>Send your tip to our editors</h2>
          <p style={{ color: '#527263', lineHeight: 1.7, margin: '0 0 18px' }}>Please distinguish what you witnessed from what you heard from others. Submission does not guarantee publication; our team may contact you to verify details.</p>
          <a href={`mailto:${email}?subject=${subject}`} style={{ display: 'inline-block', background: G.green, color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '12px 20px', fontWeight: 700 }}>Email your story</a>
        </section>
        <p style={{ color: '#718096', fontSize: 13, marginTop: 22 }}>For general questions, visit our <Link href="/contact" style={{ color: G.green, fontWeight: 700 }}>Contact page</Link>.</p>
      </main>
    </PageShell>
  );
}
