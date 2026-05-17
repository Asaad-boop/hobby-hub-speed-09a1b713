-- Pathao shipments tracking table
CREATE TABLE IF NOT EXISTS public.pathao_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  merchant_order_id text NOT NULL,
  consignment_id text UNIQUE,
  order_status text,
  delivery_fee numeric DEFAULT 0,
  cod_fee numeric DEFAULT 0,
  promo_discount numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  invoice_id text,
  payload_sent jsonb,
  response_raw jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_pathao_shipments_order_id ON public.pathao_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_pathao_shipments_consignment_id ON public.pathao_shipments(consignment_id);
CREATE INDEX IF NOT EXISTS idx_pathao_shipments_status ON public.pathao_shipments(order_status);

ALTER TABLE public.pathao_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view pathao shipments"
ON public.pathao_shipments FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
  OR public.has_role(auth.uid(), 'operations'::public.app_role)
);

CREATE POLICY "Staff can insert pathao shipments"
ON public.pathao_shipments FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'operations'::public.app_role)
);

CREATE POLICY "Staff can update pathao shipments"
ON public.pathao_shipments FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'operations'::public.app_role)
);

CREATE POLICY "Admins can delete pathao shipments"
ON public.pathao_shipments FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_pathao_shipments_updated_at
BEFORE UPDATE ON public.pathao_shipments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pathao auth token cache (single-row)
CREATE TABLE IF NOT EXISTS public.pathao_auth_cache (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token text NOT NULL,
  refresh_token text,
  token_type text DEFAULT 'Bearer',
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pathao_auth_cache ENABLE ROW LEVEL SECURITY;

-- Only service role can access (no public policies => locked down)
CREATE POLICY "Admins can view pathao auth cache"
ON public.pathao_auth_cache FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));