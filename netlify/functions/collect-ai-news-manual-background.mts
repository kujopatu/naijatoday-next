import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'kujopatu@gmail.com';

type NetlifyEvent = { headers?: Record<string, string | undefined> };

async function logEvent(db: any, action: string, detail: string) {
  const { error } = await db.from('admin_activity_log').insert({
    action, detail: detail.slice(0, 1800), admin_email: 'system@naijatoday',
  });
  if (error) console.error('Could not log manual AI Newsroom event:', error.message);
}

export default async function collectNewsManually(event: NetlifyEvent) {
  const headers = event.headers || {};
  const authorization = headers.authorization || headers.Authorization || '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) return { statusCode: 401, body: JSON.stringify({ error: 'Admin sign-in is required.' }) };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Newsroom server configuration is incomplete.' }) };
  }

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: authError } = await authClient.auth.getUser(token);
  if (authError || userData.user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required.' }) };
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = Date.now();
  const recentCutoff = new Date(now - 20 * 60 * 1000).toISOString();
  const [latestStart, latestCycle] = await Promise.all([
    db.from('admin_activity_log').select('created_at').eq('action', 'ai_newsroom_manual_collection_started').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('admin_activity_log').select('created_at').eq('action', 'ai_newsroom_cycle').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const startedAt = latestStart.data?.created_at ? Date.parse(latestStart.data.created_at) : 0;
  const cycleAt = latestCycle.data?.created_at ? Date.parse(latestCycle.data.created_at) : 0;
  if (startedAt > cycleAt && startedAt > Date.parse(recentCutoff)) {
    return { statusCode: 409, body: JSON.stringify({ error: 'A manual collection is already running. Refresh the monitor shortly.' }) };
  }

  const host = headers.host || headers['x-forwarded-host'] || '';
  const safeHost = /^[a-z0-9.-]+(?::\d+)?$/i.test(host) ? host : '';
  const baseUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || (safeHost ? 'https://' + safeHost : '')).replace(/\/$/, '');
  if (!baseUrl) return { statusCode: 500, body: JSON.stringify({ error: 'Could not determine the newsroom site URL.' }) };

  await logEvent(db, 'ai_newsroom_manual_collection_started', 'Administrator started a manual feed collection and draft-generation cycle.');
  const apiHeaders = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  let feedsChecked = 0;
  let storiesAdded = 0;
  let drafted = 0;
  let failed = 0;

  try {
    const statusResponse = await fetch(baseUrl + '/api/admin/ai-newsroom', {
      headers: { Authorization: 'Bearer ' + token }, cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    if (!statusResponse.ok) throw new Error('Could not read configured news feeds (HTTP ' + statusResponse.status + ').');
    const status = await statusResponse.json();
    const sources = (status.sources || []).filter((source: any) => source.is_active);

    for (const source of sources) {
      try {
        const response = await fetch(baseUrl + '/api/admin/ai-newsroom', {
          method: 'POST', headers: apiHeaders,
          body: JSON.stringify({ action: 'fetch_feed', source_id: source.id }),
          signal: AbortSignal.timeout(25000),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Feed request failed (HTTP ' + response.status + ').');
        feedsChecked++;
        storiesAdded += Number(result.added || 0);
      } catch (error) {
        failed++;
        await logEvent(db, 'ai_newsroom_feed_failed', source.name + ': ' + (error instanceof Error ? error.message : String(error)));
      }
    }

    const queueResponse = await fetch(baseUrl + '/api/admin/ai-newsroom', {
      headers: { Authorization: 'Bearer ' + token }, cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    if (!queueResponse.ok) throw new Error('Could not load the draft queue (HTTP ' + queueResponse.status + ').');
    const queuePayload = await queueResponse.json();
    const queue = (queuePayload.items || [])
      .filter((item: any) => item.status === 'discovered')
      .sort((a: any, b: any) => Date.parse(a.created_at) - Date.parse(b.created_at))
      .slice(0, 5);

    for (const item of queue) {
      try {
        const response = await fetch(baseUrl + '/api/admin/ai-newsroom', {
          method: 'POST', headers: apiHeaders,
          body: JSON.stringify({ action: 'generate', item_id: item.id, format: 'news' }),
          signal: AbortSignal.timeout(100000),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Draft generation failed (HTTP ' + response.status + ').');
        drafted++;
      } catch (error) {
        failed++;
        const message = (error instanceof Error ? error.message : String(error)).slice(0, 1000);
        await db.from('ai_newsroom_items').update({
          status: 'generation_failed', generation_error: message, updated_at: new Date().toISOString(),
        }).eq('id', item.id);
        await logEvent(db, 'ai_newsroom_draft_failed', item.source_title + ': ' + message);
      }
    }

    const detail = 'Manual run checked ' + feedsChecked + ' feeds; added ' + storiesAdded + ' new stories; generated ' + drafted + ' drafts; ' + failed + ' errors.';
    await logEvent(db, 'ai_newsroom_cycle', detail);
    return { statusCode: 200, body: JSON.stringify({ ok: true, feedsChecked, storiesAdded, drafted, failed }) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logEvent(db, 'ai_newsroom_manual_collection_failed', message);
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
}
