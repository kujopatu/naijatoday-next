import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ForumThread } from '@/lib/forum';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import ThreadView from '@/components/ThreadView';

export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

async function getThread(idParam: string): Promise<ForumThread | null> {
  const id = Number(idParam);
  if (!Number.isFinite(id)) return null;
  try {
    const { data } = await supabase
      .from('forum_threads')
      .select('*')
      .eq('id', id)
      .neq('status', 'pending')
      .maybeSingle();
    return (data as ForumThread | null) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) return {};
  return {
    title: `${thread.title} — NaijaToday Forum`,
    description: thread.preview ?? thread.body?.slice(0, 150),
  };
}

export default async function ThreadPage({ params }: Props) {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) notFound();

  const [{ count: articleCount }, { count: memberCount }] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
  ]);

  return (
    <>
      <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        <ThreadView thread={thread} />
      </div>
    </>
  );
}
