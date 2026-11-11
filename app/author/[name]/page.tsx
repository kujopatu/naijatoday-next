import type { Metadata } from 'next';
import { supabase, Post } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import PostCard from '@/components/PostCard';
import JsonLd from '@/components/JsonLd';
import { G } from '@/lib/theme';

type Props = { params: Promise<{ name: string }> };
export const revalidate = 600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const author = decodeURIComponent(name);
  const { data: profile } = await supabase.from('author_profiles').select('bio, role_title').eq('author_name', author).maybeSingle();
  return {
    title: `${author} — NaijaToday Author`,
    description: profile?.bio || `Read articles and reporting by ${author} on NaijaToday.`,
  };
}

export default async function AuthorPage({ params }: Props) {
  const author = decodeURIComponent((await params).name);
  const [{ data }, { data: profile }, { count: articleCount }, { count: memberCount }] = await Promise.all([
    supabase.from('posts').select('*').eq('published', true).eq('author', author).order('created_at', { ascending: false }).limit(100),
    supabase.from('author_profiles').select('author_name,bio,avatar_url,role_title,updated_at').eq('author_name', author).maybeSingle(),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
  ]);
  const posts = (data ?? []) as Post[];
  const views = posts.reduce((sum, post) => sum + (typeof post.views === 'number' ? post.views : 0), 0);
  const ups = posts.reduce((sum, post) => sum + (typeof post.upvotes === 'number' ? post.upvotes : 0), 0);
  const roleTitle = profile?.role_title || 'NaijaToday Contributor';
  const initial = author.trim().charAt(0).toUpperCase() || 'N';

  const stat = (value: number, label: string) => (
    <div style={{ flex: 1, minWidth: 105, textAlign: 'center', padding: 14, borderRadius: 10, border: '1px solid rgba(128,128,128,.25)' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: G.green }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 10, textTransform: 'uppercase', opacity: .7, letterSpacing: '.6px' }}>{label}</div>
    </div>
  );

  return (
    <>
      <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name: author,
          jobTitle: roleTitle,
          description: profile?.bio || undefined,
          image: profile?.avatar_url || undefined,
        },
      }} />
      <main style={{ maxWidth: 940, margin: '0 auto', padding: '28px 16px 44px' }}>
        <section style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '28px 24px', marginBottom: 22, background: 'linear-gradient(125deg, #073b28 0%, #008751 65%, #16a36b 100%)', color: '#fff' }}>
          <div style={{ position: 'absolute', right: -25, top: -70, width: 220, height: 220, borderRadius: '50%', border: '1px solid rgba(255,255,255,.14)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={author} style={{ width: 92, height: 92, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,.8)', background: '#fff' }} />
            ) : (
              <div aria-hidden="true" style={{ width: 92, height: 92, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.16)', border: '2px solid rgba(255,255,255,.65)', fontSize: 38, fontWeight: 900 }}>{initial}</div>
            )}
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', opacity: .8, fontWeight: 800 }}>NaijaToday Author</div>
              <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 29, lineHeight: 1.15, margin: '5px 0' }}>{author}</h1>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: .9 }}>{roleTitle}</div>
              {profile?.bio ? <p style={{ fontSize: 13, lineHeight: 1.65, maxWidth: 650, margin: '12px 0 0', color: 'rgba(255,255,255,.92)' }}>{profile.bio}</p> : <p style={{ fontSize: 12, lineHeight: 1.6, maxWidth: 620, margin: '10px 0 0', color: 'rgba(255,255,255,.82)' }}>Explore published stories and reporting by {author}.</p>}
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
          {stat(posts.length, 'Articles')}
          {stat(views, 'Article Views')}
          {stat(ups, 'Upvotes')}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 10, marginBottom: 14, borderBottom: `2px solid ${G.green}`, paddingBottom: 9 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, fontFamily: 'Georgia,serif' }}>Latest by {author}</div>
            <div style={{ fontSize: 11, opacity: .65, marginTop: 3 }}>Published articles and reporting</div>
          </div>
          <span style={{ fontSize: 11, opacity: .65 }}>{posts.length} {posts.length === 1 ? 'story' : 'stories'}</span>
        </div>
        {posts.length === 0
          ? <div style={{ textAlign: 'center', padding: 42, border: '1px dashed rgba(128,128,128,.35)', borderRadius: 12, opacity: .7 }}>No published articles yet.</div>
          : posts.map(post => <PostCard key={post.id} post={post} />)}
      </main>
    </>
  );
}
