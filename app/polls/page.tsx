import SiteHeader from '@/components/SiteHeader';
import PollsExperience from '@/components/PollsExperience';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'NaijaToday Polls & Opinions | Have Your Say',
  description: 'Vote on Nigerian news, entertainment, sports and social issues. See how NaijaToday readers feel.',
  alternates: { canonical: '/polls' },
  openGraph: {
    title: 'NaijaToday Polls & Opinions',
    description: 'Your voice. Your Nigeria. Vote and see where readers stand.',
    url: 'https://naijatodayblog.com.ng/polls',
    type: 'website',
  },
};

export default async function PollsPage() {
  const [{ count: articleCount }, { count: memberCount }] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'user'),
  ]);
  return <>
    <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
    <PollsExperience />
  </>;
}
