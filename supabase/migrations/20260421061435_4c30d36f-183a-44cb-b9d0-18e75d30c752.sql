-- Option types per product (e.g. "Size", "Color")
CREATE TABLE public.product_option_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, name)
);
CREATE INDEX idx_product_option_types_product ON public.product_option_types(product_id);
ALTER TABLE public.product_option_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "option types public read"
  ON public.product_option_types FOR SELECT USING (true);
CREATE POLICY "admins manage option types"
  ON public.product_option_types FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Option values for each type (e.g. "Small", "Red")
CREATE TABLE public.product_option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_type_id uuid NOT NULL REFERENCES public.product_option_types(id) ON DELETE CASCADE,
  value text NOT NULL,
  swatch_hex text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (option_type_id, value)
);
CREATE INDEX idx_product_option_values_type ON public.product_option_values(option_type_id);
ALTER TABLE public.product_option_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "option values public read"
  ON public.product_option_values FOR SELECT USING (true);
CREATE POLICY "admins manage option values"
  ON public.product_option_values FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Variants (combinations)
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text UNIQUE,
  price_override numeric(12,2),
  stock integer NOT NULL DEFAULT 0,
  image text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "variants public read active"
  ON public.product_variants FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage variants"
  ON public.product_variants FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_product_variants_updated
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Junction: each variant -> set of option_value ids (one per option_type)
CREATE TABLE public.product_variant_values (
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  option_value_id uuid NOT NULL REFERENCES public.product_option_values(id) ON DELETE CASCADE,
  PRIMARY KEY (variant_id, option_value_id)
);
CREATE INDEX idx_pvv_value ON public.product_variant_values(option_value_id);
ALTER TABLE public.product_variant_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "variant values public read"
  ON public.product_variant_values FOR SELECT USING (true);
CREATE POLICY "admins manage variant values"
  ON public.product_variant_values FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Add variant tracking to order_items
ALTER TABLE public.order_items
  ADD COLUMN variant_id uuid,
  ADD COLUMN variant_label text;
CREATE INDEX idx_order_items_variant ON public.order_items(variant_id);