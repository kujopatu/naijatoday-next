-- Preserve forum counters while ordinary member UPDATE access is removed.
CREATE OR REPLACE FUNCTION public.increment_forum_thread_views(p_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  UPDATE public.forum_threads
  SET views = (
    CASE WHEN views ~ '^[0-9]+$' THEN views::bigint ELSE 0 END + 1
  )::text
  WHERE id = p_id;
$$;
REVOKE ALL ON FUNCTION public.increment_forum_thread_views(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_forum_thread_views(bigint) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_forum_thread_reply_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_thread_id bigint;
BEGIN
  target_thread_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.thread_id ELSE NEW.thread_id END;
  UPDATE public.forum_threads
  SET replies = (
    SELECT count(*)::integer
    FROM public.forum_replies
    WHERE thread_id = target_thread_id
  )
  WHERE id = target_thread_id;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_forum_thread_reply_count() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_sync_forum_thread_reply_count ON public.forum_replies;
CREATE TRIGGER trg_sync_forum_thread_reply_count
AFTER INSERT OR DELETE ON public.forum_replies
FOR EACH ROW EXECUTE FUNCTION public.sync_forum_thread_reply_count();
