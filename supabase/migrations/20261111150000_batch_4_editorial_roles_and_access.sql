-- Batch 4: editorial roles and database-enforced article permissions.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'writer';

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.posts ALTER COLUMN created_by SET DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role::text = 'moderator'
    )
    OR EXISTS (
      SELECT 1 FROM public.moderators m
      WHERE lower(m.email) = lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
    );
$$;

CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role::text = 'editor'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_writer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role::text = 'writer'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_editorial_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT public.is_editor() OR public.is_writer() OR public.is_moderator();
$$;

DROP POLICY IF EXISTS "Admins and moderators can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Admins and moderators can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Admins and moderators can update posts" ON public.posts;
DROP POLICY IF EXISTS "Editorial team can read all posts" ON public.posts;
DROP POLICY IF EXISTS "Moderators can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Moderators can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Moderators can update posts" ON public.posts;
DROP POLICY IF EXISTS "Editorial staff can read all posts" ON public.posts;

CREATE POLICY "Editorial staff can read permitted posts"
ON public.posts FOR SELECT TO authenticated
USING (
  public.is_editor() OR public.is_moderator()
  OR (public.is_writer() AND created_by = (SELECT auth.uid()))
);

CREATE POLICY "Editors and moderators or writers can create posts"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (
  public.is_editor() OR public.is_moderator()
  OR (public.is_writer() AND created_by = (SELECT auth.uid()) AND COALESCE(published, false) = false)
);

CREATE POLICY "Editors and moderators or writers can update posts"
ON public.posts FOR UPDATE TO authenticated
USING (
  public.is_editor() OR public.is_moderator()
  OR (public.is_writer() AND created_by = (SELECT auth.uid()) AND COALESCE(published, false) = false)
)
WITH CHECK (
  public.is_editor() OR public.is_moderator()
  OR (public.is_writer() AND created_by = (SELECT auth.uid()) AND COALESCE(published, false) = false)
);

CREATE POLICY "Editors and moderators can delete posts"
ON public.posts FOR DELETE TO authenticated
USING (public.is_editor() OR public.is_moderator());

DROP POLICY IF EXISTS "Admin can delete mod requests" ON public.mod_requests;
CREATE POLICY "Admin can delete mod requests" ON public.mod_requests
FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can read mod requests" ON public.mod_requests;
CREATE POLICY "Admin can read mod requests" ON public.mod_requests
FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage moderators" ON public.moderators;
CREATE POLICY "Admin can manage moderators" ON public.moderators
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_moderator() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_editor() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_writer() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_editorial_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_moderator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_editor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_writer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_editorial_staff() TO authenticated;
