-- Create missing finalize_order_on_confirm function referenced by handle_order_status_change trigger.
-- Acts as a no-op placeholder so that confirming an order does not error.
CREATE OR REPLACE FUNCTION public.finalize_order_on_confirm(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark confirmed timestamp if not already set; primary trigger also handles this.
  UPDATE public.orders
     SET confirmed_at = COALESCE(confirmed_at, now()),
         verified_at  = COALESCE(verified_at, now())
   WHERE id = _order_id;
END;
$$;