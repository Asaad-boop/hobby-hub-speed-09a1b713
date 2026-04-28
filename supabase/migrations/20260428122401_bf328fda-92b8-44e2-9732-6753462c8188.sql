
-- Tables required by fetch-courier-stats edge function
CREATE TABLE IF NOT EXISTS public.courier_stats_cache (
  phone text PRIMARY KEY,
  overall_total integer NOT NULL DEFAULT 0,
  overall_success integer NOT NULL DEFAULT 0,
  overall_cancel integer NOT NULL DEFAULT 0,
  overall_success_rate numeric NOT NULL DEFAULT 0,
  pathao jsonb,
  redx jsonb,
  steadfast jsonb,
  paperfly jsonb,
  parceldex jsonb,
  carrybee jsonb,
  raw_response jsonb,
  risk_level text,
  last_fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  fetch_count integer NOT NULL DEFAULT 1
);

ALTER TABLE public.courier_stats_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read courier stats cache" ON public.courier_stats_cache
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'customer_service'::app_role) OR has_role(auth.uid(), 'operations'::app_role));

CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  provider text,
  is_enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_sync_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage integrations" ON public.integrations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name text NOT NULL,
  endpoint text,
  method text,
  request_payload jsonb,
  response_payload jsonb,
  status_code integer,
  duration_ms integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read integration logs" ON public.integration_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
