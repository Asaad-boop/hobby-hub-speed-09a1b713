-- Allow guest reviews
ALTER TABLE public.reviews
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_phone text;

-- New policy: anyone (anon or auth) can insert a guest review
DROP POLICY IF EXISTS "anyone insert guest reviews" ON public.reviews;
CREATE POLICY "anyone insert guest reviews"
ON public.reviews
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NULL
  AND order_id IS NULL
  AND is_approved = false
  AND guest_name IS NOT NULL
  AND length(trim(guest_name)) >= 2
  AND guest_phone IS NOT NULL
  AND length(trim(guest_phone)) >= 6
  AND rating BETWEEN 1 AND 5
);