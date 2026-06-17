GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "products public read" ON public.products;
CREATE POLICY "products public read active"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "categories public read" ON public.categories;
CREATE POLICY "categories public read active"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "site settings public read safe keys" ON public.site_settings;
CREATE POLICY "site settings public read storefront keys"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key = ANY (ARRAY['site_config'::text, 'hero'::text, 'announcement'::text, 'contact'::text, 'shipping'::text, 'meta_pixel_id'::text, 'meta_pixel_enabled'::text]));