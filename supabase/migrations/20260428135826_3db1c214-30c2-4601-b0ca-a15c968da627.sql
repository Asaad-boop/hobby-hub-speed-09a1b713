-- Re-create courier stats cache table for BD Courier integration
CREATE TABLE public.courier_stats_cache (
  phone text PRIMARY KEY,
  overall_total integer NOT NULL DEFAULT 0,
  overall_success integer NOT NULL DEFAULT 0,
  overall_cancel integer NOT NULL DEFAULT 0,
  overall_success_rate numeric NOT NULL DEFAULT 0,
  pathao jsonb,
  steadfast jsonb,
  redx jsonb,
  paperfly jsonb,
  parceldex jsonb,
  carrybee jsonb,
  risk_level text,
  raw_response jsonb,
  fetch_count integer NOT NULL DEFAULT 1,
  last_fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.courier_stats_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read courier stats cache"
  ON public.courier_stats_cache
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
  );

CREATE INDEX idx_courier_stats_cache_expires_at ON public.courier_stats_cache(expires_at);