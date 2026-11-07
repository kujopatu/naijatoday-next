import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPostBySlug, getAllPublishedPostPaths } from '@/lib/posts';
import { cloudinaryTransform } from '@/lib/cloudinary';
import { watermarkHtml } from '@/lib/watermark';
import { supabase, Post } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import ArticleView from '@/components/article/ArticleView';

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const post = await getPostBySlug(category, slug);
  if (!post) return {};

  const image = cloudinaryTransform(post.image, { width: 1200, height: 630 });

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: image ? [{ url: image, width: 1200, height: 630 }] : undefined,
      type: 'article',
      publishedTime: post.created_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt ?? undefined,
      images: image ? [image] : undefined,
    },
    alternates: { canonical: `/article/${category}/${slug}` },
  };
}

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams() {
  return getAllPublishedPostPaths();
}

export default async function ArticlePage({ params }: Props) {
  const { category, slug } = await params;
  const post = await getPostBySlug(category, slug);
  if (!post) notFound();

  const [{ data: recent }, { count: articleCount }, { count: memberCount }] = await Promise.all([
    supabase.from('posts').select('*').eq('published', true).neq('id', post.id).order('created_at', { ascending: false }).limit(60),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }),
  ]);

  // Related = shared tags (x10) + same category, best three.
  const myTags = new Set((post.tags ?? []).map((t: string) => t.toLowerCase()));
  const related = ((recent ?? []) as Post[])
    .map((p) => ({
      p,
      score: (p.tags ?? []).filter((t: string) => myTags.has(t.toLowerCase())).length * 10 + (p.category === post.category ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.p);

  return (
    <>
      <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <ArticleView post={post} html={watermarkHtml(post.content ?? '')} related={related} />
    </>
  );
}
