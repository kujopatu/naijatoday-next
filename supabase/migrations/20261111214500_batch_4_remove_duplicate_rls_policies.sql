-- Remove only exact duplicate RLS policies. Keep the surviving policy names
-- and authorization expressions unchanged.

DROP POLICY IF EXISTS "Public read jobs" ON public.jobs;
DROP POLICY IF EXISTS "Public read" ON public.posts;
DROP POLICY IF EXISTS "Public insert access for subscribers" ON public.subscribers;

-- saved_own already covers SELECT/INSERT/UPDATE/DELETE for the same owner.
-- Retain it because it also preserves the UPDATE permission.
DROP POLICY IF EXISTS "Users can delete own saved posts" ON public.saved_posts;
DROP POLICY IF EXISTS "Users can insert own saved posts" ON public.saved_posts;
DROP POLICY IF EXISTS "Users can read own saved posts" ON public.saved_posts;
