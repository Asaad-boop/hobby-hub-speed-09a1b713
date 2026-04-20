-- =============================================================
-- PHASE 1: Reviews + Customer notes + Stock history visibility
-- =============================================================

-- 1) REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT NULL,
  comment TEXT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON public.reviews(is_approved);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public can read approved reviews; admins see all
CREATE POLICY "reviews public read approved"
  ON public.reviews FOR SELECT
  USING (is_approved = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Logged-in users insert their own reviews (eligibility = any auth user)
CREATE POLICY "users insert own reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update/delete their own reviews
CREATE POLICY "users update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users delete own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Admins moderate everything
CREATE POLICY "admins manage reviews"
  ON public.reviews FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- updated_at trigger
CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) AUTO-UPDATE products.rating + products.reviews on review changes
CREATE OR REPLACE FUNCTION public.recalc_product_rating(_product_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating NUMERIC;
  review_count INTEGER;
BEGIN
  SELECT COALESCE(AVG(rating), 0)::NUMERIC(3,2), COUNT(*)
    INTO avg_rating, review_count
  FROM public.reviews
  WHERE product_id = _product_id AND is_approved = true;

  UPDATE public.products
     SET rating = avg_rating,
         reviews = review_count,
         updated_at = now()
   WHERE id = _product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recalc_product_rating(OLD.product_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_product_rating(NEW.product_id);
    IF (TG_OP = 'UPDATE' AND OLD.product_id <> NEW.product_id) THEN
      PERFORM public.recalc_product_rating(OLD.product_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_reviews_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_review_change();

-- 3) ADMIN NOTES on profiles (for customer drill-down)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_notes TEXT NULL;

-- Allow admins to update any profile (for admin_notes)
CREATE POLICY "admins update any profile"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
