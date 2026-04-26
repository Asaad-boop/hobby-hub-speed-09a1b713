CREATE OR REPLACE FUNCTION public.hard_delete_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can delete orders';
  END IF;

  DELETE FROM public.activity_logs WHERE order_id = _order_id;
  DELETE FROM public.activity_log WHERE entity_type = 'order' AND entity_id = _order_id;
  DELETE FROM public.coupon_usage WHERE order_id = _order_id;
  DELETE FROM public.courier_shipments WHERE order_id = _order_id;
  DELETE FROM public.order_items WHERE order_id = _order_id;
  DELETE FROM public.orders WHERE id = _order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hard_delete_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hard_delete_order(uuid) TO anon;