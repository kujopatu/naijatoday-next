-- Batch 4: these operational tables are accessed through trusted server-side
-- routes using the Supabase service role. They intentionally have no client RLS
-- policies, so remove redundant direct API privileges from public client roles.
-- service_role retains its existing grants and bypasses RLS as intended.

REVOKE ALL PRIVILEGES ON TABLE
  public.admin_activity_log,
  public.ai_newsroom_items,
  public.ai_newsroom_sources,
  public.banned_users,
  public.trending_topics
FROM PUBLIC, anon, authenticated;
