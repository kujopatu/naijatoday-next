import type { Metadata } from 'next';
import { supabase, Post } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import PostCard from '@/components/PostCard';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Trending — NaijaToday',
  description: 'Hot stories right now — engagement and recency combined.',
};

// Ported exactly from the original TrendingPage's scoring function:
// a Reddit-style "hotness" score — engagement weighted, decaying with age.
function scorePost(p: Post): number {
  const views = typeof p.views === 'number' ? p.views : 0;
  const upvotes = typeof p.upvotes === 'number' ? p.upvotes : 0;
  const comments = typeof p.comments === 'number' ? p.comments : 0;
  const hoursOld = p.created_at
    ? Math.max(0, (Date.now() - new Date(p.created_at).getTime()) / 3600000)
    : 48;
  const engagement = upvotes * 3 + comments * 5 + views / 50;
  return engagement / Math.pow(hoursOld + 2, 1.5);
}

export default async function TrendingPage() {
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(300);

  const allPosts = posts ?? [];
  const scored = allPosts
    .map((p) => ({ post: p, score: scorePost(p) }))
    .sort((a, b) => b.score - a.score);

  const { count: memberCount } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true });

  return (
    <>
      <SiteHeader articleCount={allPosts.length} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            marginBottom: 16,
            paddingBottom: 10,
            borderBottom: '2px solid #008751',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Georgia,serif' }}>
            🔥 Trending Right Now
          </span>
          <span style={{ fontSize: 12, color: '#8892a4' }}>
            Hot stories — engagement & recency combined
          </span>
        </div>

        {scored.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8892a4' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div>No articles published yet.</div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 12,
            }}
          >
            {scored.map(({ post: p }) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
