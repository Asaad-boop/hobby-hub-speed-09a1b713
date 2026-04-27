ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shipping_fee_inside numeric,
  ADD COLUMN IF NOT EXISTS shipping_fee_outside numeric;

UPDATE public.products
   SET shipping_fee_outside = 100
 WHERE slug = 'cute-bow-foldable-hair-brush-with-mirror';