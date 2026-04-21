-- 1) Add admin_note column
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS admin_note text;

-- 2) Default is_approved to false going forward (existing rows untouched)
ALTER TABLE public.reviews
  ALTER COLUMN is_approved SET DEFAULT false;

-- 3) Rating range check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reviews_rating_range_chk'
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_rating_range_chk
      CHECK (rating BETWEEN 1 AND 5);
  END IF;
END $$;

-- 4) Dedupe before adding unique constraint (keep newest per (product,user,order))
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY product_id, user_id, COALESCE(order_id, '00000000-0000-0000-0000-000000000000'::uuid)
           ORDER BY created_at DESC
         ) AS rn
  FROM public.reviews
)
DELETE FROM public.reviews r
USING ranked
WHERE r.id = ranked.id AND ranked.rn > 1;

-- 5) Unique constraint: one review per (product, user, order)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_product_user_order_uniq'
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_product_user_order_uniq
      UNIQUE (product_id, user_id, order_id);
  END IF;
END $$;

-- 6) Replace RLS policies
DROP POLICY IF EXISTS "users delete own reviews" ON public.reviews;
DROP POLICY IF EXISTS "reviews public read approved" ON public.reviews;
DROP POLICY IF EXISTS "users insert own reviews" ON public.reviews;
DROP POLICY IF EXISTS "users update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "admins manage reviews" ON public.reviews;

-- SELECT: public reads approved; users read own; admins read all
CREATE POLICY "reviews read approved or own or admin"
ON public.reviews
FOR SELECT
USING (
  is_approved = true
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- INSERT: must be authenticated user, must own the row, AND must have a delivered order containing the product
CREATE POLICY "users insert reviews after delivery"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.user_id = auth.uid()
      AND o.status = 'delivered'::public.order_status
      AND oi.product_id = reviews.product_id::text
  )
);

-- UPDATE: user can edit own review only while not yet approved; admins can edit any
CREATE POLICY "users update own pending reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = user_id AND is_approved = false)
WITH CHECK (auth.uid() = user_id AND is_approved = false);

CREATE POLICY "admins update any review"
ON public.reviews
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- DELETE: admin only
CREATE POLICY "admins delete reviews"
ON public.reviews
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 7) Ensure recalc function only counts approved (already does, but reaffirm) and trigger exists
CREATE OR REPLACE FUNCTION public.recalc_product_rating(_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

DROP TRIGGER IF EXISTS trg_reviews_recalc ON public.reviews;
CREATE TRIGGER trg_reviews_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_review_change();

-- 8) Helpful index for "eligible to review" lookups
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved
  ON public.reviews (product_id, is_approved, created_at DESC);
