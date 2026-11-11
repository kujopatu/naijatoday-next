-- Batch 4: pin search_path for functions flagged by the Supabase security advisor.
-- pg_catalog is searched first for built-ins; public is included for the
-- explicitly qualified application objects and existing trigger dependencies.
-- Untrusted roles do not have CREATE privilege on public.

ALTER FUNCTION public.protect_reply_content_fields()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.increment_thread_upvotes(bigint)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.decrement_thread_upvotes(bigint)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.increment_reply_upvotes(bigint)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.decrement_reply_upvotes(bigint)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.handle_new_user()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.increment_post_views(uuid)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.increment_post_upvotes(uuid)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.decrement_post_upvotes(uuid)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.sync_post_workflow_fields()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.notify_n8n_on_publish()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.protect_thread_moderation_fields()
  SET search_path = pg_catalog, public;
