GRANT INSERT, UPDATE ON public.abandoned_carts TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_abandoned_cart(uuid, text, text, text, text, text, text, text, text, numeric, jsonb, text) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_abandoned_cart_converted(uuid, uuid) TO anon;

DROP POLICY IF EXISTS "anon_insert_abandoned_cart" ON public.abandoned_carts;
CREATE POLICY "anon_insert_abandoned_cart"
ON public.abandoned_carts
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "anon_upsert_abandoned_cart" ON public.abandoned_carts;
CREATE POLICY "anon_upsert_abandoned_cart"
ON public.abandoned_carts
FOR UPDATE
TO anon
USING (user_id IS NULL AND is_converted = false)
WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "anon_insert_sessions" ON public.active_sessions;
CREATE POLICY "anon_insert_sessions"
ON public.active_sessions
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_upsert_sessions" ON public.active_sessions;
CREATE POLICY "anon_upsert_sessions"
ON public.active_sessions
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);