-- Drop the permissive public SELECT policy that exposes guest_phone on the base reviews table.
DROP POLICY IF EXISTS "reviews public read approved (no phone via view)" ON public.reviews;

-- Public reads of approved reviews must go through the public.reviews_public view,
-- which omits guest_phone. The base table now only allows staff and the review owner
-- to SELECT (already covered by the existing "reviews staff and owner read" policy).