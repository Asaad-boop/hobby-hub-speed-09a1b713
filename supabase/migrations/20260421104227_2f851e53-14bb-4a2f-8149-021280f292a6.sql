-- ============ ORDERS: tracking & attribution columns ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS entry_url text,
  ADD COLUMN IF NOT EXISTS session_source text,
  ADD COLUMN IF NOT EXISTS fb_click_id text,
  ADD COLUMN IF NOT EXISTS fb_browser_pixel text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS meta_ad_account_id text,
  ADD COLUMN IF NOT EXISTS meta_campaign_id text,
  ADD COLUMN IF NOT EXISTS meta_ad_set_id text,
  ADD COLUMN IF NOT EXISTS meta_ad_id text,
  ADD COLUMN IF NOT EXISTS is_preorder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_cross_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_tags text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_orders_shipping_phone ON public.orders(shipping_phone);
CREATE INDEX IF NOT EXISTS idx_orders_guest_phone ON public.orders(guest_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- ============ ACTIVITY LOGS ============
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_order_id ON public.activity_logs(order_id, created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff view activity logs"
  ON public.activity_logs FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'customer_service'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  );

CREATE POLICY "staff insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'customer_service'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  );

-- ============ AUTO-LOG ORDER STATUS CHANGES ============
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.activity_logs (order_id, user_id, action, old_value, new_value)
    VALUES (
      NEW.id,
      auth.uid(),
      'status_changed',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.admin_notes IS DISTINCT FROM NEW.admin_notes AND NEW.admin_notes IS NOT NULL) THEN
    INSERT INTO public.activity_logs (order_id, user_id, action, new_value, note)
    VALUES (
      NEW.id,
      auth.uid(),
      'note_added',
      jsonb_build_object('admin_notes', NEW.admin_notes),
      NEW.admin_notes
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_order_status_change ON public.orders;
CREATE TRIGGER trg_log_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_change();

-- ============ CUSTOMER STATS VIEWS ============
-- Use security_invoker so RLS on orders applies (staff can see all).
CREATE OR REPLACE VIEW public.customer_stats_by_phone
WITH (security_invoker = true) AS
SELECT
  COALESCE(NULLIF(shipping_phone, ''), guest_phone) AS phone,
  COUNT(*)::int AS total_orders,
  COUNT(*) FILTER (WHERE status = 'delivered'::order_status)::int AS delivered_orders,
  COUNT(*) FILTER (WHERE status IN ('cancelled'::order_status, 'fake'::order_status))::int AS cancelled_orders,
  COUNT(*) FILTER (WHERE status = 'fake'::order_status)::int AS fake_orders,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'delivered'::order_status)::numeric
    * 100.0
    / NULLIF(COUNT(*), 0),
    2
  ) AS success_rate
FROM public.orders
WHERE COALESCE(NULLIF(shipping_phone, ''), guest_phone) IS NOT NULL
GROUP BY COALESCE(NULLIF(shipping_phone, ''), guest_phone);

CREATE OR REPLACE VIEW public.customer_courier_stats
WITH (security_invoker = true) AS
SELECT
  COALESCE(NULLIF(o.shipping_phone, ''), o.guest_phone) AS phone,
  cs.provider,
  COUNT(*)::int AS total_orders,
  COUNT(*) FILTER (WHERE cs.status = 'delivered'::shipment_status)::int AS delivered_orders,
  COUNT(*) FILTER (WHERE cs.status IN ('returned'::shipment_status, 'cancelled'::shipment_status))::int AS cancelled_orders,
  ROUND(
    COUNT(*) FILTER (WHERE cs.status = 'delivered'::shipment_status)::numeric
    * 100.0
    / NULLIF(COUNT(*), 0),
    2
  ) AS success_rate
FROM public.orders o
JOIN public.courier_shipments cs ON cs.order_id = o.id
WHERE COALESCE(NULLIF(o.shipping_phone, ''), o.guest_phone) IS NOT NULL
GROUP BY COALESCE(NULLIF(o.shipping_phone, ''), o.guest_phone), cs.provider;