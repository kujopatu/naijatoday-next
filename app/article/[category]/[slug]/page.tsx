import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPostBySlug, getAllPublishedPostPaths } from '@/lib/posts';
import { cloudinaryTransform } from '@/lib/cloudinary';

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
    alternates: {
      canonical: `/article/${category}/${slug}`,
    },
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

  const image = cloudinaryTransform(post.image, { width: 1200 });

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm uppercase tracking-wide text-gray-500">
        {post.category}
        {post.author ? ` · ${post.author}` : ''}
        {post.read_time ? ` · ${post.read_time}` : ''}
      </p>
      <h1 className="mt-2 text-3xl font-bold leading-tight">{post.title}</h1>

      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={post.title} className="mt-6 w-full rounded-lg" />
      )}

      <div
        className="prose prose-lg mt-6 max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}