-- ============================================================
-- STEP 1: CLEAN SLATE
-- ============================================================

-- Wipe transactional / catalog tables (CASCADE handles dependents)
TRUNCATE TABLE
  public.coupon_usage,
  public.returns_exchanges,
  public.damaged_inventory,
  public.ad_spend_entries,
  public.ad_campaigns,
  public.stock_movements,
  public.transactions,
  public.courier_shipments,
  public.order_financials,
  public.order_items,
  public.activity_logs,
  public.orders,
  public.reviews,
  public.product_variant_values,
  public.product_option_values,
  public.product_option_types,
  public.product_variants,
  public.products,
  public.categories,
  public.coupons,
  public.expenses
RESTART IDENTITY CASCADE;

-- Reset cash balances but keep account rows
UPDATE public.cash_accounts SET current_balance = 0, updated_at = now();

-- Clear customer profile flags/notes
UPDATE public.profiles
SET admin_notes = NULL,
    is_flagged = false,
    flag_reason = NULL,
    cancellation_count = 0,
    fake_order_count = 0,
    updated_at = now();

-- Keep only newest homepage version
DELETE FROM public.homepage_versions
WHERE id NOT IN (
  SELECT id FROM public.homepage_versions ORDER BY created_at DESC LIMIT 1
);

-- ============================================================
-- STEP 2B: Foreign keys (only ones not already present)
-- Note: cannot FK to auth.users from migrations (Supabase restriction)
-- ============================================================

-- Helper: drop-then-add to be idempotent
DO $$
BEGIN
  -- order_items.order_id -> orders
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_order_id_fkey') THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  -- order_items.product_id -> products
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_product_id_fkey') THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
  END IF;

  -- order_financials.order_id -> orders
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_financials_order_id_fkey') THEN
    ALTER TABLE public.order_financials
      ADD CONSTRAINT order_financials_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  -- transactions.account_id -> cash_accounts
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_account_id_fkey') THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_account_id_fkey
      FOREIGN KEY (account_id) REFERENCES public.cash_accounts(id) ON DELETE RESTRICT;
  END IF;

  -- courier_shipments.order_id -> orders
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courier_shipments_order_id_fkey') THEN
    ALTER TABLE public.courier_shipments
      ADD CONSTRAINT courier_shipments_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  -- products.category_id -> categories
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;

  -- stock_movements.product_id -> products
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_product_id_fkey') THEN
    ALTER TABLE public.stock_movements
      ADD CONSTRAINT stock_movements_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;

  -- reviews.product_id -> products
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_product_id_fkey') THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;

  -- ad_campaigns.product_id -> products
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ad_campaigns_product_id_fkey') THEN
    ALTER TABLE public.ad_campaigns
      ADD CONSTRAINT ad_campaigns_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;

  -- ad_campaigns.category_id -> categories
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ad_campaigns_category_id_fkey') THEN
    ALTER TABLE public.ad_campaigns
      ADD CONSTRAINT ad_campaigns_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;

  -- returns_exchanges.order_id -> orders
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'returns_exchanges_order_id_fkey') THEN
    ALTER TABLE public.returns_exchanges
      ADD CONSTRAINT returns_exchanges_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  -- damaged_inventory.product_id -> products
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'damaged_inventory_product_id_fkey') THEN
    ALTER TABLE public.damaged_inventory
      ADD CONSTRAINT damaged_inventory_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
  END IF;
END$$;

-- ============================================================
-- STEP 2D: Convert profitability fields to GENERATED columns
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
  ADD COLUMN profit_margin_pct numeric(6,2)
    GENERATED ALWAYS AS (
      CASE WHEN revenue > 0
        THEN ROUND(((revenue - (
            product_cost + delivery_charge + cod_charge + return_charge
            + packaging_cost + ads_cost_attributed + other_costs
          )) / revenue) * 100, 2)
        ELSE 0
      END
    ) STORED;

-- ============================================================
-- STEP 2C: Tighten profiles RLS
-- ============================================================

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles public read" ON public.profiles;
-- (existing per-role policies already present, so no further change needed)
