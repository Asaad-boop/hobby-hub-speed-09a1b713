-- Relax INSERT policy on abandoned_carts so anonymous checkout sessions
-- can record partial info even when the x-session-id header is not
-- forwarded by the Supabase gateway. Reads stay restricted to staff.

DROP POLICY IF EXISTS "owner insert abandoned cart" ON public.abandoned_carts;

CREATE POLICY "anyone insert abandoned cart"
  ON public.abandoned_carts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- guests: must have no user_id (no impersonation)
    (user_id IS NULL)
    OR
    -- logged-in users: can only insert under their own id
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "owner update own cart" ON public.abandoned_carts;

CREATE POLICY "anyone update abandoned cart by session"
  ON public.abandoned_carts
  FOR UPDATE
  TO anon, authenticated
  USING (
    (user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  )
  WITH CHECK (
    (user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );