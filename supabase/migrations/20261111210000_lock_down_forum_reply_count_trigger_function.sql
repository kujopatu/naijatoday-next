-- Trigger-only helper: clients must not be able to invoke it directly.
REVOKE ALL ON FUNCTION public.sync_forum_thread_reply_count()
FROM PUBLIC, anon, authenticated, service_role;
