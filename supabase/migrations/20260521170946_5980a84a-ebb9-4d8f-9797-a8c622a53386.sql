
-- 1. Restrict activity_log inserts to staff only
DROP POLICY IF EXISTS "activity authenticated insert" ON public.activity_log;
CREATE POLICY "activity staff insert" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'customer_service'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  );

-- 2. Remove customer self-insert on coupon_usage (admin policy + service role remain)
DROP POLICY IF EXISTS "users insert own coupon usage" ON public.coupon_usage;

-- 3. Remove customer update on order_items (admin/service role remain)
DROP POLICY IF EXISTS "users update own order items" ON public.order_items;
