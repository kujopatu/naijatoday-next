import type { Metadata } from 'next';
import { supabase, Post } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import PostCard from '@/components/PostCard';
import { G } from '@/lib/theme';

type Props = { params: Promise<{ name: string }> };
export const revalidate = 600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} — NaijaToday` };
}

export default async function AuthorPage({ params }: Props) {
  const author = decodeURIComponent((await params).name);
  const [{ data }, { count: articleCount }, { count: memberCount }] = await Promise.all([
    supabase.from('posts').select('*').eq('published', true).eq('author', author).order('created_at', { ascending: false }).limit(100),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
  ]);
  const posts = (data ?? []) as Post[];
  const views = posts.reduce((s, p) => s + (typeof p.views === 'number' ? p.views : 0), 0);
  const ups = posts.reduce((s, p) => s + (typeof p.upvotes === 'number' ? p.upvotes : 0), 0);

  const stat = (n: number, l: string) => (
    <div style={{ flex: 1, minWidth: 110, textAlign: 'center', padding: 14, borderRadius: 10, border: '1px solid rgba(128,128,128,.25)' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: G.green }}>{n.toLocaleString()}</div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.7 }}>{l}</div>
    </div>
  );

  return (
    <>
      <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg, ${G.green}, ${G.greenDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>✍️</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia,serif' }}>{author}</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>NaijaToday Contributor</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {stat(posts.length, 'Articles')}{stat(views, 'Total Views')}{stat(ups, 'Total Upvotes')}
        </div>
        <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${G.green}`, fontSize: 17, fontWeight: 700, fontFamily: 'Georgia,serif' }}>
          📰 Articles by {author}
        </div>
        {posts.length === 0 ? <div style={{ textAlign: 'center', padding: 40, opacity: 0.7 }}>No articles yet.</div>
          : posts.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </>
  );
}
