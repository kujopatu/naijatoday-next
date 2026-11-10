import { createClient } from '@supabase/supabase-js';

export const config = { background: true };

const ADMIN_EMAIL = 'kujopatu@gmail.com';

function wordCount(html: string) {
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

function safeHtml(input: string) {
  return input
    .replace(/<(script|style|iframe|object|embed|form|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    .replace(/<(?!\/?(?:p|h2|h3|h4|ul|ol|li|strong|b|em|i|blockquote)\b)[^>]*>/gi, '')
    .replace(/<(p|h2|h3|h4|ul|ol|li|strong|b|em|i|blockquote)\b[^>]*>/gi, '<$1>');
}

async function callGemini(
  key: string,
  model: string,
  requestBody: unknown,
  onRetry: (details: { model: string; attempt: number; message: string; delayMs: number }) => Promise<void>,
) {
  const fallback = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
  const fallback2 = process.env.GEMINI_FALLBACK_MODEL_2 || '';
  const candidates = [...new Set([model, fallback, fallback2].filter(Boolean))];
  let lastError = 'Gemini is temporarily unavailable.';

  for (const candidate of candidates) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      let shouldRetry = false;
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(90000),
        });
        if (response.ok) return await response.json();
        const detail = await response.text();
        lastError = `Gemini model ${candidate} returned HTTP ${response.status}: ${detail.slice(0, 250)}`;
        if (![429, 500, 502, 503, 504].includes(response.status)) throw new Error(lastError);
        shouldRetry = true;
        const retryAfter = Number(response.headers.get('retry-after'));
        const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 30000)
          : Math.min(2000 * (2 ** (attempt - 1)), 20000);
        if (attempt < 3) {
          await onRetry({ model: candidate, attempt, message: lastError, delayMs });
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        if (error instanceof Error && !error.message.includes('fetch failed') && !error.name.includes('Timeout') && !error.name.includes('AbortError')) throw error;
        lastError = error instanceof Error ? error.message : String(error);
        shouldRetry = true;
        if (attempt < 3) {
          const delayMs = Math.min(2000 * (2 ** (attempt - 1)), 20000);
          await onRetry({ model: candidate, attempt, message: lastError, delayMs });
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
      if (!shouldRetry) break;
    }
  }
  throw new Error(lastError + ' All configured Gemini models and retries were exhausted. Check the model availability and retry later.');
}

async function generateArticle(item: Record<string, unknown>, db: ReturnType<typeof createClient>) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini is not configured. Add GEMINI_API_KEY to Netlify environment variables.');
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const prompt = [
    'You are the newsroom drafting assistant for NaijaToday, a Nigerian digital news publication.',
    'Create an ORIGINAL, publication-ready LONG-FORM ARTICLE using only the source details supplied below plus clearly labelled, reliable general background knowledge.',
    'Do not copy source wording, invent quotes, invent statistics, fabricate events, or add unsupported specific claims. Clearly attribute source claims to the named publisher. Do not present allegations as proven facts. Use Nigerian/British English.',
    'Return ONLY valid JSON with these keys: title, excerpt, content_html, category, seo_title, seo_description, tags.',
    'content_html must use simple paragraphs and headings (p, h2, h3, strong, em, ul, li). Write a substantive article of 1,700-2,000 words, and NEVER return fewer than 1,600 words. Develop a clear introduction, 6-9 useful H2 sections, relevant context, implications, balanced perspectives, practical details where supported, and a concise conclusion. Do not repeat points or pad the article. If the supplied source does not contain enough verifiable information for a responsible 1,600-word article, explicitly say so in the content and do not invent details; the editor can add further research.',
    'SEO description must be under 160 characters. tags must be an array of 3-6 short strings.',
    'Source name: ' + String(item.source_name || ''),
    'Source headline: ' + String(item.source_title || ''),
    'Source URL: ' + String(item.source_url || ''),
    'Source publication date: ' + String(item.source_published_at || 'Not supplied'),
    'Source summary/extract: ' + String(item.source_summary || 'No summary supplied').slice(0, 3500),
    'Suggested category: ' + String(item.category || 'Nigeria'),
  ].join('\n');
  const payload = await callGemini(key, model, {
    systemInstruction: { parts: [{ text: 'Be a careful, neutral Nigerian newsroom editor. Never fabricate facts or sources.' }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.35, responseMimeType: 'application/json', maxOutputTokens: 8192 },
  }, async ({ model: retryModel, attempt, message, delayMs }) => {
    const { data: current } = await db.from('ai_newsroom_items')
      .select('generation_retry_count').eq('id', String(item.id)).single();
    const retryCount = Number(current?.generation_retry_count || 0) + 1;
    const { error } = await db.from('ai_newsroom_items').update({
      generation_retry_count: retryCount,
      generation_error: `Temporary Gemini issue on ${retryModel} (retry ${attempt}/3). Retrying in ${Math.ceil(delayMs / 1000)} seconds. Latest error: ${message.slice(0, 500)}`,
      updated_at: new Date().toISOString(),
    }).eq('id', String(item.id));
    if (error) console.error('Could not record Gemini retry status:', error.message);
    console.warn(`Gemini temporary failure; model=${retryModel}, retry=${retryCount}, delayMs=${delayMs}`);
  });
  const candidate = payload?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p: { text?: string }) => p.text || '').join('');
  if (!text) throw new Error('Gemini returned an empty response. Check the API key, model access and quota.');
  let parsed: any;
  try { parsed = JSON.parse(text.replace(/^\`\`\`(?:json)?|\`\`\`$/g, '').trim()); }
  catch { throw new Error('Gemini returned an incomplete response instead of valid article JSON. Retry generation.'); }
  if (!parsed.title || !parsed.excerpt || !parsed.content_html) throw new Error('Gemini response was missing required article fields.');
  const content = safeHtml(String(parsed.content_html));
  const words = wordCount(content);
  if (words < 1600) throw new Error(`The AI returned only ${words} words. A full article must contain at least 1,600 words. Retry generation or research the story further.`);
  return {
    generated_title: String(parsed.title).slice(0, 240),
    generated_excerpt: String(parsed.excerpt).slice(0, 500),
    generated_content: content,
    generated_category: String(parsed.category || item.category || 'Nigeria').slice(0, 80),
    generated_seo_title: String(parsed.seo_title || parsed.title).slice(0, 70),
    generated_seo_description: String(parsed.seo_description || parsed.excerpt).slice(0, 160),
    generated_tags: Array.isArray(parsed.tags) ? parsed.tags.map((x: unknown) => String(x).slice(0, 40)).slice(0, 8) : [],
    generated_at: new Date().toISOString(),
    status: 'generated',
    generation_error: null,
    updated_at: new Date().toISOString(),
  };
}

export default async function generateAiArticleBackground(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !serviceKey) {
    console.error('AI article background job is missing Supabase environment variables.');
    return new Response('Background generation is not configured.', { status: 500 });
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return new Response('Admin access required.', { status: 401 });

  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || authData.user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return new Response('Admin access required.', { status: 403 });
  }

  let body: { item_id?: string };
  try { body = await request.json(); }
  catch { return new Response('Invalid request.', { status: 400 }); }
  if (!body.item_id || !/^[0-9a-f-]{36}$/i.test(body.item_id)) return new Response('A valid story ID is required.', { status: 400 });

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date().toISOString();
  const { data: item, error: itemError } = await db.from('ai_newsroom_items').select('*').eq('id', body.item_id).single();
  if (itemError || !item) {
    console.error('AI article background job could not find its story:', itemError?.message);
    return new Response('Story not found.', { status: 404 });
  }

  const { error: startError } = await db.from('ai_newsroom_items').update({
    status: 'generating',
    generation_error: null,
    generation_retry_count: 0,
    generation_started_at: now,
    generation_attempts: (item.generation_attempts || 0) + 1,
    updated_at: now,
  }).eq('id', item.id);
  if (startError) {
    console.error('Could not mark AI article generation as started:', startError.message);
    return new Response('Could not update the story status. Please retry.', { status: 500 });
  }

  try {
    const generated = await generateArticle(item, db);
    const { error } = await db.from('ai_newsroom_items').update(generated).eq('id', item.id);
    if (error) throw error;
    console.log(`AI Newsroom article generated successfully for item ${item.id}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : 'Article generation failed.';
    console.error('AI Newsroom background generation failed:', message);
    await db.from('ai_newsroom_items').update({
      status: 'generation_failed',
      generation_error: message,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id);
  }
  return new Response(null, { status: 202 });
}
