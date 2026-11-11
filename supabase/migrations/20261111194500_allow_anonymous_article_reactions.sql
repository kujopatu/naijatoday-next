-- Allow anonymous article reactions using a browser-generated UUID identity.
-- Existing signed-in reaction records are preserved under a non-login actor namespace.
ALTER TABLE public.post_reaction_users RENAME COLUMN user_email TO actor_key;
UPDATE public.post_reaction_users
SET actor_key = 'user:' || lower(actor_key)
WHERE actor_key NOT LIKE 'visitor:%' AND actor_key NOT LIKE 'user:%';

DROP POLICY IF EXISTS "Users delete their own reaction choice" ON public.post_reaction_users;
DROP POLICY IF EXISTS "Users insert their own reaction choice" ON public.post_reaction_users;
DROP POLICY IF EXISTS "Users read their own reaction choice" ON public.post_reaction_users;
DROP POLICY IF EXISTS "Users update their own reaction choice" ON public.post_reaction_users;
DROP POLICY IF EXISTS reaction_users_all ON public.post_reaction_users;

ALTER TABLE public.post_reaction_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.post_reaction_users FROM PUBLIC, anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.post_reaction_users TO anon, authenticated;

CREATE POLICY "Visitors can add article reactions"
ON public.post_reaction_users
FOR INSERT TO anon, authenticated
WITH CHECK (
  actor_key ~ '^visitor:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND emoji IN ('🔥', '😮', '😢', '😡', '👏')
);

CREATE POLICY "Visitors can remove their browser reaction"
ON public.post_reaction_users
FOR DELETE TO anon, authenticated
USING (
  actor_key ~ '^visitor:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
);

-- Aggregate rows remain publicly readable; individual actor keys remain private.
REVOKE ALL PRIVILEGES ON TABLE public.post_reactions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.post_reactions TO anon, authenticated;
