import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAIL } from '@/lib/auth';
import { CATEGORIES } from '@/lib/theme';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server database credentials are not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function isAdmin(request: NextRequest) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!token) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.getUser(token);
  return !error && data.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
const FORUM_CATEGORIES = CATEGORIES.map((category) => category.name);
function safeForumCategory(value: unknown) {
  const candidate = safeText(value, 80);
  return FORUM_CATEGORIES.find((category) => category.toLowerCase() === candidate.toLowerCase()) || 'Forum';
}
function safeText(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function safeHttps(value: unknown) {
  try { const u = new URL(String(value || '')); return u.protocol === 'https:' ? u.toString() : ''; }
  catch { return ''; }
}
async function callGeminiForClassification(key: string, model: string, requestBody: unknown) {
  // Keep classification resilient in the same way as article generation:
  // try the configured primary model, then the configured fallback model.
  const fallback = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
  const models = [...new Set([model, fallback])];
  let lastError = 'Gemini is temporarily unavailable.';
  for (const candidate of models) {
    // Keep this synchronous Netlify request within the platform's execution window.
    // One short attempt per model avoids stacking retries into an edge 504 timeout.
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(9000),
      });
      if (response.ok) return await response.json();
      const detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 220);
      lastError = response.status === 429
        ? `Gemini model ${candidate} is rate-limited or its quota is exhausted (429).${detail ? ' ' + detail : ''}`
        : `Gemini model ${candidate} returned HTTP ${response.status}.${detail ? ' ' + detail : ''}`;
      if (![429, 500, 502, 503, 504].includes(response.status)) throw new Error(lastError);
    } catch (error) {
      if (error instanceof Error && !error.message.includes('fetch failed') && !error.name.includes('Timeout') && !error.name.includes('Abort')) throw error;
      lastError = error instanceof Error && error.name.includes('Timeout')
        ? `Gemini model ${candidate} timed out.`
        : 'Could not reach Gemini. Please check the connection and retry.';
    }
  }
  throw new Error(lastError + ' The primary and fallback models could not complete classification. Check the Gemini API quota or set GEMINI_FALLBACK_MODEL to an available model in Netlify environment variables.');
}

async function classify(item: any) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini is not configured. Add GEMINI_API_KEY and redeploy.');
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const prompt = `Classify this Nigerian news-feed item for NaijaToday. Return ONLY JSON with destination ("forum_thread", "job", "scholarship", or "news"), confidence (0-100), reason, and payload. For forum_thread payload use title, body, category. The category MUST be exactly one of these existing NaijaToday Forum categories: ${FORUM_CATEGORIES.join(", ")}. Choose the closest matching category; never invent a category. For job use title, company, location, salary, type, experience_level, deadline, category, apply_url, description, requirements. For scholarship use title, provider, deadline, country, fully (boolean), level, field, apply_url. Never invent missing facts, URLs, dates, employers or providers; use empty strings/null where absent. Only classify as job or scholarship if the source clearly describes a real opportunity and provides a specific application URL; otherwise use news or forum_thread. Forum payload must be a neutral discussion starter with a question and source attribution. Do not treat ordinary news about hiring or education policy as an actual vacancy or scholarship. Use confidence carefully: 90-100 only when the source explicitly supports the destination and key details; 70-89 when the fit is strong but some non-essential details are missing; below 70 when uncertain. Prefer destination news when the story is not clearly an actionable vacancy or scholarship. For jobs, require a specific role, identifiable employer and direct HTTPS application URL. For scholarships, require a named award/provider and direct HTTPS application URL. Do not infer that a deadline is open or current unless the source says so.
Headline: ${item.source_title}
Publisher: ${item.source_name}
Source URL: ${item.source_url}
Summary: ${String(item.source_summary || '').slice(0, 3500)}
Generated headline: ${item.generated_title || ''}
Generated summary: ${item.generated_excerpt || ''}`;
  const result = await callGeminiForClassification(key, model, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  });
  const raw = result?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('');
  if (!raw) throw new Error('Gemini returned an empty classification.');
  const parsed = JSON.parse(raw.replace(/^```(?:json)?|\`\`\`$/g, '').trim());
  const allowed = ['forum_thread','job','scholarship','news'];
  if (!allowed.includes(parsed.destination)) throw new Error('AI returned an unsupported destination.');
  const payload = parsed.payload && typeof parsed.payload === 'object' ? parsed.payload : {};
  if (parsed.destination === 'forum_thread') payload.category = safeForumCategory(payload.category);
  return { destination: parsed.destination, confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)), reason: safeText(parsed.reason, 800), payload };
}

async function findExistingTarget(db: ReturnType<typeof dbClient>, destination: string, payload: any) {
  if (destination === 'forum_thread') {
    const title = safeText(payload.title, 240);
    if (!title) return null;
    const { data } = await db.from('forum_threads').select('id').eq('title', title).limit(1).maybeSingle();
    return data?.id ? Number(data.id) : null;
  }
  if (destination === 'job') {
    const applyUrl = safeHttps(payload.apply_url);
    const title = safeText(payload.title, 240);
    const company = safeText(payload.company, 180);
    if (applyUrl) {
      const { data } = await db.from('jobs').select('id').eq('apply_url', applyUrl).limit(1).maybeSingle();
      if (data?.id) return Number(data.id);
    }
    if (title && company) {
      const { data } = await db.from('jobs').select('id').ilike('title', title).ilike('company', company).limit(1).maybeSingle();
      if (data?.id) return Number(data.id);
    }
    return null;
  }
  if (destination === 'scholarship') {
    const applyUrl = safeHttps(payload.apply_url);
    const title = safeText(payload.title, 240);
    const provider = safeText(payload.provider, 180);
    if (applyUrl) {
      const { data } = await db.from('scholarships').select('id').eq('apply_url', applyUrl).limit(1).maybeSingle();
      if (data?.id) return Number(data.id);
    }
    if (title && provider) {
      const { data } = await db.from('scholarships').select('id').ilike('title', title).ilike('provider', provider).limit(1).maybeSingle();
      if (data?.id) return Number(data.id);
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  const db = dbClient();
  const { data, error } = await db.from('ai_newsroom_distributions').select('*, ai_newsroom_items(source_title,source_name,source_url)').order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ distributions: data || [] });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    const body = await request.json();
    const db = dbClient();
    if (body.action === 'classify') {
      const { data: item, error } = await db.from('ai_newsroom_items').select('*').eq('id', body.item_id).single();
      if (error || !item) return NextResponse.json({ error: 'Newsroom story not found.' }, { status: 404 });
      const result = await classify(item);
      return NextResponse.json({ classification: result });
    }
    if (body.action === 'queue') {
      const itemId = safeText(body.item_id, 50);
      const destination = safeText(body.destination, 30);
      if (!/^[0-9a-f-]{36}$/i.test(itemId) || !['forum_thread','job','scholarship'].includes(destination)) return NextResponse.json({ error: 'Select a valid story and destination.' }, { status: 400 });
      let payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
      // News-classified items can still be sent to the Forum as a discussion starter.
      // Never leave a queued forum distribution without the required title and body.
      if (destination === 'forum_thread' && (!safeText(payload.title, 240) || !safeText(payload.body, 5000))) {
        const { data: sourceItem, error: sourceError } = await db.from('ai_newsroom_items')
          .select('source_title,source_name').eq('id', itemId).single();
        if (sourceError || !sourceItem) return NextResponse.json({ error: 'Could not load the source story to prepare its forum discussion.' }, { status: 404 });
        const headline = safeText(sourceItem.source_title, 200) || 'A current Nigerian news story';
        const publisher = safeText(sourceItem.source_name, 120) || 'the source publisher';
        payload = {
          ...payload,
          title: safeText(payload.title, 240) || 'Discussion: ' + headline,
          body: safeText(payload.body, 5000) || `This story was reported by ${publisher}: “${headline}”. What are your views on this development and its possible impact? Please keep the discussion respectful and focus on verified information.`,
          category: safeForumCategory(payload.category),
        };
      }
      const { data: priorDistribution } = await db.from('ai_newsroom_distributions').select('id,status').eq('item_id', itemId).eq('destination', destination).maybeSingle();
      if (priorDistribution?.status === 'published') return NextResponse.json({ error: 'This story has already been distributed to this destination. Check Distribution history instead of queueing it again.' }, { status: 409 });
      const { data, error } = await db.from('ai_newsroom_distributions').upsert({
        item_id: itemId, destination, payload, confidence: Math.max(0, Math.min(100, Number(body.confidence) || 0)),
        reason: safeText(body.reason, 800), status: 'pending',
      }, { onConflict: 'item_id,destination' }).select('*').single();
      if (error) throw error;
      return NextResponse.json({ distribution: data });
    }
    if (body.action === 'review') {
      const id = safeText(body.id, 50);
      const decision = body.decision === 'approve' ? 'approve' : body.decision === 'reject' ? 'reject' : '';
      if (!id || !decision) return NextResponse.json({ error: 'Invalid review action.' }, { status: 400 });
      const { data: record, error } = await db.from('ai_newsroom_distributions').select('*').eq('id', id).eq('status', 'pending').single();
      if (error || !record) return NextResponse.json({ error: 'Pending distribution not found.' }, { status: 404 });
      if (decision === 'reject') {
        const { error: updateError } = await db.from('ai_newsroom_distributions').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id);
        if (updateError) throw updateError;
        return NextResponse.json({ ok: true, status: 'rejected' });
      }
      let p = record.payload || {};
      let targetId: number | null = null;
      const existingTargetId = await findExistingTarget(db, record.destination, p);
      const duplicate = existingTargetId !== null;
      if (duplicate) {
        targetId = existingTargetId;
      } else if (record.destination === 'forum_thread') {
        let title = safeText(p.title, 240);
        let bodyText = safeText(p.body, 5000);
        // Repair older pending entries that were queued with an empty forum payload.
        if (!title || !bodyText) {
          const { data: sourceItem, error: sourceError } = await db.from('ai_newsroom_items')
            .select('source_title,source_name').eq('id', record.item_id).single();
          if (sourceError || !sourceItem) return NextResponse.json({ error: 'The forum draft is incomplete and its source story could not be loaded. Reject it and add it to the approval queue again.' }, { status: 400 });
          const headline = safeText(sourceItem.source_title, 200) || 'A current Nigerian news story';
          const publisher = safeText(sourceItem.source_name, 120) || 'the source publisher';
          p = {
            ...p,
            title: title || 'Discussion: ' + headline,
            body: bodyText || `This story was reported by ${publisher}: “${headline}”. What are your views on this development and its possible impact? Please keep the discussion respectful and focus on verified information.`,
            category: safeForumCategory(p.category),
          };
          title = safeText(p.title, 240);
          bodyText = safeText(p.body, 5000);
          const { error: repairError } = await db.from('ai_newsroom_distributions').update({ payload: p }).eq('id', id);
          if (repairError) throw repairError;
        }
        const { data: created, error: insertError } = await db.from('forum_threads').insert({
          title, body: bodyText, preview: bodyText.slice(0, 240), category: safeForumCategory(p.category),
          author: 'NaijaToday Desk', author_email: 'system@naijatoday', status: 'pending',
          replies: 0, views: 'New', hot: false, pinned: false, closed: false, upvotes: 0,
        }).select('id').single();
        if (insertError) throw insertError;
        targetId = created.id;
      } else if (record.destination === 'job') {
        const title = safeText(p.title, 240), company = safeText(p.company, 180), applyUrl = safeHttps(p.apply_url);
        if (!title || !company || !applyUrl) return NextResponse.json({ error: 'A verified job title, employer and HTTPS application link are required.' }, { status: 400 });
        const { data: created, error: insertError } = await db.from('jobs').insert({
          title, company, location: safeText(p.location, 180), salary: safeText(p.salary, 120) || null,
          type: safeText(p.type, 80) || 'Not specified', experience_level: safeText(p.experience_level, 100) || null,
          deadline: safeText(p.deadline, 100) || null, posted_date: new Date().toISOString(),
          logo: '💼', category: safeText(p.category, 100) || 'General', apply_url: applyUrl,
          description: safeText(p.description, 4000), requirements: safeText(p.requirements, 3000),
        }).select('id').single();
        if (insertError) throw insertError;
        targetId = created.id;
      } else if (record.destination === 'scholarship') {
        const title = safeText(p.title, 240), provider = safeText(p.provider, 180), applyUrl = safeHttps(p.apply_url);
        if (!title || !provider || !applyUrl) return NextResponse.json({ error: 'A verified scholarship title, provider and HTTPS application link are required.' }, { status: 400 });
        const { data: created, error: insertError } = await db.from('scholarships').insert({
          title, provider, deadline: safeText(p.deadline, 100) || null, country: safeText(p.country, 100) || null,
          fully: Boolean(p.fully), level: safeText(p.level, 100) || null, field: safeText(p.field, 180) || null, apply_url: applyUrl,
        }).select('id').single();
        if (insertError) throw insertError;
        targetId = created.id;
      }
      const { error: updateError } = await db.from('ai_newsroom_distributions').update({ status: 'published', reviewed_at: new Date().toISOString(), payload: { ...p, target_id: targetId, duplicate_detected: duplicate } }).eq('id', id);
      if (updateError) throw updateError;
      await db.from('admin_activity_log').insert({ action: 'ai_newsroom_distribution_approved', detail: record.destination + ' distribution approved for ' + safeText(p.title, 180), admin_email: 'system@naijatoday' });
      return NextResponse.json({ ok: true, status: 'published', target_id: targetId, duplicate });
    }
    return NextResponse.json({ error: 'Unknown distribution action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Distribution action failed.' }, { status: 500 });
  }
}
