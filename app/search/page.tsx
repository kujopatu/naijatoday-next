import type { Metadata } from 'next';
import { supabase, Post } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import PostCard from '@/components/PostCard';

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Search: ${q} — NaijaToday` : 'Search — NaijaToday' };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();

  // Server-side search against the real posts table — matches across
  // title, excerpt, category and author, same fields the original
  // client-side filter checked, but done as a proper database query
  // instead of loading every article into the browser first.
  let results: Post[] = [];
  if (query.length > 1) {
    const escaped = query.replace(/[%_]/g, '\\$&');
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('published', true)
      .or(
        `title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%,category.ilike.%${escaped}%,author.ilike.%${escaped}%`
      )
      .order('created_at', { ascending: false })
      .limit(100);
    results = (data ?? []) as Post[];
  }

  const [{ count: articleCount }, { count: memberCount }] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <>
      <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia,serif', marginBottom: 6 }}>
            🔍 Search Results for &quot;{query}&quot;
          </div>
          <div style={{ fontSize: 13, color: '#8892a4' }}>
            {results.length} article{results.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#8892a4' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No results found</div>
            <div style={{ fontSize: 14 }}>Try a different keyword or browse by category</div>
          </div>
        ) : (
          results.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </>
  );
}
