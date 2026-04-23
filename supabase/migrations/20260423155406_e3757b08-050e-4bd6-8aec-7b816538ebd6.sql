-- =========================================================
-- 1) Drop functions/triggers tied to ERP tables
-- =========================================================
DROP FUNCTION IF EXISTS public.post_order_to_ledger() CASCADE;
DROP FUNCTION IF EXISTS public.post_expense_to_ledger() CASCADE;
DROP FUNCTION IF EXISTS public.post_ledger_entry(date, text, ledger_source, uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.check_ledger_balance() CASCADE;
DROP FUNCTION IF EXISTS public.apply_transaction_to_balance() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_campaign_total_spend() CASCADE;
DROP FUNCTION IF EXISTS public.bootstrap_order_financials() CASCADE;
DROP FUNCTION IF EXISTS public.sync_order_financial_revenue() CASCADE;
DROP FUNCTION IF EXISTS public.recalc_order_product_cost() CASCADE;
DROP FUNCTION IF EXISTS public.finalize_order_on_confirm(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.recalc_china_shipment_totals() CASCADE;
DROP FUNCTION IF EXISTS public.recalc_china_shipment_self() CASCADE;
DROP FUNCTION IF EXISTS public.apply_china_shipment_to_products() CASCADE;
DROP FUNCTION IF EXISTS public.get_customer_courier_stats(text) CASCADE;

-- =========================================================
-- 2) Drop ERP tables (CASCADE removes dependent FKs/policies)
-- =========================================================
DROP TABLE IF EXISTS public.ledger_lines CASCADE;
DROP TABLE IF EXISTS public.general_ledger CASCADE;
DROP TABLE IF EXISTS public.chart_of_accounts CASCADE;
DROP TABLE IF EXISTS public.cash_accounts CASCADE;
DROP TABLE IF EXISTS public.finance_audit_log CASCADE;

DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.expense_categories CASCADE;

DROP TABLE IF EXISTS public.china_shipment_items CASCADE;
DROP TABLE IF EXISTS public.china_shipments CASCADE;

DROP TABLE IF EXISTS public.damaged_inventory CASCADE;

DROP TABLE IF EXISTS public.meta_ad_insights CASCADE;
DROP TABLE IF EXISTS public.meta_ads CASCADE;
DROP TABLE IF EXISTS public.meta_ad_sets CASCADE;
DROP TABLE IF EXISTS public.ad_spend_entries CASCADE;
DROP TABLE IF EXISTS public.ad_campaigns CASCADE;

DROP TABLE IF EXISTS public.order_attribution CASCADE;
DROP TABLE IF EXISTS public.order_financials CASCADE;

DROP TABLE IF EXISTS public.integration_logs CASCADE;
DROP TABLE IF EXISTS public.integrations CASCADE;

DROP TABLE IF EXISTS public.courier_stats_cache CASCADE;

-- =========================================================
-- 3) Drop ERP-specific columns from orders
-- =========================================================
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS order_financial_id,
  DROP COLUMN IF EXISTS advance_payment_amount,
  DROP COLUMN IF EXISTS advance_payment_method,
  DROP COLUMN IF EXISTS advance_payment_txn_id,
  DROP COLUMN IF EXISTS advance_payment_screenshot_url,
  DROP COLUMN IF EXISTS meta_ad_id,
  DROP COLUMN IF EXISTS meta_ad_set_id,
  DROP COLUMN IF EXISTS meta_campaign_id,
  DROP COLUMN IF EXISTS meta_ad_account_id,
  DROP COLUMN IF EXISTS utm_source,
  DROP COLUMN IF EXISTS utm_medium,
  DROP COLUMN IF EXISTS utm_campaign,
  DROP COLUMN IF EXISTS utm_content,
  DROP COLUMN IF EXISTS fb_browser_pixel,
  DROP COLUMN IF EXISTS fb_click_id,
  DROP COLUMN IF EXISTS session_source,
  DROP COLUMN IF EXISTS entry_url,
  DROP COLUMN IF EXISTS user_agent,
  DROP COLUMN IF EXISTS device_type,
  DROP COLUMN IF EXISTS ip_address,
  DROP COLUMN IF EXISTS customer_ip_address,
  DROP COLUMN IF EXISTS merchant_ip_address;

-- =========================================================
-- 4) Drop ERP enums (after dependent tables/columns are gone)
-- =========================================================
DROP TYPE IF EXISTS public.cash_account_type CASCADE;
DROP TYPE IF EXISTS public.account_type CASCADE;
DROP TYPE IF EXISTS public.ledger_source CASCADE;
DROP TYPE IF EXISTS public.china_shipment_status CASCADE;
DROP TYPE IF EXISTS public.order_finalization_status CASCADE;
DROP TYPE IF EXISTS public.damage_source CASCADE;
DROP TYPE IF EXISTS public.ad_platform CASCADE;
DROP TYPE IF EXISTS public.ad_status CASCADE;
DROP TYPE IF EXISTS public.ad_attribution_method CASCADE;

-- =========================================================
-- 5) Drop sequence used by general_ledger
-- =========================================================
DROP SEQUENCE IF EXISTS public.ledger_entry_seq CASCADE;