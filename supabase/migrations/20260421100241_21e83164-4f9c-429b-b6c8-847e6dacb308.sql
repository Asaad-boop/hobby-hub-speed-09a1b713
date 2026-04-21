-- ============================================================
-- STEP 5B: Replace orders.status enum with full workflow
-- ============================================================
ALTER TYPE public.order_status RENAME TO order_status_old;

CREATE TYPE public.order_status AS ENUM (
  'new', 'confirmed', 'packaging', 'packed', 'ready_to_ship',
  'shipped', 'in_transit', 'delivered', 'partial_delivered',
  'returned', 'exchanged', 'damaged', 'cancelled', 'fake',
  'on_hold', 'advance_payment_pending'
);

-- Drop the policy that references the old enum (recreate after)
DROP POLICY IF EXISTS "users insert reviews after delivery" ON public.reviews;

ALTER TABLE public.orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.orders
  ALTER COLUMN status TYPE public.order_status
  USING (
    CASE status::text
      WHEN 'pending' THEN 'new'
      WHEN 'processing' THEN 'confirmed'
      ELSE status::text
    END
  )::public.order_status;
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'new'::public.order_status;

DROP TYPE public.order_status_old;

-- Recreate the reviews policy with the new enum
CREATE POLICY "users insert reviews after delivery"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.user_id = auth.uid()
      AND o.status = 'delivered'::public.order_status
      AND oi.product_id = reviews.product_id
  )
);

-- ============================================================
-- STEP 5B: Order verification + call + advance payment + hold columns
-- ============================================================
CREATE TYPE public.confirmation_status AS ENUM (
  'pending', 'confirmed', 'rejected', 'fake', 'on_hold', 'advance_pending'
);

CREATE TYPE public.call_status AS ENUM (
  'not_called', 'attempting', 'reached', 'no_response', 'wrong_number',
  'customer_confirmed', 'customer_cancelled', 'needs_followup'
);

ALTER TABLE public.orders
  ADD COLUMN confirmation_status public.confirmation_status NOT NULL DEFAULT 'pending',
  ADD COLUMN confirmed_at timestamptz,
  ADD COLUMN confirmed_by uuid,
  ADD COLUMN rejection_reason text,
  ADD COLUMN cancellation_reason text,
  ADD COLUMN admin_notes text,
  ADD COLUMN call_status public.call_status NOT NULL DEFAULT 'not_called',
  ADD COLUMN call_attempt_count int NOT NULL DEFAULT 0,
  ADD COLUMN last_call_at timestamptz,
  ADD COLUMN last_called_by uuid,
  ADD COLUMN advance_payment_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN advance_payment_method text,
  ADD COLUMN advance_payment_txn_id text,
  ADD COLUMN advance_payment_screenshot_url text,
  ADD COLUMN hold_reason text,
  ADD COLUMN hold_until timestamptz,
  ADD COLUMN is_guest_order boolean NOT NULL DEFAULT false,
  ADD COLUMN guest_name text,
  ADD COLUMN guest_phone text,
  ADD COLUMN guest_email text;

-- Make user_id nullable for guest orders
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- Same for order_items.user_id (guest items)
ALTER TABLE public.order_items ALTER COLUMN user_id DROP NOT NULL;

-- Constraint: either has user_id OR is guest order
ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_or_guest_check
  CHECK (user_id IS NOT NULL OR is_guest_order = true);

-- ============================================================
-- STEP 2D: order_financials generated columns
-- (drop old plain columns first, recreate as GENERATED)
-- ============================================================
ALTER TABLE public.order_financials
  DROP COLUMN IF EXISTS gross_profit,
  DROP COLUMN IF EXISTS total_costs,
  DROP COLUMN IF EXISTS net_profit,
  DROP COLUMN IF EXISTS profit_margin_pct;

ALTER TABLE public.order_financials
  ADD COLUMN gross_profit numeric(12,2)
    GENERATED ALWAYS AS (revenue - product_cost) STORED,
  ADD COLUMN total_costs numeric(12,2)
    GENERATED ALWAYS AS (
      product_cost + delivery_charge + cod_charge + return_charge
      + packaging_cost + ads_cost_attributed + other_costs
    ) STORED,
  ADD COLUMN net_profit numeric(12,2)
    GENERATED ALWAYS AS (
      revenue - (
        product_cost + delivery_charge + cod_charge + return_charge
        + packaging_cost + ads_cost_attributed + other_costs
      )
    ) STORED,
  ADD COLUMN profit_margin_pct numeric(7,2)
    GENERATED ALWAYS AS (
      CASE WHEN revenue > 0
        THEN ROUND(
          ((revenue - (
            product_cost + delivery_charge + cod_charge + return_charge
            + packaging_cost + ads_cost_attributed + other_costs
          )) / revenue * 100)::numeric, 2)
        ELSE 0
      END
    ) STORED;

-- ============================================================
-- STEP 2C cont: orders RLS for guest + staff roles
-- ============================================================
DROP POLICY IF EXISTS "users insert own orders" ON public.orders;
DROP POLICY IF EXISTS "users view own orders" ON public.orders;
DROP POLICY IF EXISTS "users update own orders" ON public.orders;
DROP POLICY IF EXISTS "users delete own orders" ON public.orders;
DROP POLICY IF EXISTS "admins view all orders" ON public.orders;
DROP POLICY IF EXISTS "admins update all orders" ON public.orders;
DROP POLICY IF EXISTS "anyone insert guest orders" ON public.orders;
DROP POLICY IF EXISTS "staff view all orders" ON public.orders;
DROP POLICY IF EXISTS "staff update all orders" ON public.orders;

CREATE POLICY "users insert own orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id AND is_guest_order = false);

CREATE POLICY "anyone insert guest orders"
ON public.orders FOR INSERT
WITH CHECK (is_guest_order = true AND user_id IS NULL);

CREATE POLICY "users view own orders"
ON public.orders FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "staff view all orders"
ON public.orders FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
  OR public.has_role(auth.uid(), 'operations'::public.app_role)
);

CREATE POLICY "staff update all orders"
ON public.orders FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
  OR public.has_role(auth.uid(), 'operations'::public.app_role)
);

-- order_items: allow guest insert (no user_id)
DROP POLICY IF EXISTS "users insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "anyone insert guest order items" ON public.order_items;
DROP POLICY IF EXISTS "staff view all order items" ON public.order_items;

CREATE POLICY "users insert own order items"
ON public.order_items FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "anyone insert guest order items"
ON public.order_items FOR INSERT
WITH CHECK (
  user_id IS NULL
  AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.is_guest_order = true)
);

CREATE POLICY "staff view all order items"
ON public.order_items FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
  OR public.has_role(auth.uid(), 'operations'::public.app_role)
);

-- profiles: also allow CS + operations to read
DROP POLICY IF EXISTS "staff read profiles" ON public.profiles;
CREATE POLICY "staff read profiles"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'customer_service'::public.app_role)
  OR public.has_role(auth.uid(), 'operations'::public.app_role)
);

-- ============================================================
-- STEP 5B: Stock management functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.reserve_stock(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT product_id, SUM(quantity)::int AS qty
    FROM public.order_items
    WHERE order_id = _order_id
    GROUP BY product_id
  LOOP
    UPDATE public.products
       SET stock = GREATEST(stock - rec.qty, 0),
           updated_at = now()
     WHERE id = rec.product_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_stock(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT product_id, SUM(quantity)::int AS qty
    FROM public.order_items
    WHERE order_id = _order_id
    GROUP BY product_id
  LOOP
    UPDATE public.products
       SET stock = stock + rec.qty,
           updated_at = now()
     WHERE id = rec.product_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_order_on_confirm(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pcost numeric(12,2);
  rev numeric(12,2);
  fid uuid;
BEGIN
  SELECT COALESCE(SUM(oi.quantity * COALESCE(p.unit_cost, 0)), 0)
    INTO pcost
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
   WHERE oi.order_id = _order_id;

  SELECT total INTO rev FROM public.orders WHERE id = _order_id;

  INSERT INTO public.order_financials (order_id, revenue, product_cost, finalization_status)
  VALUES (_order_id, COALESCE(rev, 0), pcost, 'pending')
  ON CONFLICT (order_id) DO UPDATE
    SET revenue = EXCLUDED.revenue,
        product_cost = EXCLUDED.product_cost,
        updated_at = now()
  RETURNING id INTO fid;

  UPDATE public.orders SET order_financial_id = fid WHERE id = _order_id;
END;
$$;

-- Unique constraint so ON CONFLICT works
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='order_financials_order_id_unique') THEN
    ALTER TABLE public.order_financials ADD CONSTRAINT order_financials_order_id_unique UNIQUE (order_id);
  END IF;
END $$;

-- ============================================================
-- STEP 5B: Trigger on orders status change
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- New -> Confirmed: reserve stock + create financials
  IF (OLD.status = 'new'::public.order_status
      AND NEW.status = 'confirmed'::public.order_status) THEN
    PERFORM public.reserve_stock(NEW.id);
    PERFORM public.finalize_order_on_confirm(NEW.id);
    NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
  END IF;

  -- Active -> cancelled/fake: release stock
  IF (NEW.status IN ('cancelled'::public.order_status, 'fake'::public.order_status)
      AND OLD.status IN (
        'confirmed'::public.order_status, 'packaging'::public.order_status,
        'packed'::public.order_status, 'ready_to_ship'::public.order_status
      )) THEN
    PERFORM public.release_stock(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_status_change ON public.orders;
CREATE TRIGGER trg_order_status_change
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_change();

-- ============================================================
-- STEP 3: Install all the existing trigger bindings
-- ============================================================

-- updated_at on tables with that column
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name='updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      t, t
    );
  END LOOP;
END $$;

-- transactions -> cash balance
DROP TRIGGER IF EXISTS trg_apply_transaction_to_balance ON public.transactions;
CREATE TRIGGER trg_apply_transaction_to_balance
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_transaction_to_balance();

-- orders.total -> order_financials.revenue
DROP TRIGGER IF EXISTS trg_sync_order_financial_revenue ON public.orders;
CREATE TRIGGER trg_sync_order_financial_revenue
AFTER UPDATE OF total ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_order_financial_revenue();

-- order_items -> recalc product_cost
DROP TRIGGER IF EXISTS trg_recalc_order_product_cost ON public.order_items;
CREATE TRIGGER trg_recalc_order_product_cost
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_order_product_cost();

-- reviews -> recalc product rating
DROP TRIGGER IF EXISTS trg_handle_review_change ON public.reviews;
CREATE TRIGGER trg_handle_review_change
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.handle_review_change();

-- coupon usage -> increment coupon used_count
DROP TRIGGER IF EXISTS trg_increment_coupon_usage ON public.coupon_usage;
CREATE TRIGGER trg_increment_coupon_usage
AFTER INSERT ON public.coupon_usage
FOR EACH ROW EXECUTE FUNCTION public.increment_coupon_usage();

-- ad spend -> refresh campaign total
DROP TRIGGER IF EXISTS trg_refresh_campaign_total_spend ON public.ad_spend_entries;
CREATE TRIGGER trg_refresh_campaign_total_spend
AFTER INSERT OR UPDATE OR DELETE ON public.ad_spend_entries
FOR EACH ROW EXECUTE FUNCTION public.refresh_campaign_total_spend();

-- ============================================================
-- Recalc product_cost trigger function — fix old text cast
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalc_order_product_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  oid uuid;
  pcost numeric(12,2);
BEGIN
  oid := COALESCE(NEW.order_id, OLD.order_id);
  SELECT COALESCE(SUM(oi.quantity * COALESCE(p.unit_cost, 0)), 0)
    INTO pcost
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
   WHERE oi.order_id = oid;

  UPDATE public.order_financials
     SET product_cost = pcost,
         updated_at = now()
   WHERE order_id = oid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- STEP 4: Seed 8 clean categories
-- ============================================================
INSERT INTO public.categories (name, slug, description, display_order, is_active) VALUES
  ('Home Decor', 'home-decor', 'Beautiful decor for every home', 1, true),
  ('Kitchen & Home', 'kitchen-home', 'Kitchen essentials and home goods', 2, true),
  ('Gadgets & Tech', 'gadgets-tech', 'Latest gadgets and tech accessories', 3, true),
  ('DIY & Hobby Kits', 'diy-hobby-kits', 'Creative DIY kits and hobby supplies', 4, true),
  ('Gift Items', 'gift-items', 'Perfect gifts for every occasion', 5, true),
  ('Kids & Toys', 'kids-toys', 'Fun toys for kids', 6, true),
  ('Smart Products', 'smart-products', 'Smart living essentials', 7, true),
  ('Lighting', 'lighting', 'Decorative and functional lighting', 8, true);