import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { Fixture } from '@/lib/fixtures';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import FixturesList from '@/components/FixturesList';

// Scores change more often than articles, so refresh more frequently.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Live Scores & Fixtures — NaijaToday',
  description: "Scores across every league we're covering — updated as matches happen.",
};

export default async function ScoresPage() {
  const [{ data: fixtures }, { count: articleCount }, { count: memberCount }] = await Promise.all([
    supabase.from('fixtures').select('*').eq('active', true).order('sort_order', { ascending: true }).limit(500),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <>
      <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Georgia,serif', marginBottom: 8 }}>
            ⚽ Live Scores &amp; Fixtures
          </div>
          <div style={{ fontSize: 14, color: '#8892a4' }}>
            Scores across every league we&apos;re covering — updated as matches happen.
          </div>
        </div>
        <FixturesList fixtures={(fixtures ?? []) as Fixture[]} />
      </div>
    </>
  );
}
