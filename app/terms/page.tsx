import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import LegalDoc from '@/components/LegalDoc';
import { TERMS } from '@/lib/legalContent';

export const metadata: Metadata = { title: 'Terms of Service — NaijaToday', description: 'The terms that govern your use of NaijaToday.' };
export const revalidate = 86400;

export default function Page() {
  return (
    <PageShell>
      <LegalDoc icon="📜" title="Terms of Service" intro="Please read these Terms carefully before using NaijaToday. By accessing naijatodayblog.com.ng you agree to these terms." sections={TERMS} />
    </PageShell>
  );
}
