CREATE OR REPLACE FUNCTION public.is_recent_guest_order(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = _order_id
      AND is_guest_order = true
      AND created_at > now() - interval '5 minutes'
  )
$$;

DROP POLICY IF EXISTS "anyone insert guest order items" ON public.order_items;

CREATE POLICY "anyone insert recent guest order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NULL
  AND public.is_recent_guest_order(order_id)
);