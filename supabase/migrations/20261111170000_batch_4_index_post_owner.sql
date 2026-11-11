-- Support writer-only draft visibility and ownership checks.
CREATE INDEX IF NOT EXISTS idx_posts_created_by ON public.posts(created_by);
