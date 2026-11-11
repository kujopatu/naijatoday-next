-- Replace forgeable browser IDs with Supabase-managed anonymous/authenticated identities.
DROP POLICY IF EXISTS "Visitors can add article reactions" ON public.post_reaction_users;
DROP POLICY IF EXISTS "Visitors can remove their browser reaction" ON public.post_reaction_users;

REVOKE ALL PRIVILEGES ON TABLE public.post_reaction_users FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.post_reaction_users TO authenticated;

CREATE POLICY "Members read their own article reaction"
ON public.post_reaction_users FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND actor_key = 'auth:' || (select auth.uid())::text);

CREATE POLICY "Members add their own article reaction"
ON public.post_reaction_users FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND actor_key = 'auth:' || (select auth.uid())::text
  AND emoji IN ('🔥', '😮', '😢', '😡', '👏')
);

CREATE POLICY "Members update their own article reaction"
ON public.post_reaction_users FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL AND actor_key = 'auth:' || (select auth.uid())::text)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND actor_key = 'auth:' || (select auth.uid())::text
  AND emoji IN ('🔥', '😮', '😢', '😡', '👏')
);

CREATE POLICY "Members remove their own article reaction"
ON public.post_reaction_users FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL AND actor_key = 'auth:' || (select auth.uid())::text);
