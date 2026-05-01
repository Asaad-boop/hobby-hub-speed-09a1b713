
-- Page views tracking for analytics
CREATE TABLE IF NOT EXISTS public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid,
  path text NOT NULL,
  page_type text,
  product_id uuid,
  referrer text,
  utm_source text,
  device_type text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_product ON public.page_views(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_views_page_type ON public.page_views(page_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON public.page_views(session_id);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone insert page views"
  ON public.page_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "staff read page views"
  ON public.page_views FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'customer_service'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  );
