
-- ============ updated_at triggers ============
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'orders','products','categories','profiles','addresses','coupons','expenses',
    'cash_accounts','transactions','courier_shipments','order_financials',
    'product_variants','expense_categories','ad_campaigns','site_settings',
    'returns_exchanges','reviews','product_option_types','product_option_values'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    -- product_option_types/values don't have updated_at; skip them
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ============ transactions -> cash account balance ============
DROP TRIGGER IF EXISTS trg_apply_txn_balance ON public.transactions;
CREATE TRIGGER trg_apply_txn_balance
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_transaction_to_balance();

-- ============ orders.total -> order_financials.revenue ============
DROP TRIGGER IF EXISTS trg_sync_order_financial_revenue ON public.orders;
CREATE TRIGGER trg_sync_order_financial_revenue
AFTER UPDATE OF total ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_order_financial_revenue();

-- ============ order_items -> recalc product_cost ============
DROP TRIGGER IF EXISTS trg_recalc_order_product_cost ON public.order_items;
CREATE TRIGGER trg_recalc_order_product_cost
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_order_product_cost();

-- ============ reviews -> recalc product rating ============
DROP TRIGGER IF EXISTS trg_handle_review_change ON public.reviews;
CREATE TRIGGER trg_handle_review_change
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.handle_review_change();

-- ============ coupon_usage -> increment usage ============
DROP TRIGGER IF EXISTS trg_increment_coupon_usage ON public.coupon_usage;
CREATE TRIGGER trg_increment_coupon_usage
AFTER INSERT ON public.coupon_usage
FOR EACH ROW EXECUTE FUNCTION public.increment_coupon_usage();

-- ============ ad_spend_entries -> refresh campaign total ============
DROP TRIGGER IF EXISTS trg_refresh_campaign_total_spend ON public.ad_spend_entries;
CREATE TRIGGER trg_refresh_campaign_total_spend
AFTER INSERT OR UPDATE OR DELETE ON public.ad_spend_entries
FOR EACH ROW EXECUTE FUNCTION public.refresh_campaign_total_spend();

-- ============ orders status change -> reserve/release stock + finalize ============
DROP TRIGGER IF EXISTS trg_handle_order_status_change ON public.orders;
CREATE TRIGGER trg_handle_order_status_change
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_change();

-- ============ orders status/confirmation -> activity log ============
DROP TRIGGER IF EXISTS trg_log_order_status_change ON public.orders;
CREATE TRIGGER trg_log_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- ============ homepage_versions -> trim to latest 10 ============
DROP TRIGGER IF EXISTS trg_trim_homepage_versions ON public.homepage_versions;
CREATE TRIGGER trg_trim_homepage_versions
AFTER INSERT ON public.homepage_versions
FOR EACH STATEMENT EXECUTE FUNCTION public.trim_homepage_versions();

-- ============ auth.users -> handle_new_user (creates profile) ============
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
