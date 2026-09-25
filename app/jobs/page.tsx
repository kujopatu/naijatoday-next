import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { Job, Scholarship } from '@/lib/jobs';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import JobsBoard from '@/components/JobsBoard';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Jobs & Scholarships — NaijaToday',
  description: 'Latest job vacancies and scholarships open now in Nigeria.',
};

export default async function JobsPage() {
  const [{ data: jobs }, { data: scholarships }, { count: articleCount }, { count: memberCount }] = await Promise.all([
    supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('scholarships').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <>
      <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <JobsBoard jobs={(jobs ?? []) as Job[]} scholarships={(scholarships ?? []) as Scholarship[]} />
    </>
  );
}
