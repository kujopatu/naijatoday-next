-- Reading history is private user data. Restrict reads to the authenticated
-- account whose email owns the row; anonymous visitors cannot read it.
DROP POLICY IF EXISTS "Users can read own history" ON public.reading_history;
CREATE POLICY "Users can read own history"
ON public.reading_history
FOR SELECT
TO authenticated
USING (
  user_email = (SELECT auth.jwt() ->> 'email')
);
