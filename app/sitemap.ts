import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

const SITE_URL = 'https://naijatodayblog.com.ng';

// Replaces the old sitemap.cjs Netlify Function — this route is
// generated on request (and cached) with no manual routing config.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let articles: { category: string; slug: string; updated_at: string }[] = [];

  try {
    const { data } = await supabase
      .from('articles')
      .select('category, slug, updated_at')
      .order('published_at', { ascending: false });
    articles = data ?? [];
  } catch {
    // No reachable Supabase — return the homepage entry only rather
    // than failing the whole sitemap route.
  }

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE_URL}/article/${a.category}/${a.slug}`,
    lastModified: a.updated_at,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    ...articleEntries,
  ];
}
