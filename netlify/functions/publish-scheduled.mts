import { createClient } from '@supabase/supabase-js';

// Netlify runs this every five minutes. Add SUPABASE_SERVICE_ROLE_KEY
// to the Netlify environment variables before relying on automatic publishing.
export const config = {
  schedule: '*/5 * * * *',
};

const ADMIN_EMAIL = 'kujopatu@gmail.com';

async function recordPublishingEvent(supabase: any, action: string, detail: string, notify = false) {
  try {
    const { error } = await supabase.from('admin_activity_log').insert({
      action, detail: detail.slice(0, 2000), admin_email: 'system@naijatoday',
    });
    if (error) console.error('Could not write scheduled-publishing activity log:', error.message);
  } catch (error) {
    console.error('Scheduled-publishing activity log failed:', error);
  }
  if (notify) {
    try {
      const message = 'NaijaToday scheduled publishing needs attention';
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase.from('notifications').select('id')
        .eq('recipient_email', ADMIN_EMAIL).eq('type', 'system').eq('message', message)
        .gte('created_at', since).limit(1);
      if (!recent?.length) {
        const { error } = await supabase.from('notifications').insert({
          recipient_email: ADMIN_EMAIL, type: 'system', message,
          preview: detail.slice(0, 500), read: false, post_id: null,
        });
        if (error) console.error('Could not create scheduled-publishing notification:', error.message);
      }
    } catch (error) {
      console.error('Scheduled-publishing notification failed:', error);
    }
  }
}

export default async function publishScheduledArticles() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Scheduled publishing is not configured: missing Supabase URL or service role key.');
    return new Response('Scheduled publishing is not configured.', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('posts')
    .update({
      published: true,
      workflow_status: 'published',
      published_at: now,
      scheduled_at: null,
      updated_at: now,
    })
    .eq('workflow_status', 'scheduled')
    .eq('published', false)
    .lte('scheduled_at', now)
    .select('id,title');

  if (error) {
    console.error('Scheduled article publishing failed:', error.message);
    await recordPublishingEvent(supabase, 'scheduled_publishing_failed', error.message, true);
    return new Response('Scheduled publishing failed.', { status: 500 });
  }

  const publishedIds = (data || []).map((row: { id: string }) => row.id);
  if (publishedIds.length) {
    const { error: newsroomError } = await supabase
      .from('ai_newsroom_items')
      .update({ status: 'published', updated_at: now })
      .in('post_id', publishedIds);
    if (newsroomError) {
      console.error('Could not sync AI newsroom publication statuses:', newsroomError.message);
      await recordPublishingEvent(supabase, 'scheduled_publishing_sync_failed', newsroomError.message, true);
    }
  }

  const publishedCount = data?.length || 0;
  console.log(`Published ${publishedCount} scheduled NaijaToday article(s).`);
  if (publishedCount > 0) await recordPublishingEvent(supabase, 'scheduled_articles_published', `Published ${publishedCount} article(s): ${(data || []).map((row: { title?: string }) => row.title || 'Untitled').join('; ').slice(0, 1500)}`);
  return new Response(JSON.stringify({ published: data?.length || 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
