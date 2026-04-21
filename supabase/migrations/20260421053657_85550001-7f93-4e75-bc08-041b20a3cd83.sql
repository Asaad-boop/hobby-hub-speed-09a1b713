-- Coupon type enum
CREATE TYPE public.coupon_type AS ENUM ('percentage', 'fixed');

-- Coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  type public.coupon_type NOT NULL DEFAULT 'percentage',
  value NUMERIC NOT NULL CHECK (value >= 0),
  min_order_amount NUMERIC NOT NULL DEFAULT 0,
  max_discount NUMERIC,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applicable_categories JSONB,
  applicable_products JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupons_code ON public.coupons (code);
CREATE INDEX idx_coupons_active ON public.coupons (is_active);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons public read active"
  ON public.coupons FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins manage coupons"
  ON public.coupons FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Coupon usage tracking
CREATE TABLE public.coupon_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID NOT NULL,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupon_usage_coupon ON public.coupon_usage (coupon_id);
CREATE INDEX idx_coupon_usage_user ON public.coupon_usage (user_id);
CREATE INDEX idx_coupon_usage_order ON public.coupon_usage (order_id);

ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own coupon usage"
  ON public.coupon_usage FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "users insert own coupon usage"
  ON public.coupon_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins manage coupon usage"
  ON public.coupon_usage FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Add discount columns to orders
ALTER TABLE public.orders
  ADD COLUMN discount_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN coupon_code TEXT;

-- Function to increment coupon usage count
CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons
     SET used_count = used_count + 1,
         updated_at = now()
   WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_coupon_usage_increment
  AFTER INSERT ON public.coupon_usage
  FOR EACH ROW EXECUTE FUNCTION public.increment_coupon_usage();