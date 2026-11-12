import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { categorySlug, postPath } from '@/lib/posts';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

type Freq = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
const STATIC: [string, Freq, number][] = [
  ['', 'hourly', 1], ['/trending', 'hourly', 0.9], ['/forum', 'daily', 0.8], ['/jobs', 'daily', 0.8],
  ['/resources', 'weekly', 0.7], ['/scores', 'daily', 0.6], ['/about', 'monthly', 0.5], ['/contact', 'monthly', 0.4],
  ['/advertise', 'monthly', 0.4], ['/submit-story', 'monthly', 0.4],
  ['/privacy', 'yearly', 0.3], ['/terms', 'yearly', 0.3], ['/disclaimer', 'yearly', 0.3],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: { id: string; title: string; category: string; image: string | null; created_at: string; published_at: string | null; updated_at: string | null }[] = [];
  try {
    const { data } = await supabase.from('posts').select('id, title, category, image, created_at, published_at, updated_at').eq('published', true).order('created_at', { ascending: false });
    posts = data ?? [];
  } catch { /* fall back to static pages only */ }

  // List only categories that currently contain published articles.
  // The legacy "Nigeria" category is represented by the site's "National" page.
  const activeCategories = [...new Set(posts.map((post) =>
    categorySlug(post.category?.toLowerCase() === 'nigeria' ? 'National' : post.category)
  ))];

  return [
    ...STATIC.map(([path, changeFrequency, priority]) => ({ url: `${SITE_URL}${path}`, lastModified: new Date(), changeFrequency, priority })),
    ...activeCategories.map((slug) => ({ url: `${SITE_URL}/category/${slug}`, lastModified: new Date(), changeFrequency: 'daily' as Freq, priority: 0.7 })),
    ...posts.map((p) => ({
      url: `${SITE_URL}${postPath(p)}`,
      lastModified: p.updated_at || p.published_at || p.created_at,
      changeFrequency: 'weekly' as Freq,
      priority: 0.9,
      images: p.image && p.image.trim().startsWith('http') ? [p.image.trim()] : undefined,
    })),
  ];
}
