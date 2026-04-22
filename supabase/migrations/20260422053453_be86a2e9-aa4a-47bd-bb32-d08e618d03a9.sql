
-- ============ PART 1: integrations + logs ============
CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  provider text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_sync_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage integrations"
  ON public.integrations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed
INSERT INTO public.integrations (name, provider, is_enabled, config) VALUES
  ('bd_courier', 'BD Courier', false, '{"cache_hours": 24}'::jsonb),
  ('meta_ads', 'Meta Ads', false, '{"sync_interval_hours": 6}'::jsonb),
  ('meta_capi', 'Meta Conversions API', false, '{"events": ["Purchase","InitiateCheckout","AddToCart","ViewContent"]}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ============ integration_logs ============
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name text NOT NULL,
  endpoint text,
  method text,
  request_payload jsonb,
  response_payload jsonb,
  status_code int,
  duration_ms int,
  error text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_logs_name_created
  ON public.integration_logs (integration_name, created_at DESC);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read integration logs"
  ON public.integration_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "authenticated insert integration logs"
  ON public.integration_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============ courier_stats_cache ============
CREATE TABLE IF NOT EXISTS public.courier_stats_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  overall_total int NOT NULL DEFAULT 0,
  overall_success int NOT NULL DEFAULT 0,
  overall_cancel int NOT NULL DEFAULT 0,
  overall_success_rate numeric(5,2) DEFAULT 0,
  pathao jsonb NOT NULL DEFAULT '{}'::jsonb,
  redx jsonb NOT NULL DEFAULT '{}'::jsonb,
  steadfast jsonb NOT NULL DEFAULT '{}'::jsonb,
  paperfly jsonb NOT NULL DEFAULT '{}'::jsonb,
  carrybee jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_response jsonb,
  risk_level text,
  last_fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  fetch_count int NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_courier_cache_expires ON public.courier_stats_cache (expires_at);

ALTER TABLE public.courier_stats_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read courier cache"
  ON public.courier_stats_cache FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'customer_service'::app_role)
      OR public.has_role(auth.uid(), 'operations'::app_role));

CREATE POLICY "admins manage courier cache"
  ON public.courier_stats_cache FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ Meta Ads schema extensions ============
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS meta_campaign_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS meta_campaign_name text,
  ADD COLUMN IF NOT EXISTS meta_ad_account_id text,
  ADD COLUMN IF NOT EXISTS meta_objective text,
  ADD COLUMN IF NOT EXISTS meta_buying_type text,
  ADD COLUMN IF NOT EXISTS meta_bid_strategy text,
  ADD COLUMN IF NOT EXISTS sync_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

CREATE TABLE IF NOT EXISTS public.meta_ad_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  meta_adset_id text NOT NULL UNIQUE,
  meta_adset_name text,
  targeting jsonb DEFAULT '{}'::jsonb,
  daily_budget numeric(12,2),
  lifetime_budget numeric(12,2),
  status text,
  start_time timestamptz,
  end_time timestamptz,
  sync_enabled boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_ad_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage ad sets"
  ON public.meta_ad_sets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_meta_ad_sets_updated_at
  BEFORE UPDATE ON public.meta_ad_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.meta_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adset_id uuid REFERENCES public.meta_ad_sets(id) ON DELETE CASCADE,
  meta_ad_id text NOT NULL UNIQUE,
  meta_ad_name text,
  creative_id text,
  creative_preview_url text,
  product_link_url text,
  detected_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  detected_sku text,
  status text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage meta ads"
  ON public.meta_ads FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_meta_ads_updated_at
  BEFORE UPDATE ON public.meta_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.meta_ad_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.meta_ads(id) ON DELETE CASCADE,
  date_start date NOT NULL,
  date_stop date NOT NULL,
  impressions int DEFAULT 0,
  clicks int DEFAULT 0,
  spend numeric(12,2) DEFAULT 0,
  cpm numeric(10,4) DEFAULT 0,
  cpc numeric(10,4) DEFAULT 0,
  ctr numeric(10,4) DEFAULT 0,
  reach int DEFAULT 0,
  frequency numeric(10,4) DEFAULT 0,
  conversions int DEFAULT 0,
  conversion_value numeric(12,2) DEFAULT 0,
  roas numeric(10,4) DEFAULT 0,
  captured_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ad_id, date_start)
);

ALTER TABLE public.meta_ad_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage meta insights"
  ON public.meta_ad_insights FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ pg_cron daily cleanup ============
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-integration-logs');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-integration-logs',
  '0 3 * * *',
  $$DELETE FROM public.integration_logs WHERE created_at < now() - interval '30 days';
    DELETE FROM public.courier_stats_cache WHERE expires_at < now() - interval '30 days';$$
);
