import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { postPath } from '@/lib/posts';

const SITE_URL = 'https://naijatodayblog.com.ng';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: { id: string; title: string; category: string; updated_at: string }[] = [];

  try {
    const { data } = await supabase
      .from('posts')
      .select('id, title, category, updated_at')
      .eq('published', true)
      .order('created_at', { ascending: false });
    posts = data ?? [];
  } catch {}

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}${postPath(p)}`,
    lastModified: p.updated_at,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    ...postEntries,
  ];
}