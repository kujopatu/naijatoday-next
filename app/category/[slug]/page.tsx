import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/theme';
import { categorySlug } from '@/lib/posts';
import { SITE_URL } from '@/lib/site';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import HomeFeed from '@/components/HomeFeed';
import MostReadSidebar from '@/components/MostReadSidebar';
import Breadcrumbs from '@/components/Breadcrumbs';

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

// Accepts the old site's URLs too, e.g. /category/Entertainment or
// /category/Relationship%20Advice, by normalising before matching.
function findCategoryBySlug(raw: string) {
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { /* keep raw */ }
  const slug = categorySlug(decoded);
  const directMatch = CATEGORIES.find((c) => categorySlug(c.name) === slug);
  if (directMatch) return directMatch;
  // Legacy posts saved under "Nigeria" belong on the National category page.
  if (slug === 'nigeria') return CATEGORIES.find((c) => c.name === 'National');
  return undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = findCategoryBySlug(slug);
  if (!cat) return {};
  return {
    title: `${cat.name} News — NaijaToday`,
    description: `Latest ${cat.name} news, updates and stories from Nigeria — NaijaToday.`,
    alternates: { canonical: `${SITE_URL}/category/${categorySlug(cat.name)}` },
    openGraph: { title: `${cat.name} News — NaijaToday`, description: `Latest ${cat.name} news, updates and stories from Nigeria — NaijaToday.`, type: 'website', url: `${SITE_URL}/category/${categorySlug(cat.name)}` },
  };
}

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: categorySlug(c.name) }));
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const cat = findCategoryBySlug(slug);
  if (!cat) notFound();

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .in('category', cat.name === 'National' ? ['National', 'Nigeria', 'News', 'National News'] : [cat.name])
    .order('created_at', { ascending: false })
    .limit(200);

  const allPosts = posts ?? [];
  const { count: memberCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user');

  return (
    <>
      <SiteHeader articleCount={allPosts.length} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <div className="home-grid" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
        <main style={{ minWidth: 0 }}>
          <Breadcrumbs items={[{ label: cat ? cat.name : 'Category' }]} />
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
