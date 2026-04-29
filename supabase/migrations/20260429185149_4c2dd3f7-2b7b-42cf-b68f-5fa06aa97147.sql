
-- ============================================================
-- Phase 1: Foundation for Order Management System
-- All additive — no data loss
-- ============================================================

-- ---------- 1. New enums ----------
DO $$ BEGIN
  CREATE TYPE public.order_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('unpaid', 'partial', 'paid', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fraud_risk_level AS ENUM ('low', 'medium', 'high', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 2. Extend orders ----------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS priority public.order_priority NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS expected_delivery_date date,
  ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS refund_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_ip text,
  ADD COLUMN IF NOT EXISTS device_info jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_priority ON public.orders(priority);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_shipping_phone ON public.orders(shipping_phone);

-- ---------- 3. Extend order_items ----------
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- ---------- 4. Extend products ----------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5;

-- ---------- 5. order_status_history ----------
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  reason text,
  note text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_osh_order_id ON public.order_status_history(order_id, created_at DESC);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff view status history" ON public.order_status_history;
CREATE POLICY "staff view status history" ON public.order_status_history
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
  );

DROP POLICY IF EXISTS "staff insert status history" ON public.order_status_history;
CREATE POLICY "staff insert status history" ON public.order_status_history
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
  );

DROP POLICY IF EXISTS "users view own status history" ON public.order_status_history;
CREATE POLICY "users view own status history" ON public.order_status_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_status_history.order_id AND o.user_id = auth.uid())
  );

-- ---------- 6. order_notes ----------
CREATE TABLE IF NOT EXISTS public.order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON public.order_notes(order_id, created_at DESC);

ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff manage order notes" ON public.order_notes;
CREATE POLICY "staff manage order notes" ON public.order_notes
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
  );

DROP POLICY IF EXISTS "customers view own non-internal notes" ON public.order_notes;
CREATE POLICY "customers view own non-internal notes" ON public.order_notes
  FOR SELECT USING (
    is_internal = false
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_notes.order_id AND o.user_id = auth.uid())
  );

-- ---------- 7. low_stock_alerts ----------
CREATE TABLE IF NOT EXISTS public.low_stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  variant_id uuid,
  current_stock integer NOT NULL,
  threshold integer NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lsa_product ON public.low_stock_alerts(product_id) WHERE is_resolved = false;

ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff manage low stock alerts" ON public.low_stock_alerts;
CREATE POLICY "staff manage low stock alerts" ON public.low_stock_alerts
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
  );

-- ---------- 8. fraud_checks ----------
CREATE TABLE IF NOT EXISTS public.fraud_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  total_orders integer NOT NULL DEFAULT 0,
  successful_orders integer NOT NULL DEFAULT 0,
  cancelled_orders integer NOT NULL DEFAULT 0,
  success_rate numeric NOT NULL DEFAULT 0,
  risk_level public.fraud_risk_level NOT NULL DEFAULT 'unknown',
  raw_response jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fraud_checks_phone ON public.fraud_checks(phone);
CREATE INDEX IF NOT EXISTS idx_fraud_checks_expires ON public.fraud_checks(expires_at);

ALTER TABLE public.fraud_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff manage fraud checks" ON public.fraud_checks;
CREATE POLICY "staff manage fraud checks" ON public.fraud_checks
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
  );

-- ---------- 9. transition_order_status ----------
CREATE OR REPLACE FUNCTION public.transition_order_status(
  _order_id uuid,
  _new_status public.order_status,
  _reason text DEFAULT NULL,
  _note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_status public.order_status;
  _user uuid := auth.uid();
BEGIN
  IF NOT (
    public.has_role(_user, 'admin'::public.app_role)
    OR public.has_role(_user, 'customer_service'::public.app_role)
    OR public.has_role(_user, 'operations'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to change order status';
  END IF;

  SELECT status INTO _old_status FROM public.orders WHERE id = _order_id;
  IF _old_status IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', _order_id;
  END IF;

  IF _old_status = _new_status THEN
    RETURN;
  END IF;

  UPDATE public.orders SET status = _new_status, updated_at = now() WHERE id = _order_id;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, reason, note)
  VALUES (_order_id, _old_status::text, _new_status::text, _user, _reason, _note);
END;
$$;

-- ---------- 10. add_order_note ----------
CREATE OR REPLACE FUNCTION public.add_order_note(
  _order_id uuid,
  _body text,
  _is_internal boolean DEFAULT true
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _user uuid := auth.uid();
BEGIN
  IF NOT (
    public.has_role(_user, 'admin'::public.app_role)
    OR public.has_role(_user, 'customer_service'::public.app_role)
    OR public.has_role(_user, 'operations'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.order_notes (order_id, body, is_internal, created_by)
  VALUES (_order_id, _body, _is_internal, _user)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

-- ---------- 11. low_stock check trigger ----------
CREATE OR REPLACE FUNCTION public.check_and_create_low_stock_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _threshold integer;
BEGIN
  SELECT COALESCE(low_stock_threshold, 5) INTO _threshold FROM public.products WHERE id = NEW.id;

  IF NEW.stock <= _threshold THEN
    INSERT INTO public.low_stock_alerts (product_id, current_stock, threshold)
    SELECT NEW.id, NEW.stock, _threshold
    WHERE NOT EXISTS (
      SELECT 1 FROM public.low_stock_alerts
      WHERE product_id = NEW.id AND variant_id IS NULL AND is_resolved = false
    );
  ELSE
    UPDATE public.low_stock_alerts
       SET is_resolved = true, resolved_at = now()
     WHERE product_id = NEW.id AND variant_id IS NULL AND is_resolved = false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_low_stock_check ON public.products;
CREATE TRIGGER trg_low_stock_check
  AFTER UPDATE OF stock ON public.products
  FOR EACH ROW
  WHEN (OLD.stock IS DISTINCT FROM NEW.stock)
  EXECUTE FUNCTION public.check_and_create_low_stock_alert();
