import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAIL } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_SOURCE_DOMAINS = [
  'channelstv.com', 'premiumtimesng.com', 'punchng.com',
  'guardian.ng', 'vanguardngr.com', 'thenationonlineng.net',
  'thisdaylive.com', 'dailytrust.com', 'thecable.ng',
  'businessday.ng', 'arise.tv', 'bbc.com', 'reuters.com',
];

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server database credentials are not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  return !error && data.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function cleanText(value: string) {
  return decodeXml(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function decodeXml(value: string) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
function tagValue(xml: string, names: string[]) {
  for (const name of names) {
    const re = new RegExp('<' + name.replace(':', '\\:') + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name.replace(':', '\\:') + '\\s*>', 'i');
    const match = xml.match(re);
    if (match?.[1]) return cleanText(match[1]);
  }
  return '';
}
function attributeValue(xml: string, tag: string, attribute: string) {
  const tagMatch = xml.match(new RegExp('<' + tag.replace(':', '\\:') + '\\b([^>]*)>', 'i'));
  const match = tagMatch?.[1]?.match(new RegExp(attribute + "=[\"']([^\"']+)[\"']", 'i'));
  return match?.[1] || '';
}
function allowedUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && ALLOWED_SOURCE_DOMAINS.some(d => u.hostname === d || u.hostname.endsWith('.' + d));
  } catch { return false; }
}
function isVideoUrl(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be' || host.endsWith('.youtu.be');
  } catch { return false; }
}
function parseFeed(xml: string) {
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => m[2]);
  return blocks.slice(0, 15).map(block => {
    const title = tagValue(block, ['title']);
    const link = tagValue(block, ['link']) || attributeValue(block, 'link', 'href') || tagValue(block, ['guid','id']);
    const summary = tagValue(block, ['description','summary','content:encoded','content']);
    const pub = tagValue(block, ['pubDate','published','updated','dc:date']);
    const image = attributeValue(block, 'enclosure', 'url') || attributeValue(block, 'media:content', 'url') || attributeValue(block, 'media:thumbnail', 'url');
    const video = attributeValue(block, 'media:content', 'url') && /video/i.test(block.match(/<media:content\b[^>]*>/i)?.[0] || '')
      ? attributeValue(block, 'media:content', 'url') : '';
    return { title, link, summary: summary.slice(0, 3500), publishedAt: pub, imageUrl: image.startsWith('https://') ? image : '', videoUrl: video && (allowedUrl(video) || isVideoUrl(video)) ? video : '' };
  }).filter(x => x.title && allowedUrl(x.link));
}
function safeHtml(input: string) {
  return input
    .replace(/<(script|style|iframe|object|embed|form|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    .replace(/<(?!\/?(?:p|h2|h3|h4|ul|ol|li|strong|b|em|i|blockquote)\b)[^>]*>/gi, '')
    .replace(/<(p|h2|h3|h4|ul|ol|li|strong|b|em|i|blockquote)\b[^>]*>/gi, '<$1>');
}
async function callGeminiWithFallback(key: string, model: string, requestBody: unknown) {
  const fallback = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
  const models = [...new Set([model, fallback])];
  let lastError = 'Gemini is temporarily unavailable.';
  for (const candidate of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(60000),
        });
        if (response.ok) return await response.json();
        const detail = await response.text();
        lastError = `Gemini model ${candidate} returned HTTP ${response.status}: ${detail.slice(0, 350)}`;
        if (![429, 500, 502, 503, 504].includes(response.status)) throw new Error(lastError);
      } catch (error) {
        if (error instanceof Error && !error.message.includes('fetch failed') && !error.name.includes('Timeout')) throw error;
        lastError = error instanceof Error ? error.message : String(error);
      }
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 1200));
    }
  }
  throw new Error(lastError + ' Please retry in a few minutes; the fallback model was also unavailable.');
}

async function geminiDraft(item: Record<string, unknown>, format: 'news' | 'article' = 'news') {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini is not configured. Add GEMINI_API_KEY to Netlify environment variables and redeploy.');
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const isLongForm = format === 'article';
  const prompt = [
    'You are the newsroom drafting assistant for NaijaToday, a Nigerian digital news publication.',
    'Create an ORIGINAL, publication-ready ' + (isLongForm ? 'LONG-FORM ARTICLE' : 'NEWS STORY') + ' using only the source details supplied below plus clearly labelled, reliable general background knowledge.',
    'Do not copy source wording, invent quotes, invent statistics, fabricate events, or add unsupported specific claims. Clearly attribute source claims to the named publisher. Do not present allegations as proven facts. Use Nigerian/British English.',
    'Return ONLY valid JSON with these keys: title, excerpt, content_html, category, seo_title, seo_description, tags.',
    'content_html must use only simple paragraphs and headings (p, h2, h3, strong, em, ul, li). ' + (isLongForm ? 'Write a substantive article of 1,700-2,000 words, and NEVER return fewer than 1,600 words. Develop a clear introduction, 6-9 useful H2 sections, relevant context, implications, balanced perspectives, practical details where supported, and a concise conclusion. Do not repeat points or pad the article. If the supplied source does not contain enough verifiable information for a responsible 1,600-word article, explicitly say so in the content and do not invent details; the editor can add further research.' : 'Write a concise 350-600 word news report, prioritising verified facts and a clear news structure. If source details are limited, keep it shorter rather than filling gaps.') + ' Do not add an invented dateline.',
    'SEO description must be under 160 characters. tags must be an array of 3-6 short strings.',
    'Source name: ' + String(item.source_name || ''),
    'Source headline: ' + String(item.source_title || ''),
    'Source URL: ' + String(item.source_url || ''),
    'Source publication date: ' + String(item.source_published_at || 'Not supplied'),
    'Source summary/extract: ' + String(item.source_summary || 'No summary supplied').slice(0, 3500),
    'Suggested category: ' + String(item.category || 'Nigeria')
  ].join('\n')
  const payload = await callGeminiWithFallback(key, model, {
    systemInstruction: { parts: [{ text: 'Be a careful, neutral Nigerian newsroom editor. Never fabricate facts or sources.' }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.35, responseMimeType: 'application/json', maxOutputTokens: format === 'article' ? 8192 : 4096 },
  });
  const text = payload?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('');
  if (!text) throw new Error('Gemini returned an empty response. Check the API key, model access and quota.');
  const parsed = JSON.parse(text.replace(/^```(?:json)?|\```$/g, '').trim());
  if (!parsed.title || !parsed.excerpt || !parsed.content_html) throw new Error('Gemini response was missing required article fields.');
  const cleanedContent = safeHtml(String(parsed.content_html));
  const generatedWords = cleanedContent.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  if (format === 'article' && generatedWords < 1600) throw new Error('The AI returned ' + generatedWords + ' words. A full article must contain at least 1,600 words. Try again or use News brief for a shorter report.');
  return {
    title: String(parsed.title).slice(0, 240),
    excerpt: String(parsed.excerpt).slice(0, 500),
    content: cleanedContent,
    category: String(parsed.category || item.category || 'Nigeria').slice(0, 80),
    seo_title: String(parsed.seo_title || parsed.title).slice(0, 70),
    seo_description: String(parsed.seo_description || parsed.excerpt).slice(0, 160),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((x: unknown) => String(x).slice(0, 40)).slice(0, 8) : [],
  };
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    const db = serviceClient();
    const [sources, items] = await Promise.all([
      db.from('ai_newsroom_sources').select('*').order('created_at', { ascending: false }),
      db.from('ai_newsroom_items').select('*').neq('status', 'dismissed').order('created_at', { ascending: false }).limit(60),
    ]);
    if (sources.error) throw sources.error;
    if (items.error) throw items.error;
    return NextResponse.json({ sources: sources.data || [], items: items.data || [], providerConfigured: !!process.env.GEMINI_API_KEY });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load newsroom.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    const body = await request.json();
    const db = serviceClient();

    if (body.action === 'add_source') {
      const name = String(body.name || '').trim().slice(0, 100);
      const feedUrl = String(body.feed_url || '').trim();
      if (!name || !allowedUrl(feedUrl)) return NextResponse.json({ error: 'Enter a valid HTTPS RSS/Atom feed hosted by an approved news domain.' }, { status: 400 });
      const domain = new URL(feedUrl).hostname;
      const { data, error } = await db.from('ai_newsroom_sources').insert({ name, feed_url: feedUrl, domain }).select('*').single();
      if (error) throw error;
      return NextResponse.json({ source: data });
    }

    if (body.action === 'fetch_feed') {
      const { data: source, error: sourceError } = await db.from('ai_newsroom_sources').select('*').eq('id', body.source_id).single();
      if (sourceError || !source) return NextResponse.json({ error: 'News source not found.' }, { status: 404 });
      if (!source.is_active || !allowedUrl(source.feed_url)) return NextResponse.json({ error: 'This feed is inactive or its domain is not approved.' }, { status: 400 });
      const feedResponse = await fetch(source.feed_url, { headers: { 'User-Agent': 'NaijaTodayNewsroom/1.0', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' }, redirect: 'error', signal: AbortSignal.timeout(12000) });
      if (!feedResponse.ok) throw new Error(`Feed returned HTTP ${feedResponse.status}.`);
      const xml = await feedResponse.text();
      if (xml.length > 2_000_000) throw new Error('Feed is too large to process.');
      const entries = parseFeed(xml);
      if (!entries.length) throw new Error('No readable RSS/Atom stories found. Check that this is a feed URL, not a normal webpage.');
      let added = 0;
      for (const entry of entries) {
        const publishedAt = entry.publishedAt && !Number.isNaN(Date.parse(entry.publishedAt)) ? new Date(entry.publishedAt).toISOString() : null;
        const { data: inserted, error } = await db.from('ai_newsroom_items').upsert({
          source_id: source.id, source_name: source.name, source_url: entry.link,
          source_title: entry.title, source_summary: entry.summary || null,
          source_published_at: publishedAt, source_image_url: entry.imageUrl || null,
          source_video_url: entry.videoUrl || null, status: 'discovered', updated_at: new Date().toISOString(),
        }, { onConflict: 'source_url', ignoreDuplicates: true }).select('id');
        if (!error) added += inserted?.length || 0;
      }
      return NextResponse.json({ found: entries.length, added });
    }

    if (body.action === 'generate') {
      const { data: item, error } = await db.from('ai_newsroom_items').select('*').eq('id', body.item_id).single();
      if (error || !item) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
      const format = body.format === 'article' ? 'article' : 'news';
      const generated = await geminiDraft(item, format);
      const { error: updateError } = await db.from('ai_newsroom_items').update({
        generated_title: generated.title, generated_excerpt: generated.excerpt,
        generated_content: generated.content, generated_category: generated.category,
        generated_seo_title: generated.seo_title, generated_seo_description: generated.seo_description,
        generated_tags: generated.tags, generated_at: new Date().toISOString(),
        status: 'generated', updated_at: new Date().toISOString(),
      }).eq('id', item.id);
      if (updateError) throw updateError;
      return NextResponse.json({ generated });
    }

    if (body.action === 'save_draft') {
      const { data: item, error } = await db.from('ai_newsroom_items').select('*').eq('id', body.item_id).single();
      if (error || !item?.generated_title || !item.generated_content) return NextResponse.json({ error: 'Generate the article before saving it.' }, { status: 400 });
      if (item.post_id) return NextResponse.json({ error: 'This story has already been saved to the article workflow.' }, { status: 409 });
      const title = String(body.title || item.generated_title).trim().slice(0, 240);
      const excerpt = String(body.excerpt || item.generated_excerpt || '').trim().slice(0, 500);
      const articleContent = safeHtml(String(body.content || item.generated_content));
      const format = body.format === 'article' ? 'article' : 'news';
      const articleWords = articleContent.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
      if (format === 'article' && articleWords < 1600) return NextResponse.json({ error: 'This article has ' + articleWords + ' words. Full articles must contain at least 1,600 words. Expand the draft before saving, or select News brief.' }, { status: 400 });
      const category = String(body.category || item.generated_category || 'Nigeria').trim().slice(0, 80);
      if (!title || !excerpt || !articleContent) return NextResponse.json({ error: 'Headline, summary and article body are required.' }, { status: 400 });
      const image = typeof body.image_url === 'string' && /^https:\/\/res\.cloudinary\.com\//.test(body.image_url) ? body.image_url : '📰';
      const video = typeof body.video_url === 'string' && (allowedUrl(body.video_url) || isVideoUrl(body.video_url)) ? body.video_url : '';
      const scheduleAt = body.scheduled_at ? new Date(body.scheduled_at) : null;
      const scheduled = !!scheduleAt && !Number.isNaN(scheduleAt.getTime()) && scheduleAt.getTime() > Date.now();
      const safeSourceUrl = new URL(String(item.source_url)).toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      const safeSourceName = String(item.source_name).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
      const sourceLink = `<p><strong>Source:</strong> <a href="${safeSourceUrl}" target="_blank" rel="nofollow noopener">${safeSourceName}</a></p>`;
      const safeVideoUrl = video ? new URL(video).toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;') : '';
      const videoLink = safeVideoUrl ? `<p><strong>Related video:</strong> <a href="${safeVideoUrl}" target="_blank" rel="nofollow noopener">Watch video</a></p>` : '';
      const content = articleContent + sourceLink + videoLink;
      const wordCount = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
      const now = new Date().toISOString();
      const { data: post, error: postError } = await db.from('posts').insert({
        title, excerpt, content,
        category, image,
        author: 'NaijaToday Desk', read_time: `${Math.max(1, Math.ceil(wordCount / 200))} min`,
        breaking: false, hot: false, featured: false, sponsored: false,
        tags: item.generated_tags || [], views: 0, upvotes: 0, comments: 0,
        published: false, workflow_status: scheduled ? 'scheduled' : 'draft',
        scheduled_at: scheduled ? scheduleAt!.toISOString() : null,
        seo_title: item.generated_seo_title, seo_description: item.generated_seo_description,
        created_at: now, updated_at: now,
      }).select('id').single();
      if (postError) throw postError;
      const { error: itemError } = await db.from('ai_newsroom_items').update({
        status: scheduled ? 'scheduled' : 'draft_saved', post_id: post.id, updated_at: now,
      }).eq('id', item.id);
      if (itemError) throw itemError;
      return NextResponse.json({ post_id: post.id, status: scheduled ? 'scheduled' : 'draft_saved' });
    }

    if (body.action === 'dismiss') {
      const { error } = await db.from('ai_newsroom_items').update({ status: 'dismissed', updated_at: new Date().toISOString() }).eq('id', body.item_id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown newsroom action.' }, { status: 400 });
  } catch (error) {
    console.error('AI Newsroom error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'AI Newsroom request failed.' }, { status: 500 });
  }
}
