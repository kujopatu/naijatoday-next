-- Secure article/forum voting and reactions.
-- Aggregate counters are maintained by trigger-only SECURITY DEFINER functions.
-- Clients can mutate only their own vote/reaction rows while authenticated.

CREATE OR REPLACE FUNCTION public.sync_post_vote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET upvotes = COALESCE(upvotes, 0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET upvotes = GREATEST(COALESCE(upvotes, 0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_forum_vote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'thread' THEN
      UPDATE public.forum_threads SET upvotes = COALESCE(upvotes, 0) + 1 WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'reply' THEN
      UPDATE public.forum_replies SET upvotes = COALESCE(upvotes, 0) + 1 WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'thread' THEN
      UPDATE public.forum_threads SET upvotes = GREATEST(COALESCE(upvotes, 0) - 1, 0) WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'reply' THEN
      UPDATE public.forum_replies SET upvotes = GREATEST(COALESCE(upvotes, 0) - 1, 0) WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_post_reaction_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.post_reactions AS pr (post_id, emoji, count)
    VALUES (NEW.post_id, NEW.emoji, 1)
    ON CONFLICT (post_id, emoji) DO UPDATE SET count = COALESCE(pr.count, 0) + 1;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_reactions
       SET count = GREATEST(COALESCE(count, 0) - 1, 0)
     WHERE post_id = OLD.post_id AND emoji = OLD.emoji;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.emoji IS DISTINCT FROM OLD.emoji THEN
      UPDATE public.post_reactions
         SET count = GREATEST(COALESCE(count, 0) - 1, 0)
       WHERE post_id = OLD.post_id AND emoji = OLD.emoji;
      INSERT INTO public.post_reactions AS pr (post_id, emoji, count)
      VALUES (NEW.post_id, NEW.emoji, 1)
      ON CONFLICT (post_id, emoji) DO UPDATE SET count = COALESCE(pr.count, 0) + 1;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_post_vote_count ON public.post_votes;
CREATE TRIGGER trg_sync_post_vote_count AFTER INSERT OR DELETE ON public.post_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_post_vote_count();

DROP TRIGGER IF EXISTS trg_sync_forum_vote_count ON public.forum_votes;
CREATE TRIGGER trg_sync_forum_vote_count AFTER INSERT OR DELETE ON public.forum_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_forum_vote_count();

DROP TRIGGER IF EXISTS trg_sync_post_reaction_count ON public.post_reaction_users;
CREATE TRIGGER trg_sync_post_reaction_count AFTER INSERT OR UPDATE OR DELETE ON public.post_reaction_users
FOR EACH ROW EXECUTE FUNCTION public.sync_post_reaction_count();

REVOKE ALL PRIVILEGES ON TABLE public.post_reactions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.post_reactions TO anon, authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.post_votes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.post_votes TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.post_votes_id_seq TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.forum_votes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.forum_votes TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.forum_votes_id_seq TO authenticated;

DROP POLICY IF EXISTS "Public read access for post_votes" ON public.post_votes;
DROP POLICY IF EXISTS "Public insert access for post_votes" ON public.post_votes;
DROP POLICY IF EXISTS "Public delete access for post_votes" ON public.post_votes;
CREATE POLICY "Members read their own post votes" ON public.post_votes
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND lower(voter_key) = lower((SELECT auth.jwt() ->> 'email')));
CREATE POLICY "Signed-in members insert their own post votes" ON public.post_votes
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND lower(voter_key) = lower((SELECT auth.jwt() ->> 'email')));
CREATE POLICY "Signed-in members delete their own post votes" ON public.post_votes
FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL AND lower(voter_key) = lower((SELECT auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "Public read access for forum_votes" ON public.forum_votes;
DROP POLICY IF EXISTS "Public insert access for forum_votes" ON public.forum_votes;
DROP POLICY IF EXISTS "Public delete access for forum_votes" ON public.forum_votes;
CREATE POLICY "Members read their own forum votes" ON public.forum_votes
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND lower(voter_key) = lower((SELECT auth.jwt() ->> 'email')));
CREATE POLICY "Signed-in members insert their own forum votes" ON public.forum_votes
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND lower(voter_key) = lower((SELECT auth.jwt() ->> 'email')));
CREATE POLICY "Signed-in members delete their own forum votes" ON public.forum_votes
FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL AND lower(voter_key) = lower((SELECT auth.jwt() ->> 'email')));

REVOKE ALL PRIVILEGES ON TABLE public.post_reaction_users FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.post_reaction_users TO authenticated;
DROP POLICY IF EXISTS reaction_users_all ON public.post_reaction_users;
CREATE POLICY "Users read their own reaction choice" ON public.post_reaction_users
FOR SELECT TO authenticated USING (lower(user_email) = lower((SELECT auth.jwt() ->> 'email')));
CREATE POLICY "Users insert their own reaction choice" ON public.post_reaction_users
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND lower(user_email) = lower((SELECT auth.jwt() ->> 'email')));
CREATE POLICY "Users update their own reaction choice" ON public.post_reaction_users
FOR UPDATE TO authenticated
USING (lower(user_email) = lower((SELECT auth.jwt() ->> 'email')))
WITH CHECK (lower(user_email) = lower((SELECT auth.jwt() ->> 'email')));
CREATE POLICY "Users delete their own reaction choice" ON public.post_reaction_users
FOR DELETE TO authenticated USING (lower(user_email) = lower((SELECT auth.jwt() ->> 'email')));

REVOKE ALL ON FUNCTION public.increment_post_upvotes(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.decrement_post_upvotes(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.increment_thread_upvotes(bigint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.decrement_thread_upvotes(bigint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.increment_reply_upvotes(bigint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.decrement_reply_upvotes(bigint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.increment_reaction(text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.decrement_reaction(text, text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.sync_post_vote_count() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.sync_forum_vote_count() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.sync_post_reaction_count() FROM PUBLIC, anon, authenticated, service_role;
