import { supabase } from '@/lib/supabase';
import { postPath } from '@/lib/posts';
import { SITE_URL } from '@/lib/site';

// Google News sitemap: only articles from the last 2 days, as Google requires.
// Replaces the old site's /news-sitemap.xml Netlify function.
export const revalidate = 600;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export async function GET() {
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  let posts: { id: string; title: string; category: string; created_at: string }[] = [];
  try {
    const { data } = await supabase
      .from('posts').select('id, title, category, created_at')
      .eq('published', true).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(1000);
    posts = data ?? [];
    // Google rejects an empty sitemap, so when nothing was published in the
    // last 2 days, list the 5 newest articles instead.
    if (posts.length === 0) {
      const { data: latest } = await supabase
        .from('posts').select('id, title, category, created_at')
        .eq('published', true).order('created_at', { ascending: false }).limit(5);
      posts = latest ?? [];
    }
  } catch { /* serve an empty, valid sitemap */ }

  const items = posts.map((p) => `  <url>
    <loc>${esc(SITE_URL + postPath(p))}</loc>
    <news:news>
      <news:publication><news:name>NaijaToday</news:name><news:language>en</news:language></news:publication>
      <news:publication_date>${new Date(p.created_at).toISOString()}</news:publication_date>
      <news:title>${esc(p.title)}</news:title>
    </news:news>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
