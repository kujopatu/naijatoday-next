import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import LegalDoc from '@/components/LegalDoc';
import { DISCLAIMER } from '@/lib/legalContent';

export const metadata: Metadata = { title: 'Disclaimer — NaijaToday', description: 'NaijaToday disclaimer.' };
export const revalidate = 86400;

export default function Page() {
  return (
    <PageShell>
      <LegalDoc title="Disclaimer" sections={DISCLAIMER} />
    </PageShell>
  );
}
