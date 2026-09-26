import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { ForumThread } from '@/lib/forum';
import { G } from '@/lib/theme';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import ForumList from '@/components/ForumList';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Forum — NaijaToday',
  description: 'Community discussions — browse what Nigerians are talking about right now.',
};

export default async function ForumPage() {
  const [{ data: threads }, { count: articleCount }, { count: memberCount }] = await Promise.all([
    // Only approved threads are public — pending ones need moderation,
    // which is part of the not-yet-built admin/auth system.
    supabase.from('forum_threads').select('*').neq('status', 'pending').order('created_at', { ascending: false }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <>
      <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        <div
          style={{
            marginBottom: 20,
            paddingBottom: 10,
            borderBottom: `2px solid ${G.green}`,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia,serif' }}>💬 Community Forum</span>
        </div>
        <ForumList threads={(threads ?? []) as ForumThread[]} />
      </div>
    </>
  );
}
