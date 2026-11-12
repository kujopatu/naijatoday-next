import { supabase } from '@/lib/supabase';
import { postPath } from '@/lib/posts';
import { SITE_URL } from '@/lib/site';

export const revalidate = 900;

const esc = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export async function GET() {
  const { data } = await supabase
    .from('posts')
    .select('id, title, category, excerpt, image, created_at, published_at, author')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(30);

  const items = (data ?? []).map((post) => {
    const url = `${SITE_URL}${postPath(post)}`;
    const description = post.excerpt || post.title;
    const image = post.image && /^https?:\/\//.test(post.image.trim())
      ? `<media:content url="${esc(post.image.trim())}" medium="image" />`
      : '';
    return `<item>
      <title>${esc(post.title)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <description>${esc(description)}</description>
      <pubDate>${new Date(post.published_at || post.created_at).toUTCString()}</pubDate>
      <category>${esc(post.category || 'News')}</category>
      ${post.author ? `<author>${esc(post.author)}</author>` : ''}
      ${image}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>NaijaToday — Nigerian News, Politics, Sports &amp; Entertainment</title>
    <link>${SITE_URL}</link>
    <description>Latest Nigerian news, politics, business, sports, entertainment, jobs and scholarships.</description>
    <language>en-ng</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  });
}
