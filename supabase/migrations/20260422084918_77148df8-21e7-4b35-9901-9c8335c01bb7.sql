-- ============================================================
-- Phase 1: Accounting Foundation
-- Chart of Accounts + Double-Entry General Ledger + Auto-posting
-- ============================================================

-- ------------------------------------------------------------
-- Account type enum
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM (
    'asset', 'liability', 'equity', 'revenue', 'expense'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ledger_source AS ENUM (
    'order', 'expense', 'capital', 'shipment', 'manual', 'adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- chart_of_accounts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  type public.account_type NOT NULL,
  parent_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false, -- system accounts cannot be deleted
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coa_type ON public.chart_of_accounts(type);
CREATE INDEX IF NOT EXISTS idx_coa_code ON public.chart_of_accounts(code);

DROP TRIGGER IF EXISTS trg_coa_updated_at ON public.chart_of_accounts;
CREATE TRIGGER trg_coa_updated_at
BEFORE UPDATE ON public.chart_of_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- general_ledger (entry header)
-- ------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.ledger_entry_seq START 1000;

CREATE TABLE IF NOT EXISTS public.general_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no bigint NOT NULL DEFAULT nextval('public.ledger_entry_seq') UNIQUE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  source_type public.ledger_source NOT NULL DEFAULT 'manual',
  source_id uuid,
  is_posted boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gl_date ON public.general_ledger(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_gl_source ON public.general_ledger(source_type, source_id);

-- ------------------------------------------------------------
-- ledger_lines (debit/credit per account)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledger_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.general_ledger(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  debit numeric(14,2) NOT NULL DEFAULT 0,
  credit numeric(14,2) NOT NULL DEFAULT 0,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_debit_or_credit CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_ll_entry ON public.ledger_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_ll_account ON public.ledger_lines(account_id);

-- ------------------------------------------------------------
-- Balance enforcement: sum(debit) = sum(credit) per entry
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_ledger_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  eid uuid;
  total_debit numeric;
  total_credit numeric;
BEGIN
  eid := COALESCE(NEW.entry_id, OLD.entry_id);
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
    INTO total_debit, total_credit
    FROM public.ledger_lines WHERE entry_id = eid;

  IF total_debit <> total_credit THEN
    RAISE EXCEPTION 'Unbalanced journal entry % (debit=%, credit=%)',
      eid, total_debit, total_credit;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_ledger_balance ON public.ledger_lines;
CREATE CONSTRAINT TRIGGER trg_check_ledger_balance
AFTER INSERT OR UPDATE OR DELETE ON public.ledger_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_ledger_balance();

-- ------------------------------------------------------------
-- Helper: post a balanced entry from arrays
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_ledger_entry(
  _date date,
  _description text,
  _source_type public.ledger_source,
  _source_id uuid,
  _lines jsonb -- [{account_code, debit, credit, memo}]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  eid uuid;
  ln jsonb;
  acct_id uuid;
BEGIN
  INSERT INTO public.general_ledger (entry_date, description, source_type, source_id, created_by)
  VALUES (_date, _description, _source_type, _source_id, auth.uid())
  RETURNING id INTO eid;

  FOR ln IN SELECT * FROM jsonb_array_elements(_lines)
  LOOP
    SELECT id INTO acct_id FROM public.chart_of_accounts
     WHERE code = (ln->>'account_code');
    IF acct_id IS NULL THEN
      RAISE EXCEPTION 'Unknown account code: %', ln->>'account_code';
    END IF;

    INSERT INTO public.ledger_lines (entry_id, account_id, debit, credit, memo)
    VALUES (
      eid, acct_id,
      COALESCE((ln->>'debit')::numeric, 0),
      COALESCE((ln->>'credit')::numeric, 0),
      ln->>'memo'
    );
  END LOOP;

  RETURN eid;
END;
$$;

-- ------------------------------------------------------------
-- Seed standard chart of accounts (idempotent)
-- ------------------------------------------------------------
INSERT INTO public.chart_of_accounts (code, name, type, is_system) VALUES
  -- Assets (1xxx)
  ('1000', 'Cash on Hand', 'asset', true),
  ('1010', 'Bank Account', 'asset', true),
  ('1020', 'Mobile Wallet (bKash/Nagad)', 'asset', true),
  ('1100', 'Accounts Receivable (COD in transit)', 'asset', true),
  ('1200', 'Inventory', 'asset', true),
  ('1300', 'Inventory in Transit (China)', 'asset', true),
  -- Liabilities (2xxx)
  ('2000', 'Accounts Payable', 'liability', true),
  ('2100', 'Loans Payable', 'liability', true),
  ('2200', 'Customer Refunds Payable', 'liability', true),
  -- Equity (3xxx)
  ('3000', 'Owner Capital', 'equity', true),
  ('3100', 'Investor Capital', 'equity', true),
  ('3900', 'Retained Earnings', 'equity', true),
  -- Revenue (4xxx)
  ('4000', 'Sales Revenue', 'revenue', true),
  ('4100', 'Shipping Revenue', 'revenue', true),
  ('4900', 'Other Income', 'revenue', true),
  -- Expenses (5xxx = COGS, 6xxx = OpEx)
  ('5000', 'Cost of Goods Sold', 'expense', true),
  ('5100', 'Shipping Cost (Outbound)', 'expense', true),
  ('5200', 'COD Charges', 'expense', true),
  ('5300', 'Returns & Damages', 'expense', true),
  ('6000', 'Marketing & Advertising', 'expense', true),
  ('6100', 'Salaries & Wages', 'expense', true),
  ('6200', 'Rent', 'expense', true),
  ('6300', 'Utilities', 'expense', true),
  ('6400', 'Packaging Materials', 'expense', true),
  ('6500', 'Office & Admin', 'expense', true),
  ('6900', 'Other Operating Expenses', 'expense', true),
  ('7000', 'Loan Interest Expense', 'expense', true)
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- Auto-post: Order → ledger when status becomes 'delivered'
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_order_to_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revenue numeric;
  v_cogs numeric;
  v_cash_account text;
  v_lines jsonb;
BEGIN
  IF NEW.status = 'delivered'::public.order_status
     AND (OLD.status IS DISTINCT FROM 'delivered'::public.order_status) THEN

    -- Skip if already posted for this order
    IF EXISTS (
      SELECT 1 FROM public.general_ledger
      WHERE source_type = 'order' AND source_id = NEW.id
    ) THEN
      RETURN NEW;
    END IF;

    v_revenue := COALESCE(NEW.total, 0);

    SELECT COALESCE(SUM(oi.quantity * COALESCE(p.unit_cost, 0)), 0)
      INTO v_cogs
      FROM public.order_items oi
      LEFT JOIN public.products p ON p.id = oi.product_id
     WHERE oi.order_id = NEW.id;

    -- COD = Cash on Hand; otherwise treat as Bank
    v_cash_account := CASE
      WHEN NEW.payment_method = 'cod' OR NEW.payment_method IS NULL THEN '1000'
      ELSE '1010'
    END;

    -- Entry 1: revenue recognition
    v_lines := jsonb_build_array(
      jsonb_build_object('account_code', v_cash_account, 'debit', v_revenue, 'credit', 0,
                         'memo', 'Order #' || NEW.id),
      jsonb_build_object('account_code', '4000', 'debit', 0, 'credit', v_revenue,
                         'memo', 'Sales — Order #' || NEW.id)
    );
    PERFORM public.post_ledger_entry(
      COALESCE(NEW.delivered_at::date, CURRENT_DATE),
      'Order delivered #' || NEW.id,
      'order'::public.ledger_source,
      NEW.id,
      v_lines
    );

    -- Entry 2: COGS recognition
    IF v_cogs > 0 THEN
      v_lines := jsonb_build_array(
        jsonb_build_object('account_code', '5000', 'debit', v_cogs, 'credit', 0,
                           'memo', 'COGS — Order #' || NEW.id),
        jsonb_build_object('account_code', '1200', 'debit', 0, 'credit', v_cogs,
                           'memo', 'Inventory out — Order #' || NEW.id)
      );
      PERFORM public.post_ledger_entry(
        COALESCE(NEW.delivered_at::date, CURRENT_DATE),
        'COGS for order #' || NEW.id,
        'order'::public.ledger_source,
        NEW.id,
        v_lines
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_order_to_ledger ON public.orders;
CREATE TRIGGER trg_post_order_to_ledger
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.post_order_to_ledger();

-- ------------------------------------------------------------
-- Auto-post: Expense → ledger
-- Maps expense category slug to a chart account; falls back to 6900.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_expense_to_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat_slug text;
  v_expense_code text;
  v_cash_code text;
  v_lines jsonb;
BEGIN
  SELECT slug INTO v_cat_slug FROM public.expense_categories WHERE id = NEW.category_id;

  v_expense_code := CASE
    WHEN v_cat_slug ILIKE '%marketing%' OR v_cat_slug ILIKE '%ad%' THEN '6000'
    WHEN v_cat_slug ILIKE '%salary%' OR v_cat_slug ILIKE '%wage%' THEN '6100'
    WHEN v_cat_slug ILIKE '%rent%' THEN '6200'
    WHEN v_cat_slug ILIKE '%utilit%' THEN '6300'
    WHEN v_cat_slug ILIKE '%packag%' THEN '6400'
    WHEN v_cat_slug ILIKE '%office%' OR v_cat_slug ILIKE '%admin%' THEN '6500'
    ELSE '6900'
  END;

  v_cash_code := CASE
    WHEN NEW.payment_method ILIKE '%bkash%' OR NEW.payment_method ILIKE '%nagad%' THEN '1020'
    WHEN NEW.payment_method ILIKE '%bank%' THEN '1010'
    ELSE '1000'
  END;

  v_lines := jsonb_build_array(
    jsonb_build_object('account_code', v_expense_code, 'debit', NEW.amount, 'credit', 0,
                       'memo', COALESCE(NEW.description, 'Expense')),
    jsonb_build_object('account_code', v_cash_code, 'debit', 0, 'credit', NEW.amount,
                       'memo', 'Cash out — ' || COALESCE(NEW.description, 'Expense'))
  );

  PERFORM public.post_ledger_entry(
    NEW.expense_date,
    'Expense: ' || COALESCE(NEW.description, v_cat_slug),
    'expense'::public.ledger_source,
    NEW.id,
    v_lines
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_expense_to_ledger ON public.expenses;
CREATE TRIGGER trg_post_expense_to_ledger
AFTER INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.post_expense_to_ledger();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage chart of accounts"
ON public.chart_of_accounts FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins manage general ledger"
ON public.general_ledger FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins manage ledger lines"
ON public.ledger_lines FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));