-- Batch 4: evaluate JWT and UID helpers once per statement in remaining RLS policies.
-- This preserves each policy's ownership and authorization rules.

ALTER POLICY "Members read their own post votes" ON public.post_votes
  USING ((SELECT auth.uid()) IS NOT NULL AND lower(voter_key) = lower(((SELECT auth.jwt()) ->> 'email')));
ALTER POLICY "Signed-in members insert their own post votes" ON public.post_votes
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND lower(voter_key) = lower(((SELECT auth.jwt()) ->> 'email')));
ALTER POLICY "Signed-in members delete their own post votes" ON public.post_votes
  USING ((SELECT auth.uid()) IS NOT NULL AND lower(voter_key) = lower(((SELECT auth.jwt()) ->> 'email')));

ALTER POLICY "Members read their own forum votes" ON public.forum_votes
  USING ((SELECT auth.uid()) IS NOT NULL AND lower(voter_key) = lower(((SELECT auth.jwt()) ->> 'email')));
ALTER POLICY "Signed-in members insert their own forum votes" ON public.forum_votes
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND lower(voter_key) = lower(((SELECT auth.jwt()) ->> 'email')));
ALTER POLICY "Signed-in members delete their own forum votes" ON public.forum_votes
  USING ((SELECT auth.uid()) IS NOT NULL AND lower(voter_key) = lower(((SELECT auth.jwt()) ->> 'email')));

ALTER POLICY "Authenticated users can submit mod requests" ON public.mod_requests
  WITH CHECK (((SELECT auth.jwt()) ->> 'email') = email);

ALTER POLICY "Users read own notifs" ON public.notifications
  USING (recipient_email = ((SELECT auth.jwt()) ->> 'email'));
ALTER POLICY "Users update own notifs" ON public.notifications
  USING (recipient_email = ((SELECT auth.jwt()) ->> 'email'))
  WITH CHECK (recipient_email = ((SELECT auth.jwt()) ->> 'email'));

ALTER POLICY "Users can insert own reading history" ON public.reading_history
  WITH CHECK (((SELECT auth.jwt()) ->> 'email') = user_email);
ALTER POLICY "Users can read own history" ON public.reading_history
  USING (user_email = ((SELECT auth.jwt()) ->> 'email'));
ALTER POLICY "Users can update own reading history" ON public.reading_history
  USING (((SELECT auth.jwt()) ->> 'email') = user_email)
  WITH CHECK (((SELECT auth.jwt()) ->> 'email') = user_email);

ALTER POLICY "Users can delete own saved posts" ON public.saved_posts
  USING (((SELECT auth.jwt()) ->> 'email') = user_email);
ALTER POLICY "Users can insert own saved posts" ON public.saved_posts
  WITH CHECK (((SELECT auth.jwt()) ->> 'email') = user_email);
ALTER POLICY "Users can read own saved posts" ON public.saved_posts
  USING (((SELECT auth.jwt()) ->> 'email') = user_email);
ALTER POLICY saved_own ON public.saved_posts
  USING (user_email = ((SELECT auth.jwt()) ->> 'email'))
  WITH CHECK (user_email = ((SELECT auth.jwt()) ->> 'email'));

ALTER POLICY "Users can update own profile" ON public.user_profiles
  USING (((SELECT auth.jwt()) ->> 'email') = user_email)
  WITH CHECK (((SELECT auth.jwt()) ->> 'email') = user_email);
ALTER POLICY "Users can upsert own profile" ON public.user_profiles
  WITH CHECK (((SELECT auth.jwt()) ->> 'email') = user_email);
