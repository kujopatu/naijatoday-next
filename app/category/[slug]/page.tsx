import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/theme';
import { categorySlug } from '@/lib/posts';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import HomeFeed from '@/components/HomeFeed';
import MostReadSidebar from '@/components/MostReadSidebar';

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

function findCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => categorySlug(c.name) === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = findCategoryBySlug(slug);
  if (!cat) return {};
  return {
    title: `${cat.name} News — NaijaToday`,
    description: `Latest ${cat.name} news, updates and stories from Nigeria — NaijaToday.`,
  };
}

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: categorySlug(c.name) }));
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const cat = findCategoryBySlug(slug);

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .eq('category', cat?.name ?? slug)
    .order('created_at', { ascending: false })
    .limit(200);

  const allPosts = posts ?? [];
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
          <HomeFeed posts={allPosts} title={cat ? `${cat.icon} ${cat.name}` : 'Category'} />
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
