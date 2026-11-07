import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import AboutView from '@/components/AboutView';

export const metadata: Metadata = { title: 'About Us — NaijaToday', description: "About NaijaToday — Nigeria's independently owned digital media platform." };
export const revalidate = 86400;

export default function Page() {
  return (
    <PageShell>
      <AboutView />
    </PageShell>
  );
}
