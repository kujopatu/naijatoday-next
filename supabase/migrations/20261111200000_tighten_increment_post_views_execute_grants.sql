-- Restrict the public default EXECUTE grant while preserving intentional
-- anonymous and authenticated article-view counting.
REVOKE ALL ON FUNCTION public.increment_post_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_post_views(uuid) TO anon, authenticated, service_role;
