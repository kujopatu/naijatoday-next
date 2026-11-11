import { supabase } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import FeaturedCarousel from '@/components/FeaturedCarousel';
import TrendingTicker from '@/components/TrendingTicker';
import HomeFeed from '@/components/HomeFeed';
import MostReadSidebar from '@/components/MostReadSidebar';
import SubscribeBox from '@/components/SubscribeBox';
import SidebarWidgets from '@/components/SidebarWidgets';
import PollsExperience from '@/components/PollsExperience';
import JsonLd from '@/components/JsonLd';
import { SITE_URL } from '@/lib/site';
import { postPath } from '@/lib/posts';

// Refresh homepage data at most every 5 minutes (ISR) rather than on
// every single request.
export const revalidate = 300;

export default async function HomePage() {
  const [{ data: posts }, { count: totalArticleCount }] = await Promise.all([
    supabase
      .from('posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('published', true),
  ]);

  const allPosts = posts ?? [];
  const flaggedFeatured = allPosts.filter((p) => p.featured).slice(0, 5);
  const featuredList = flaggedFeatured.length > 0 ? flaggedFeatured : allPosts.slice(0, 5);

  const { count: memberCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user');

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Latest News from NaijaToday',
          url: SITE_URL,
          itemListElement: allPosts.slice(0, 10).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}${postPath(p)}`, name: p.title })),
        }}
      />
      <SiteHeader articleCount={totalArticleCount ?? allPosts.length} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <div className="home-grid" style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 18px' }}>
        <main style={{ minWidth: 0 }}>
          <FeaturedCarousel posts={featuredList} />
          <TrendingTicker />
          <PollsExperience featuredOnly />
          <HomeFeed posts={allPosts} />
        </main>
        <aside>
          <MostReadSidebar posts={allPosts} />
          <SubscribeBox />
          <SidebarWidgets />
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
