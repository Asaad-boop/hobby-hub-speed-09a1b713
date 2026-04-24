-- 1. Move unit_cost / avg_cost into admin-only table
CREATE TABLE IF NOT EXISTS public.product_costs (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  unit_cost numeric NOT NULL DEFAULT 0,
  avg_cost numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill from existing columns
INSERT INTO public.product_costs (product_id, unit_cost, avg_cost)
SELECT id, unit_cost, avg_cost FROM public.products
ON CONFLICT (product_id) DO NOTHING;

ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage product costs"
ON public.product_costs FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "staff read product costs"
ON public.product_costs FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'accountant'::public.app_role)
  OR public.has_role(auth.uid(), 'operations'::public.app_role)
);

-- Drop cost columns from public products table
ALTER TABLE public.products DROP COLUMN IF EXISTS unit_cost;
ALTER TABLE public.products DROP COLUMN IF EXISTS avg_cost;

-- 2. Validate order totals server-side
CREATE OR REPLACE FUNCTION public.validate_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  expected_total numeric;
BEGIN
  -- Skip validation for staff updates
  IF TG_OP = 'UPDATE' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.subtotal < 0 OR NEW.shipping_fee < 0 OR NEW.discount_amount < 0 OR NEW.total < 0 THEN
    RAISE EXCEPTION 'Order amounts cannot be negative';
  END IF;

  expected_total := NEW.subtotal + NEW.shipping_fee - NEW.discount_amount;

  -- Allow 1 unit rounding tolerance
  IF abs(NEW.total - expected_total) > 1 THEN
    RAISE EXCEPTION 'Order total mismatch: expected %, got %', expected_total, NEW.total;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_order_totals_trigger ON public.orders;
CREATE TRIGGER validate_order_totals_trigger
BEFORE INSERT OR UPDATE OF subtotal, shipping_fee, discount_amount, total
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_totals();

-- 3. Fix profiles SELECT policy
DROP POLICY IF EXISTS "users read own profile (redacted)" ON public.profiles;
CREATE POLICY "users read own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- 4. Restrict public bucket listing (keep individual files accessible by URL)
DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Public read reel-videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view reel videos" ON storage.objects;
DROP POLICY IF EXISTS "Public bucket SELECT" ON storage.objects;

-- Note: For public buckets, files remain accessible via their public URL
-- (handled by storage CDN), but we remove the anonymous SELECT policy that
-- would allow listing bucket contents via the API.
-- Admins/staff can still list for management purposes.
CREATE POLICY "staff list product-images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'product-images'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
  )
);

CREATE POLICY "staff list reel-videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'reel-videos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'operations'::public.app_role)
  )
);