-- Trigger functions are invoked by their owning table triggers, not through the public RPC API.
REVOKE ALL ON FUNCTION public.capture_post_revision() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_n8n_on_publish() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_reply_content_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_thread_moderation_fields() FROM PUBLIC, anon, authenticated;
