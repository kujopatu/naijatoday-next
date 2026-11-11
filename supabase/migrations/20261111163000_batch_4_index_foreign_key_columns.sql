-- Add indexes to foreign-key columns used in joins and parent-row deletes.
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_created_by ON public.ad_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_newsroom_items_post_id ON public.ai_newsroom_items(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_reports_thread_id ON public.forum_reports(thread_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_post_id ON public.reading_history(post_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON public.saved_posts(post_id);
