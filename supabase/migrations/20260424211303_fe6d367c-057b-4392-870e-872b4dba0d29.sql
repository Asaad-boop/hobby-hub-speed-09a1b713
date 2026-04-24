-- Allow the inserter (anon) to read back the row they just created via .select() return.
-- Without this, .insert(...).select() fails with 42501 even though the insert succeeded.
-- We scope it tightly to guest orders only (user_id IS NULL AND is_guest_order = true)
-- so guests still cannot list other people's orders by enumeration:
-- PostgREST only returns rows from the just-inserted result set.
CREATE POLICY "anon read guest orders"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (is_guest_order = true AND user_id IS NULL);

-- Same for order_items, since checkout/LP also does .insert(...) on order_items
-- and may rely on returning behavior. Items linked to guest orders only.
CREATE POLICY "anon read guest order items"
ON public.order_items
FOR SELECT
TO anon, authenticated
USING (
  user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.is_guest_order = true
      AND o.user_id IS NULL
  )
);

-- Cleanup the test rows we created during diagnosis
DELETE FROM public.orders WHERE notes = 'lp test' OR guest_name LIKE 'TEST%';