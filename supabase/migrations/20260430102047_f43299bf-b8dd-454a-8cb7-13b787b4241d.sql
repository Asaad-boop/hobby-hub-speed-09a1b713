-- Tighten policies: remove permissive write policies; only the SECURITY DEFINER
-- functions below will write. Staff read policy stays.
DROP POLICY IF EXISTS "public insert abandoned cart" ON public.abandoned_carts;
DROP POLICY IF EXISTS "public update abandoned cart" ON public.abandoned_carts;
DROP POLICY IF EXISTS "anyone insert abandoned cart" ON public.abandoned_carts;
DROP POLICY IF EXISTS "anyone update abandoned cart by session" ON public.abandoned_carts;
DROP POLICY IF EXISTS "owner insert abandoned cart" ON public.abandoned_carts;
DROP POLICY IF EXISTS "owner update own cart" ON public.abandoned_carts;

REVOKE INSERT, UPDATE, DELETE ON public.abandoned_carts FROM anon, authenticated;

-- Upsert helper: creates a new abandoned cart row or updates an existing one
-- by id. Runs as definer so guests can call it without direct table writes.
CREATE OR REPLACE FUNCTION public.upsert_abandoned_cart(
  _id uuid,
  _session_id text,
  _customer_name text,
  _customer_phone text,
  _customer_email text,
  _shipping_address text,
  _shipping_city text,
  _shipping_district text,
  _shipping_thana text,
  _subtotal numeric,
  _cart_items jsonb,
  _last_step text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row_id uuid;
BEGIN
  IF _id IS NOT NULL THEN
    UPDATE public.abandoned_carts SET
      session_id = COALESCE(_session_id, session_id),
      user_id = COALESCE(_uid, user_id),
      customer_name = _customer_name,
      customer_phone = _customer_phone,
      customer_email = _customer_email,
      shipping_address = _shipping_address,
      shipping_city = _shipping_city,
      shipping_district = _shipping_district,
      shipping_thana = _shipping_thana,
      subtotal = COALESCE(_subtotal, 0),
      cart_items = COALESCE(_cart_items, '[]'::jsonb),
      last_step = _last_step,
      updated_at = now()
    WHERE id = _id AND is_converted = false
    RETURNING id INTO _row_id;

    IF _row_id IS NOT NULL THEN
      RETURN _row_id;
    END IF;
  END IF;

  INSERT INTO public.abandoned_carts (
    session_id, user_id, customer_name, customer_phone, customer_email,
    shipping_address, shipping_city, shipping_district, shipping_thana,
    subtotal, cart_items, last_step, is_converted
  ) VALUES (
    _session_id, _uid, _customer_name, _customer_phone, _customer_email,
    _shipping_address, _shipping_city, _shipping_district, _shipping_thana,
    COALESCE(_subtotal, 0), COALESCE(_cart_items, '[]'::jsonb), _last_step, false
  )
  RETURNING id INTO _row_id;

  RETURN _row_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_abandoned_cart(
  uuid, text, text, text, text, text, text, text, text, numeric, jsonb, text
) TO anon, authenticated;

-- Mark cart as converted when order completes
CREATE OR REPLACE FUNCTION public.mark_abandoned_cart_converted(
  _id uuid,
  _order_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.abandoned_carts
  SET is_converted = true,
      converted_order_id = _order_id,
      updated_at = now()
  WHERE id = _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_abandoned_cart_converted(uuid, uuid)
  TO anon, authenticated;