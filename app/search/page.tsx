import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase, Post } from '@/lib/supabase';
import { CATEGORIES, G } from '@/lib/theme';
import { categorySlug } from '@/lib/posts';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import PostCard from '@/components/PostCard';

type Props = {
  searchParams: Promise<{ q?: string; tag?: string }>;
};

const QUICK_CATEGORIES = ['National', 'Politics', 'Business', 'Economy', 'Entertainment', 'Sports', 'Technology', 'Jobs', 'Education'];

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, tag } = await searchParams;
  if (tag) return { title: `#${tag} — NaijaToday`, robots: { index: false, follow: true } };
  return { title: q ? `Search: ${q} — NaijaToday` : 'Search — NaijaToday', robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, tag } = await searchParams;
  const query = (q ?? '').trim().slice(0, 100);
  const tagQuery = (tag ?? '').trim().slice(0, 60);

  let results: Post[] = [];
  if (tagQuery) {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('published', true)
      .contains('tags', [tagQuery])
      .order('created_at', { ascending: false })
      .limit(100);
    results = (data ?? []) as Post[];
  } else if (query.length > 1) {
    const escaped = query.replace(/[%_]/g, '\\$&');
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('published', true)
      .or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%,category.ilike.%${escaped}%,author.ilike.%${escaped}%`)
      .order('created_at', { ascending: false })
      .limit(100);
    results = (data ?? []) as Post[];
  }

  const [{ count: articleCount }, { count: memberCount }] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
  ]);

  const quickCategories = QUICK_CATEGORIES
    .map((name) => CATEGORIES.find((category) => category.name === name))
    .filter((category): category is (typeof CATEGORIES)[number] => Boolean(category));

  return (
    <>
      <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '26px 16px 40px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: G.green, fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', marginBottom: 7 }}>DISCOVER NAIJATODAY</div>
          <h1 style={{ fontSize: 25, fontWeight: 800, fontFamily: 'Georgia,serif', margin: '0 0 7px' }}>
            {tagQuery ? `#${tagQuery}` : query ? `Search results for “${query}”` : 'Find the stories that matter'}
          </h1>
          <div style={{ fontSize: 13, color: '#8892a4' }}>
            {query.length > 1 || tagQuery
              ? `${results.length} article${results.length !== 1 ? 's' : ''} found`
              : 'Search Nigerian news, people, topics and updates.'}
          </div>
        </div>

        <section aria-label="Browse popular categories" style={{ marginBottom: 24, padding: 17, border: '1px solid #e2e8f0', borderRadius: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Explore popular categories</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {quickCategories.map((category) => (
              <Link key={category.name} href={`/category/${categorySlug(category.name)}`} style={{ textDecoration: 'none', color: '#425248', background: '#f0f7f3', border: '1px solid #dcebe1', borderRadius: 20, padding: '7px 12px', fontSize: 12, fontWeight: 700 }}>
                {category.icon} {category.name}
              </Link>
            ))}
          </div>
        </section>

        {query.length < 2 && !tagQuery ? (
          <div style={{ textAlign: 'center', padding: '30px 18px', color: '#8892a4', background: '#f8faf9', borderRadius: 12 }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>🔎</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 5 }}>Ready when you are</div>
            <div style={{ fontSize: 13 }}>Use the search bar above to find an article or topic.</div>
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8892a4', background: '#f8faf9', borderRadius: 12 }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>No matching articles yet</div>
            <div style={{ fontSize: 13 }}>Try another keyword or browse one of the categories above.</div>
          </div>
        ) : (
          results.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </>
  );
}
