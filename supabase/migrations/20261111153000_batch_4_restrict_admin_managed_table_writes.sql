-- Batch 4: administrative content tables must not be writable by public users.
DROP POLICY IF EXISTS "Allow admin delete" ON public.breaking_news;
DROP POLICY IF EXISTS "Allow admin insert" ON public.breaking_news;
DROP POLICY IF EXISTS "Allow admin update" ON public.breaking_news;

DROP POLICY IF EXISTS "Admin can manage jobs" ON public.jobs;
DROP POLICY IF EXISTS "Public delete jobs" ON public.jobs;
DROP POLICY IF EXISTS "Public insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Public update jobs" ON public.jobs;
CREATE POLICY "Admins manage jobs" ON public.jobs
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public delete scholarships" ON public.scholarships;
DROP POLICY IF EXISTS "Public insert scholarships" ON public.scholarships;
DROP POLICY IF EXISTS "Public update scholarships" ON public.scholarships;
CREATE POLICY "Admins manage scholarships" ON public.scholarships
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone can insert/update/delete for now" ON public.products;
CREATE POLICY "Admins manage products" ON public.products
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone can insert/update/delete for now" ON public.fixtures;
CREATE POLICY "Admins manage fixtures" ON public.fixtures
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone can insert/update/delete for now" ON public.trends;
CREATE POLICY "Admins manage trends" ON public.trends
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated upsert" ON public.site_settings;
CREATE POLICY "Admins manage site settings" ON public.site_settings
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manage social posts" ON public.social_posts;
CREATE POLICY "Admins manage social posts" ON public.social_posts
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Auth write data_plans" ON public.data_plans;
CREATE POLICY "Admins manage data plans" ON public.data_plans
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Auth update fuel_prices" ON public.fuel_prices;
CREATE POLICY "Admins manage fuel prices" ON public.fuel_prices
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.ad_stats;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.ad_stats;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.ad_stats;
CREATE POLICY "Admins manage ad stats" ON public.ad_stats
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
