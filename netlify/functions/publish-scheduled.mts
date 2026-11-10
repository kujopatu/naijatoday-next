import { createClient } from '@supabase/supabase-js';

// Netlify runs this every five minutes. Add SUPABASE_SERVICE_ROLE_KEY
// to the Netlify environment variables before relying on automatic publishing.
export const config = {
  schedule: '*/5 * * * *',
};

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
    return new Response('Scheduled publishing failed.', { status: 500 });
  }

  console.log(`Published ${data?.length || 0} scheduled NaijaToday article(s).`);
  return new Response(JSON.stringify({ published: data?.length || 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
