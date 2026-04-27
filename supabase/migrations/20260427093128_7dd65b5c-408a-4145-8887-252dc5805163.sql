-- ============================================================
-- MODULE 1 (Web Orders) + MODULE 2 (Pipeline) — Schema additions
-- Strategy: re-use existing `status` (order_status) for pipeline.
-- Add web_status for inbox stages, plus all missing fields.
-- ============================================================

-- 1. NEW ENUMS --------------------------------------------------

-- Web Orders inbox status
DO $$ BEGIN
  CREATE TYPE public.web_order_status AS ENUM (
    'processing',
    'incomplete',
    'good_but_no_response',
    'no_response',
    'advance_payment',
    'on_hold',
    'complete',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Order source
DO $$ BEGIN
  CREATE TYPE public.order_source AS ENUM ('website', 'facebook', 'manual', 'phone');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Discount type for line items
DO $$ BEGIN
  CREATE TYPE public.discount_type AS ENUM ('flat', 'percent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend existing order_status enum with pipeline-only values
-- (in_transit, exchange, damaged, return variants)
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'ready_to_pack';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'courier_entry';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'in_transit';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'exchange';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'damaged';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'paid_return';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'unpaid_return';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'partial_return';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pending_return';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'partial_delivered';
EXCEPTION WHEN others THEN NULL; END $$;

-- 2. ORDERS TABLE — add missing columns -------------------------

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS web_status public.web_order_status DEFAULT 'processing',
  ADD COLUMN IF NOT EXISTS source public.order_source DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS risk_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS advance_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS internal_note text,
  ADD COLUMN IF NOT EXISTS customer_note text,
  ADD COLUMN IF NOT EXISTS status_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pipeline_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS courier_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS in_transit_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_type text,
  ADD COLUMN IF NOT EXISTS return_note text,
  ADD COLUMN IF NOT EXISTS partial_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alternate_phone text,
  ADD COLUMN IF NOT EXISTS shipping_thana text;

-- Backfill source for existing orders (best-effort)
UPDATE public.orders
   SET source = COALESCE(source, 'website'::public.order_source);

-- For existing confirmed orders, set web_status='complete'
UPDATE public.orders
   SET web_status = 'complete'::public.web_order_status
 WHERE web_status IS NULL
   AND status NOT IN ('new'::public.order_status);

UPDATE public.orders
   SET web_status = 'processing'::public.web_order_status
 WHERE web_status IS NULL
   AND status = 'new'::public.order_status;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_orders_web_status ON public.orders(web_status);
CREATE INDEX IF NOT EXISTS idx_orders_pipeline_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_date ON public.orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_orders_phone_lookup ON public.orders(shipping_phone, guest_phone);

-- 3. ORDER_ITEMS TABLE — add missing columns --------------------

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS unit_price numeric,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type public.discount_type DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS line_total numeric;

-- Backfill unit_price = price, line_total = price * qty for existing rows
UPDATE public.order_items
   SET unit_price = COALESCE(unit_price, price),
       line_total = COALESCE(line_total, price * quantity);

-- 4. ABANDONED_CARTS TABLE (Incomplete tab) ---------------------

CREATE TABLE IF NOT EXISTS public.abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  user_id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  shipping_address text,
  shipping_city text,
  shipping_district text,
  shipping_thana text,
  cart_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  last_step text,
  is_converted boolean NOT NULL DEFAULT false,
  converted_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_phone ON public.abandoned_carts(customer_phone);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_session ON public.abandoned_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_converted ON public.abandoned_carts(is_converted);

ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can insert/update their own session cart (tracking from checkout)
CREATE POLICY "anyone insert abandoned cart"
  ON public.abandoned_carts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "anyone update own session cart"
  ON public.abandoned_carts FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Staff can read all
CREATE POLICY "staff read abandoned carts"
  ON public.abandoned_carts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
  );

-- Admin can delete
CREATE POLICY "admin delete abandoned carts"
  ON public.abandoned_carts FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_abandoned_carts_updated_at ON public.abandoned_carts;
CREATE TRIGGER trg_abandoned_carts_updated_at
  BEFORE UPDATE ON public.abandoned_carts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. STATUS LOG HELPER FUNCTION ---------------------------------

CREATE OR REPLACE FUNCTION public.append_order_status_log(
  _order_id uuid,
  _log_field text,  -- 'status_log' or 'pipeline_log'
  _entry jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _log_field NOT IN ('status_log', 'pipeline_log') THEN
    RAISE EXCEPTION 'Invalid log field: %', _log_field;
  END IF;

  EXECUTE format(
    'UPDATE public.orders SET %I = COALESCE(%I, ''[]''::jsonb) || $1::jsonb WHERE id = $2',
    _log_field, _log_field
  ) USING _entry, _order_id;
END;
$$;