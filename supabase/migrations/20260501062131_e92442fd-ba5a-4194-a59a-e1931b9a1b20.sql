
-- GA4-style analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  session_id text NOT NULL,
  user_id uuid,
  -- Page / content context
  path text,
  page_type text,
  product_id uuid,
  product_name text,
  -- Commerce values
  currency text DEFAULT 'BDT',
  value numeric,
  quantity integer,
  order_id uuid,
  -- Attribution snapshot at event time
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  fb_click_id text,
  fb_browser_pixel text,
  device_type text,
  user_agent text,
  -- Free-form payload for event-specific extras
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name_created_at
  ON public.analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON public.analytics_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_product
  ON public.analytics_events(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_order
  ON public.analytics_events(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_utm_source_created_at
  ON public.analytics_events(utm_source, created_at DESC) WHERE utm_source IS NOT NULL;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + auth'd visitors) can write their own events. The session_id
-- is generated client-side and the table holds only behavioral data — no
-- secrets or other users' rows are exposed via inserts.
CREATE POLICY "anyone insert analytics events"
  ON public.analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only staff can read.
CREATE POLICY "staff read analytics events"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'customer_service'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  );
