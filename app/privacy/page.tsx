import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import LegalDoc from '@/components/LegalDoc';
import { PRIVACY } from '@/lib/legalContent';

export const metadata: Metadata = { title: 'Privacy Policy — NaijaToday', description: 'How NaijaToday collects, uses and protects your personal information.' };
export const revalidate = 86400;

export default function Page() {
  return (
    <PageShell>
      <LegalDoc icon="🔒" title="Privacy Policy" intro="This policy explains how NaijaToday Media collects, uses, and protects your personal information. We comply with the Nigerian Data Protection Act (NDPA) and applicable international standards including GDPR." sections={PRIVACY} />
    </PageShell>
  );
}
