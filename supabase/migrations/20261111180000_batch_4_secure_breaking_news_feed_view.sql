-- Batch 4: ensure the public breaking-news feed applies caller permissions and RLS.
-- The underlying breaking_news table has an explicit public SELECT policy and
-- authenticated moderator write policies. SECURITY INVOKER makes those policies
-- apply to the role querying this view instead of the view owner.

ALTER VIEW public.breaking_news_feed
  SET (security_invoker = true);
