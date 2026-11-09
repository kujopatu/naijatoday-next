import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import ProfileView from '@/components/ProfileView';

export const metadata: Metadata = { title: 'My Profile — NaijaToday' };
export const revalidate = 300;

export default async function ProfilePage() {
  const [{ count: articleCount }, { count: memberCount }] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
  ]);
  return (
    <>
      <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <ProfileView />
    </>
  );
}
