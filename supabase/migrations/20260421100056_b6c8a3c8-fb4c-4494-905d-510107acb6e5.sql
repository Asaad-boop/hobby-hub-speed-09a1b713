-- ============================================================
-- STEP 1: CLEAN SLATE
-- ============================================================
TRUNCATE TABLE
  public.coupon_usage,
  public.ad_spend_entries,
  public.ad_campaigns,
  public.returns_exchanges,
  public.damaged_inventory,
  public.stock_movements,
  public.courier_shipments,
  public.transactions,
  public.order_financials,
  public.order_items,
  public.orders,
  public.reviews,
  public.product_variant_values,
  public.product_option_values,
  public.product_option_types,
  public.product_variants,
  public.products,
  public.categories,
  public.expenses,
  public.finance_audit_log
RESTART IDENTITY CASCADE;

UPDATE public.cash_accounts SET current_balance = 0, updated_at = now();
UPDATE public.profiles SET admin_notes = NULL WHERE admin_notes IS NOT NULL;

-- ============================================================
-- STEP 2A: order_items.product_id text -> uuid (idempotent)
-- ============================================================
DROP POLICY IF EXISTS "users insert reviews after delivery" ON public.reviews;

DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='order_items' AND column_name='product_id') = 'text' THEN
    EXECUTE 'ALTER TABLE public.order_items ALTER COLUMN product_id TYPE uuid USING product_id::uuid';
  END IF;
END $$;

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
-- STEP 2B: Missing foreign keys (idempotent — only add if absent)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='order_items_product_id_fkey') THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='coupon_usage_order_id_fkey') THEN
    ALTER TABLE public.coupon_usage
      ADD CONSTRAINT coupon_usage_order_id_fkey
        FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- STEP 2C: Profiles privacy + new columns
-- ============================================================
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fake_order_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text;

CREATE POLICY "users read own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "admins read all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- STEP 5A: Add roles to enum (must commit before next migration uses them)
-- ============================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer_service';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operations';