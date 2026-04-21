-- ============================================================================
-- STEP A: ACCOUNTING & FINANCE MODULE — Full Schema
-- ============================================================================

-- ENUMS
CREATE TYPE public.cash_account_type AS ENUM (
  'cash','bkash','nagad','rocket','bank','pathao_pending','meta_ads_wallet','other'
);

CREATE TYPE public.transaction_type AS ENUM (
  'income','expense','transfer_in','transfer_out',
  'cod_collection','cod_settlement','ads_spend','refund','adjustment','reversal'
);

CREATE TYPE public.transaction_category AS ENUM (
  'product_sale','product_purchase','meta_ads','google_ads','tiktok_ads',
  'courier_delivery_charge','courier_cod_charge','courier_return_charge',
  'packaging','salary','rent','utilities','return_loss','damage_loss',
  'owner_drawing','owner_investment','bank_charge','other'
);

CREATE TYPE public.transaction_direction AS ENUM ('in','out');

CREATE TYPE public.transaction_reference_type AS ENUM (
  'order','shipment','ad_campaign','purchase_order','return','manual','settlement'
);

CREATE TYPE public.order_finalization_status AS ENUM (
  'pending','delivered','partial_delivered','returned','exchanged','damaged','settled'
);

CREATE TYPE public.courier_provider AS ENUM ('pathao','steadfast','redx','manual');

CREATE TYPE public.delivery_zone AS ENUM ('inside_dhaka','outside_dhaka','sub_city','other');

CREATE TYPE public.shipment_status AS ENUM (
  'booked','pickup_pending','in_transit','delivered','partial_delivered',
  'returned','exchanged','damaged','lost','cancelled'
);

CREATE TYPE public.return_type AS ENUM (
  'full_return','partial_return','exchange_return','exchange_out','damage_return'
);

CREATE TYPE public.damage_source AS ENUM (
  'return','warehouse','shipment_damage','customer_damage'
);

CREATE TYPE public.ad_platform AS ENUM (
  'meta','facebook','instagram','google','tiktok','other'
);

CREATE TYPE public.ad_status AS ENUM ('active','paused','ended');

CREATE TYPE public.ad_attribution_method AS ENUM (
  'per_product','per_category','all_orders_in_period'
);

-- ============================================================================
-- 1) cash_accounts
-- ============================================================================
CREATE TABLE public.cash_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.cash_account_type NOT NULL,
  account_number text,
  current_balance numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage cash accounts" ON public.cash_accounts
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER cash_accounts_updated_at
  BEFORE UPDATE ON public.cash_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2) transactions (ledger — single source of truth)
-- ============================================================================
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.cash_accounts(id) ON DELETE RESTRICT,
  type public.transaction_type NOT NULL,
  category public.transaction_category NOT NULL DEFAULT 'other',
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  direction public.transaction_direction NOT NULL,
  reference_type public.transaction_reference_type NOT NULL DEFAULT 'manual',
  reference_id uuid,
  description text,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  reversed_by uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  reversed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_account ON public.transactions(account_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX idx_transactions_ref ON public.transactions(reference_type, reference_id);
CREATE INDEX idx_transactions_category ON public.transactions(category);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins view transactions" ON public.transactions
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admins insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin') AND created_by = auth.uid());

CREATE POLICY "admins update transactions" ON public.transactions
  FOR UPDATE USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- No DELETE policy — transactions can never be deleted, only reversed

-- TRIGGER: auto-update cash_accounts.current_balance
CREATE OR REPLACE FUNCTION public.apply_transaction_to_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta numeric(12,2);
BEGIN
  IF (TG_OP = 'INSERT') THEN
    delta := CASE WHEN NEW.direction = 'in' THEN NEW.amount ELSE -NEW.amount END;
    UPDATE public.cash_accounts
       SET current_balance = current_balance + delta,
           updated_at = now()
     WHERE id = NEW.account_id;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- only allow recalculation if amount/direction/account changes (rare; usually use reversal)
    IF (OLD.amount <> NEW.amount OR OLD.direction <> NEW.direction OR OLD.account_id <> NEW.account_id) THEN
      -- revert old
      UPDATE public.cash_accounts
         SET current_balance = current_balance - (CASE WHEN OLD.direction='in' THEN OLD.amount ELSE -OLD.amount END),
             updated_at = now()
       WHERE id = OLD.account_id;
      -- apply new
      UPDATE public.cash_accounts
         SET current_balance = current_balance + (CASE WHEN NEW.direction='in' THEN NEW.amount ELSE -NEW.amount END),
             updated_at = now()
       WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_apply_transaction_to_balance
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_transaction_to_balance();

-- ============================================================================
-- 3) Add unit_cost / avg_cost to products
-- ============================================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_cost numeric(12,2) NOT NULL DEFAULT 0;

-- ============================================================================
-- 4) courier_shipments
-- ============================================================================
CREATE TABLE public.courier_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider public.courier_provider NOT NULL DEFAULT 'pathao',
  tracking_id text,
  consignment_id text,
  delivery_zone public.delivery_zone NOT NULL DEFAULT 'inside_dhaka',
  actual_delivery_charge numeric(12,2) NOT NULL DEFAULT 0,
  actual_cod_charge numeric(12,2) NOT NULL DEFAULT 0,
  actual_return_charge numeric(12,2) NOT NULL DEFAULT 0,
  status public.shipment_status NOT NULL DEFAULT 'booked',
  items_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  cod_amount_expected numeric(12,2) NOT NULL DEFAULT 0,
  cod_amount_received numeric(12,2) NOT NULL DEFAULT 0,
  cod_settlement_date date,
  cod_settlement_batch_id uuid,
  booked_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipments_order ON public.courier_shipments(order_id);
CREATE INDEX idx_shipments_status ON public.courier_shipments(status);
CREATE INDEX idx_shipments_settlement ON public.courier_shipments(cod_settlement_batch_id);

ALTER TABLE public.courier_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage shipments" ON public.courier_shipments
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER courier_shipments_updated_at
  BEFORE UPDATE ON public.courier_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5) order_financials (per-order P&L)
-- ============================================================================
CREATE TABLE public.order_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  revenue numeric(12,2) NOT NULL DEFAULT 0,
  product_cost numeric(12,2) NOT NULL DEFAULT 0,
  delivery_charge numeric(12,2) NOT NULL DEFAULT 0,
  cod_charge numeric(12,2) NOT NULL DEFAULT 0,
  return_charge numeric(12,2) NOT NULL DEFAULT 0,
  packaging_cost numeric(12,2) NOT NULL DEFAULT 0,
  ads_cost_attributed numeric(12,2) NOT NULL DEFAULT 0,
  other_costs numeric(12,2) NOT NULL DEFAULT 0,
  gross_profit numeric(12,2) GENERATED ALWAYS AS (revenue - product_cost) STORED,
  total_costs numeric(12,2) GENERATED ALWAYS AS
    (product_cost + delivery_charge + cod_charge + return_charge + packaging_cost + ads_cost_attributed + other_costs) STORED,
  net_profit numeric(12,2) GENERATED ALWAYS AS
    (revenue - (product_cost + delivery_charge + cod_charge + return_charge + packaging_cost + ads_cost_attributed + other_costs)) STORED,
  profit_margin_pct numeric(8,2) GENERATED ALWAYS AS (
    CASE WHEN revenue > 0
      THEN ROUND(((revenue - (product_cost + delivery_charge + cod_charge + return_charge + packaging_cost + ads_cost_attributed + other_costs)) / revenue) * 100, 2)
      ELSE 0
    END
  ) STORED,
  cod_amount_received numeric(12,2) NOT NULL DEFAULT 0,
  finalization_status public.order_finalization_status NOT NULL DEFAULT 'pending',
  finalized_at timestamptz,
  is_backfilled boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_financials_status ON public.order_financials(finalization_status);
CREATE INDEX idx_order_financials_finalized ON public.order_financials(finalized_at);

ALTER TABLE public.order_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage order financials" ON public.order_financials
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER order_financials_updated_at
  BEFORE UPDATE ON public.order_financials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6) Add shipment_id / order_financial_id to orders
-- ============================================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipment_id uuid REFERENCES public.courier_shipments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_financial_id uuid REFERENCES public.order_financials(id) ON DELETE SET NULL;

-- ============================================================================
-- 7) returns_exchanges
-- ============================================================================
CREATE TABLE public.returns_exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES public.courier_shipments(id) ON DELETE SET NULL,
  type public.return_type NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text,
  financial_impact numeric(12,2) NOT NULL DEFAULT 0,
  stock_restored_qty integer NOT NULL DEFAULT 0,
  damage_logged_qty integer NOT NULL DEFAULT 0,
  exchange_issued_qty integer NOT NULL DEFAULT 0,
  processed_at timestamptz NOT NULL DEFAULT now(),
  processed_by uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_returns_order ON public.returns_exchanges(order_id);
CREATE INDEX idx_returns_type ON public.returns_exchanges(type);

ALTER TABLE public.returns_exchanges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage returns" ON public.returns_exchanges
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================================
-- 8) damaged_inventory
-- ============================================================================
CREATE TABLE public.damaged_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  source public.damage_source NOT NULL,
  cost_value numeric(12,2) NOT NULL DEFAULT 0,
  reason text,
  notes text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  logged_by uuid NOT NULL,
  disposed boolean NOT NULL DEFAULT false,
  disposal_date date,
  disposal_value numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_damaged_product ON public.damaged_inventory(product_id);
CREATE INDEX idx_damaged_disposed ON public.damaged_inventory(disposed);

ALTER TABLE public.damaged_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage damaged inventory" ON public.damaged_inventory
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================================
-- 9) ad_campaigns
-- ============================================================================
CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform public.ad_platform NOT NULL DEFAULT 'meta',
  campaign_name text NOT NULL,
  campaign_id_external text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date,
  total_spend numeric(12,2) NOT NULL DEFAULT 0,
  daily_budget numeric(12,2),
  status public.ad_status NOT NULL DEFAULT 'active',
  attribution_method public.ad_attribution_method NOT NULL DEFAULT 'all_orders_in_period',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_status ON public.ad_campaigns(status);
CREATE INDEX idx_campaigns_dates ON public.ad_campaigns(start_date, end_date);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage campaigns" ON public.ad_campaigns
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER ad_campaigns_updated_at
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 10) ad_spend_entries
-- ============================================================================
CREATE TABLE public.ad_spend_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  spend_date date NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  synced_from text NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, spend_date)
);

CREATE INDEX idx_ad_spend_campaign_date ON public.ad_spend_entries(campaign_id, spend_date);

ALTER TABLE public.ad_spend_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage ad spend" ON public.ad_spend_entries
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Trigger: refresh campaign.total_spend on spend entry change
CREATE OR REPLACE FUNCTION public.refresh_campaign_total_spend()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
BEGIN
  cid := COALESCE(NEW.campaign_id, OLD.campaign_id);
  UPDATE public.ad_campaigns
     SET total_spend = COALESCE((SELECT SUM(amount) FROM public.ad_spend_entries WHERE campaign_id = cid), 0),
         updated_at = now()
   WHERE id = cid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_refresh_campaign_total_spend
  AFTER INSERT OR UPDATE OR DELETE ON public.ad_spend_entries
  FOR EACH ROW EXECUTE FUNCTION public.refresh_campaign_total_spend();

-- ============================================================================
-- 11) finance_audit_log
-- ============================================================================
CREATE TABLE public.finance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_table_record ON public.finance_audit_log(table_name, record_id);
CREATE INDEX idx_audit_performed_at ON public.finance_audit_log(performed_at DESC);

ALTER TABLE public.finance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins view audit log" ON public.finance_audit_log
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admins insert audit log" ON public.finance_audit_log
  FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin') AND performed_by = auth.uid());

-- ============================================================================
-- 12) Auto-create order_financials on new orders
-- ============================================================================
CREATE OR REPLACE FUNCTION public.bootstrap_order_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pcost numeric(12,2);
  fid uuid;
BEGIN
  -- product cost = sum(qty * unit_cost) — order_items not yet inserted at orders insert,
  -- so we defer to a separate trigger on order_items (below) plus initial 0
  INSERT INTO public.order_financials (order_id, revenue, product_cost, finalization_status)
  VALUES (NEW.id, COALESCE(NEW.total, 0), 0, 'pending')
  ON CONFLICT (order_id) DO NOTHING
  RETURNING id INTO fid;

  IF fid IS NOT NULL THEN
    UPDATE public.orders SET order_financial_id = fid WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bootstrap_order_financials
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_order_financials();

-- Recalculate product_cost on order_items insert
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
    LEFT JOIN public.products p ON p.id::text = oi.product_id
   WHERE oi.order_id = oid;

  UPDATE public.order_financials
     SET product_cost = pcost,
         updated_at = now()
   WHERE order_id = oid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalc_order_product_cost
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.recalc_order_product_cost();

-- Sync revenue on orders.total change
CREATE OR REPLACE FUNCTION public.sync_order_financial_revenue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.total IS DISTINCT FROM NEW.total) THEN
    UPDATE public.order_financials
       SET revenue = NEW.total, updated_at = now()
     WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_order_financial_revenue
  AFTER UPDATE OF total ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_financial_revenue();

-- ============================================================================
-- 13) Seed default cash accounts
-- ============================================================================
INSERT INTO public.cash_accounts (name, type, display_order) VALUES
  ('Cash in Hand', 'cash', 1),
  ('bKash Personal', 'bkash', 2),
  ('Nagad Personal', 'nagad', 3),
  ('Bank Account', 'bank', 4),
  ('Pathao Pending COD', 'pathao_pending', 5),
  ('Meta Ads Wallet', 'meta_ads_wallet', 6)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 14) Backfill existing orders into order_financials
-- ============================================================================
INSERT INTO public.order_financials (order_id, revenue, product_cost, finalization_status, is_backfilled, notes)
SELECT
  o.id,
  COALESCE(o.total, 0),
  0,
  CASE
    WHEN o.status = 'delivered' THEN 'delivered'::public.order_finalization_status
    WHEN o.status = 'cancelled' THEN 'returned'::public.order_finalization_status
    ELSE 'pending'::public.order_finalization_status
  END,
  true,
  'Backfilled — pre-accounting era'
FROM public.orders o
LEFT JOIN public.order_financials f ON f.order_id = o.id
WHERE f.id IS NULL
ON CONFLICT (order_id) DO NOTHING;

-- Backfill product_cost for existing orders
UPDATE public.order_financials f
   SET product_cost = sub.pcost
  FROM (
    SELECT oi.order_id, COALESCE(SUM(oi.quantity * COALESCE(p.unit_cost, 0)), 0) AS pcost
      FROM public.order_items oi
      LEFT JOIN public.products p ON p.id::text = oi.product_id
     GROUP BY oi.order_id
  ) sub
 WHERE f.order_id = sub.order_id
   AND f.is_backfilled = true;

-- Link existing orders.order_financial_id
UPDATE public.orders o
   SET order_financial_id = f.id
  FROM public.order_financials f
 WHERE f.order_id = o.id
   AND o.order_financial_id IS NULL;
