import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPostBySlug, getAllPublishedPostPaths } from '@/lib/posts';
import { toCloudinaryWm, watermarkHtml } from '@/lib/watermark';
import { supabase, Post } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import BreakingNewsBar from '@/components/BreakingNewsBar';
import CategoryPills from '@/components/CategoryPills';
import ArticleView from '@/components/article/ArticleView';
import JsonLd from '@/components/JsonLd';
import { SITE_URL } from '@/lib/site';
import { categorySlug, postPath } from '@/lib/posts';

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const post = await getPostBySlug(category, slug);
  if (!post) return {};

  // Link previews (WhatsApp, Facebook, X) carry the NaijaToday watermark, as on the old site.
  const image = new URL(toCloudinaryWm(post.image, 1200, 'jpg') ?? '/og-image.jpg', SITE_URL).toString();
  const shareTitle = post.seo_title?.trim() || post.title;
  const shareDescription = post.seo_description?.trim() || post.excerpt || undefined;

  return {
    title: `${post.seo_title?.trim() || post.title} | NaijaToday`,
    description: post.seo_description?.trim() || post.excerpt || undefined,
    keywords: post.tags?.length ? post.tags : [post.category, 'Nigeria news'].filter(Boolean),
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      siteName: 'NaijaToday',
      locale: 'en_NG',
      images: [{ url: image, alt: shareTitle }],
      type: 'article',
      publishedTime: post.created_at,
      modifiedTime: post.updated_at || post.created_at,
      authors: [post.author || 'NaijaToday Desk'],
      tags: post.tags ?? [],
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description: shareDescription,
      images: [{ url: image, alt: shareTitle }],
    },
    alternates: { canonical: new URL(postPath(post), SITE_URL).toString() },
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

  const [{ data: recent }, { count: articleCount }, { count: memberCount }, { data: authorProfile }] = await Promise.all([
    supabase.from('posts').select('*').eq('published', true).neq('id', post.id).order('created_at', { ascending: false }).limit(60),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('author_profiles').select('bio,avatar_url,role_title').eq('author_name', post.author || '').maybeSingle(),
  ]);

  // Rank related stories by shared tags and category; use newest published stories as a fallback.
  const myTags = new Set((post.tags ?? []).map((t: string) => t.toLowerCase()));
  const related = ((recent ?? []) as Post[])
    .map((p, index) => ({
      p,
      index,
      score: (p.tags ?? []).filter((t: string) => myTags.has(t.toLowerCase())).length * 10
        + (p.category?.toLowerCase() === post.category?.toLowerCase() ? 6 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map((x) => x.p);

  return (
    <>
      <SiteHeader articleCount={articleCount ?? 0} memberCount={memberCount ?? null} />
      <BreakingNewsBar />
      <CategoryPills />
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: post.title,
            description: post.excerpt ?? '',
            image: [image],
            datePublished: (post as typeof post & { published_at?: string | null }).published_at || post.created_at,
            dateModified: post.updated_at || (post as typeof post & { published_at?: string | null }).published_at || post.created_at,
            author: { '@type': 'Person', name: post.author || 'NaijaToday Desk' },
            publisher: { '@type': 'NewsMediaOrganization', '@id': `${SITE_URL}/#publisher`, name: 'NaijaToday', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 } },
            url: `${SITE_URL}${postPath(post)}`,
            mainEntityOfPage: `${SITE_URL}${postPath(post)}`,
            articleSection: post.category || 'News',
            isAccessibleForFree: true,
            keywords: (post.tags ?? []).join(', '),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: post.category || 'News', item: `${SITE_URL}/category/${categorySlug(post.category)}` },
              { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}${postPath(post)}` },
            ],
          },
        ]}
      />
      <ArticleView post={post} html={watermarkHtml(post.content ?? '')} related={related} authorProfile={authorProfile ?? null} />
    </>
  );
}
