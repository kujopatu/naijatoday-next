import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import { G } from '@/lib/theme';

type Props = { params: Promise<{ name: string }> };
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `${decodeURIComponent((await params).name)} — NaijaToday Community` };
}

// Public community profile: forum threads and replies by a member name.
export default async function UserPage({ params }: Props) {
  const name = decodeURIComponent((await params).name);
  const [{ data: threads }, { data: replies }, { count: articleCount }, { count: memberCount }] = await Promise.all([
    supabase.from('forum_threads').select('id,title,category,replies,views,created_at').eq('author', name).order('created_at', { ascending: false }).limit(50),
    supabase.from('forum_replies').select('id,thread_id,text,created_at').eq('user', name).order('created_at', { ascending: false }).limit(50),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
  ]);
  const ids = [...new Set((replies ?? []).map((r) => r.thread_id))];
  const { data: parents } = ids.length ? await supabase.from('forum_threads').select('id,title').in('id', ids) : { data: [] };
  const titleOf = (id: number) => parents?.find((t) => t.id === id)?.title;

  const box: React.CSSProperties = { display: 'block', textDecoration: 'none', color: 'inherit', border: '1px solid rgba(128,128,128,.25)', borderRadius: 10, padding: 14, marginBottom: 10 };
  const head = (t: string) => <div style={{ margin: '24px 0 12px', paddingBottom: 8, borderBottom: `2px solid ${G.green}`, fontSize: 17, fontWeight: 700, fontFamily: 'Georgia,serif' }}>{t}</div>;

  return (
    <>
      <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg, ${G.green}, ${G.greenDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 26 }}>{name[0]?.toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia,serif' }}>{name}</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>🗓 NaijaToday Community Member · {threads?.length ?? 0} threads · {replies?.length ?? 0} replies</div>
          </div>
        </div>
        {head('💬 Threads Started')}
        {(threads ?? []).length === 0 ? <div style={{ opacity: 0.7, fontSize: 13 }}>No threads yet.</div> : threads!.map((t) => (
          <Link key={t.id} href={`/forum/${t.id}`} style={box}>
            <div style={{ fontWeight: 700, fontFamily: 'Georgia,serif', marginBottom: 4 }}>{t.title}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{t.category} · 💬 {t.replies} · 👁 {t.views}</div>
          </Link>
        ))}
        {head('📝 Recent Replies')}
        {(replies ?? []).length === 0 ? <div style={{ opacity: 0.7, fontSize: 13 }}>No replies yet.</div> : replies!.map((r) => (
          <Link key={r.id} href={`/forum/${r.thread_id}`} style={box}>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>On: {titleOf(r.thread_id) ?? 'a thread'}</div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>{r.text}</div>
          </Link>
        ))}
        <Link href="/forum" style={{ display: 'inline-block', marginTop: 16, color: G.green, fontWeight: 600, textDecoration: 'none' }}>← Back to Forum</Link>
      </div>
    </>
  );
}
