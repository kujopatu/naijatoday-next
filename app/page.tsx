import { supabase } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import FeaturedCarousel from '@/components/FeaturedCarousel';
import TrendingTicker from '@/components/TrendingTicker';
import HomeFeed from '@/components/HomeFeed';
import MostReadSidebar from '@/components/MostReadSidebar';

// Refresh homepage data at most every 5 minutes (ISR) rather than on
// every single request.
export const revalidate = 300;

export default async function HomePage() {
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(200);

  const allPosts = posts ?? [];
  const flaggedFeatured = allPosts.filter((p) => p.featured).slice(0, 5);
  const featuredList = flaggedFeatured.length > 0 ? flaggedFeatured : allPosts.slice(0, 5);

  const { count: memberCount } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true });

  return (
    <>
      <SiteHeader articleCount={allPosts.length} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <div className="home-grid" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
        <main style={{ minWidth: 0 }}>
          <FeaturedCarousel posts={featuredList} />
          <TrendingTicker />
          <HomeFeed posts={allPosts} />
        </main>
        <aside>
          <MostReadSidebar posts={allPosts} />
        </aside>
      </div>
      <style>{`
        .home-grid { display: grid; grid-template-columns: 1fr 340px; gap: 24px; }
        @media (max-width: 900px) {
          .home-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
