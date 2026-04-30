-- Allow returning the freshly-inserted guest order id from supabase.from('orders').insert().select()
-- Without a SELECT policy for anon, the insert succeeds but RLS rejects the returned row,
-- which surfaces as "new row violates row-level security policy" in PostgREST.
CREATE POLICY "anyone read guest orders by id"
  ON public.orders
  FOR SELECT
  TO anon, authenticated
  USING (is_guest_order = true);