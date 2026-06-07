
-- 1) Tighten guest order INSERT to only allow safe defaults on staff-only fields
DROP POLICY IF EXISTS "anyone insert guest orders" ON public.orders;
CREATE POLICY "anyone insert guest orders" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    is_guest_order = true
    AND user_id IS NULL
    AND status = 'new'::public.order_status
    AND payment_status = 'unpaid'::public.payment_status
    AND confirmation_status = 'pending'::public.confirmation_status
    AND call_status = 'not_called'::public.call_status
    AND priority = 'normal'::public.order_priority
    AND risk_flag = false
    AND duplicate_flag = false
    AND admin_notes IS NULL
    AND internal_note IS NULL
    AND rejection_reason IS NULL
    AND cancellation_reason IS NULL
    AND hold_reason IS NULL
    AND assigned_to IS NULL
    AND confirmed_by IS NULL
    AND packaged_by IS NULL
    AND shipped_by IS NULL
    AND last_called_by IS NULL
    AND advance_amount = 0
    AND refund_amount = 0
    AND partial_amount IS NOT DISTINCT FROM 0
    AND call_attempt_count = 0
    AND pipeline_log = '[]'::jsonb
    AND status_log = '[]'::jsonb
    AND COALESCE(array_length(tags, 1), 0) = 0
    AND COALESCE(array_length(order_tags, 1), 0) = 0
  );

-- 2) Tighten guest order_items INSERT: cost_price / discount / tax must be safe defaults
DROP POLICY IF EXISTS "anyone insert recent guest order items" ON public.order_items;
CREATE POLICY "anyone insert recent guest order items" ON public.order_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    user_id IS NULL
    AND public.is_recent_guest_order(order_id)
    AND COALESCE(cost_price, 0) = 0
    AND discount_amount = 0
    AND tax_amount = 0
  );

-- 3) Storage: restrict review image / video uploads to a per-user folder
DROP POLICY IF EXISTS "Authenticated upload review images" ON storage.objects;
CREATE POLICY "Authenticated upload review images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'review-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated upload review videos" ON storage.objects;
CREATE POLICY "Authenticated upload review videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'review-videos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
