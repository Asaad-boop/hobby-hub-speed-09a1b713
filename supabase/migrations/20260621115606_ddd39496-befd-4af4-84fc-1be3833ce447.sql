
CREATE OR REPLACE FUNCTION public.lookup_order_by_phone(_phone_tail text)
RETURNS SETOF public.orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.orders
  WHERE regexp_replace(COALESCE(shipping_phone,''), '\D', '', 'g') LIKE '%' || _phone_tail
  ORDER BY created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.lookup_order_by_id(_order_id uuid)
RETURNS SETOF public.orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.orders WHERE id = _order_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_order_by_phone(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_order_by_id(uuid) TO anon, authenticated;
