-- Evaluate JWT helpers once per statement instead of once per row.
ALTER POLICY "Users can view own profile" ON public.profiles
USING ((SELECT auth.uid()) = id);

ALTER POLICY "Authenticated users can submit mod requests" ON public.mod_requests
WITH CHECK ((SELECT auth.jwt() ->> 'email') = email);

ALTER POLICY "Users read own notifs" ON public.notifications
USING (recipient_email = (SELECT auth.jwt() ->> 'email'));

ALTER POLICY "Users update own notifs" ON public.notifications
USING (recipient_email = (SELECT auth.jwt() ->> 'email'));

ALTER POLICY "Users can insert own reading history" ON public.reading_history
WITH CHECK ((SELECT auth.jwt() ->> 'email') = user_email);

ALTER POLICY "Users can update own reading history" ON public.reading_history
USING ((SELECT auth.jwt() ->> 'email') = user_email)
WITH CHECK ((SELECT auth.jwt() ->> 'email') = user_email);

ALTER POLICY "Users can delete own saved posts" ON public.saved_posts
USING ((SELECT auth.jwt() ->> 'email') = user_email);

ALTER POLICY "Users can insert own saved posts" ON public.saved_posts
WITH CHECK ((SELECT auth.jwt() ->> 'email') = user_email);

ALTER POLICY "Users can read own saved posts" ON public.saved_posts
USING ((SELECT auth.jwt() ->> 'email') = user_email);

ALTER POLICY "saved_own" ON public.saved_posts
USING (user_email = (SELECT auth.jwt() ->> 'email'))
WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

ALTER POLICY "Users can update own profile" ON public.user_profiles
USING ((SELECT auth.jwt() ->> 'email') = user_email)
WITH CHECK ((SELECT auth.jwt() ->> 'email') = user_email);

ALTER POLICY "Users can upsert own profile" ON public.user_profiles
WITH CHECK ((SELECT auth.jwt() ->> 'email') = user_email);
