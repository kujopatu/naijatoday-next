import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabase, Article } from '@/lib/supabase';
import { cloudinaryUrl } from '@/lib/cloudinary';

type Props = {
  params: { category: string; slug: string };
};

async function getArticle(
  category: string,
  slug: string
): Promise<Article | null> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('category', category)
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return data as Article;
  } catch {
    // Network/config issue reaching Supabase — fail soft to a 404
    // rather than crashing the whole page/build.
    return null;
  }
}

// Replaces the old og.cjs Netlify Function's bot-detection + OG tag
// serving. Next.js serves the correct meta tags to every crawler
// automatically — no user-agent whitelist needed.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle(params.category, params.slug);
  if (!article) return {};

  const image = article.cover_image
    ? cloudinaryUrl(article.cover_image, { width: 1200, height: 630 })
    : undefined;

  return {
    title: article.title,
    description: article.excerpt ?? undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      images: image ? [{ url: image, width: 1200, height: 630 }] : undefined,
      type: 'article',
      publishedTime: article.published_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt ?? undefined,
      images: image ? [image] : undefined,
    },
    alternates: {
      canonical: `/article/${article.category}/${article.slug}`,
    },
  };
}

// Pre-render the most recent articles at build time; anything older or
// newer falls back to on-demand server rendering and gets cached — the
// built-in replacement for the manual prerendering setup you had for
// Googlebot on the Vite SPA.
export const dynamicParams = true;
export const revalidate = 3600; // ISR: refresh each page at most hourly

export async function generateStaticParams() {
  try {
    const { data } = await supabase
      .from('articles')
      .select('category, slug')
      .order('published_at', { ascending: false })
      .limit(100);

    return (data ?? []).map((a) => ({ category: a.category, slug: a.slug }));
  } catch {
    // No reachable Supabase at build time — build with zero
    // pre-rendered articles; they'll still render on-demand at
    // request time once real credentials/network are available.
    return [];
  }
}

export default async function ArticlePage({ params }: Props) {
  const article = await getArticle(params.category, params.slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm uppercase tracking-wide text-gray-500">
        {article.category}
      </p>
      <h1 className="mt-2 text-3xl font-bold leading-tight">
        {article.title}
      </h1>

      {article.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cloudinaryUrl(article.cover_image, { width: 1200 })}
          alt={article.title}
          className="mt-6 w-full rounded-lg"
        />
      )}

      <div
        className="prose prose-lg mt-6 max-w-none"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />
    </article>
  );
}
