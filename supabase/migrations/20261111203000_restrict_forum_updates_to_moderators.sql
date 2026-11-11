-- Restrict forum thread and reply updates to moderators.
-- Ordinary members currently have no edit workflow for these records.
DROP POLICY IF EXISTS "Authenticated users can update threads" ON public.forum_threads;
CREATE POLICY "Moderators can update threads"
ON public.forum_threads
FOR UPDATE
TO authenticated
USING (public.is_moderator())
WITH CHECK (public.is_moderator());

DROP POLICY IF EXISTS "Authenticated users can update replies" ON public.forum_replies;
CREATE POLICY "Moderators can update replies"
ON public.forum_replies
FOR UPDATE
TO authenticated
USING (public.is_moderator())
WITH CHECK (public.is_moderator());
