import { supabase } from '@/lib/supabase';
import SiteHeader from './SiteHeader';
import BreakingNewsBar from './BreakingNewsBar';
import CategoryPills from './CategoryPills';

// Header + breaking news + category pills, with the live article/member
// counts. Used by the static pages (About, Privacy, 404, …).
export default async function PageShell({ children }: { children: React.ReactNode }) {
  let articleCount = 0, memberCount: number | null = null;
  try {
    const [a, m] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
      supabase.from('subscribers').select('*', { count: 'exact', head: true }),
    ]);
    articleCount = a.count ?? 0;
    memberCount = m.count ?? null;
  } catch { /* counts are cosmetic */ }
  return (
    <>
      <SiteHeader articleCount={articleCount} memberCount={memberCount} />
      <BreakingNewsBar />
      <CategoryPills />
      {children}
    </>
  );
}
