import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import StorySubmissionForm from '@/components/StorySubmissionForm';
import { G } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Submit a Story — NaijaToday',
  description: 'Send a news tip, community story or eyewitness account to the NaijaToday editorial team.',
};

export default function SubmitStoryPage() {
  return (
    <PageShell>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '42px 16px 56px' }}>
        <div style={{ color: G.green, fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Your voice matters</div>
        <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', lineHeight: 1.12, fontFamily: 'Georgia,serif', margin: '0 0 14px' }}>Have a story worth telling?</h1>
        <p style={{ color: '#718096', lineHeight: 1.8, fontSize: 16, margin: '0 0 24px' }}>Send credible news tips, community stories, eyewitness accounts and story ideas from anywhere in Nigeria. Our editorial team will review every submission.</p>
        <div style={{ background: '#f0f7f3', border: '1px solid #dcebe1', borderRadius: 12, padding: '15px 18px', marginBottom: 22, color: '#315d46', fontSize: 13, lineHeight: 1.7 }}>
          <strong>Before you submit:</strong> Include where and when it happened, separate what you witnessed from what you heard, and share only information you are comfortable providing. Submission does not guarantee publication; editors may contact you to verify details.
        </div>
        <StorySubmissionForm />
        <p style={{ color: '#718096', fontSize: 13, marginTop: 22 }}>For general questions, visit our <Link href="/contact" style={{ color: G.green, fontWeight: 700 }}>Contact page</Link>.</p>
      </main>
    </PageShell>
  );
}
