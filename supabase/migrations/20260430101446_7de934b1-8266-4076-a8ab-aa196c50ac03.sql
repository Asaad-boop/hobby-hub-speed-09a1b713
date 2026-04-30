DROP POLICY IF EXISTS "anyone insert abandoned cart" ON public.abandoned_carts;
DROP POLICY IF EXISTS "anyone update abandoned cart by session" ON public.abandoned_carts;

CREATE POLICY "public insert abandoned cart"
  ON public.abandoned_carts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "public update abandoned cart"
  ON public.abandoned_carts
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);