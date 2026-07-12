
DROP POLICY IF EXISTS "anyone insert guest orders" ON public.orders;
DROP POLICY IF EXISTS "users insert own orders" ON public.orders;

CREATE POLICY "anyone insert guest orders" ON public.orders
FOR INSERT WITH CHECK (
  (is_guest_order = true) AND (user_id IS NULL)
  AND (status = 'new'::order_status)
  AND (payment_status = 'unpaid'::payment_status)
  AND (confirmation_status = 'pending'::confirmation_status)
  AND (call_status = 'not_called'::call_status)
  AND (priority = 'normal'::order_priority)
  AND (risk_flag = false) AND (duplicate_flag = false)
  AND (admin_notes IS NULL) AND (internal_note IS NULL)
  AND (rejection_reason IS NULL) AND (cancellation_reason IS NULL)
  AND (hold_reason IS NULL) AND (assigned_to IS NULL)
  AND (confirmed_by IS NULL) AND (packaged_by IS NULL)
  AND (shipped_by IS NULL) AND (last_called_by IS NULL)
  AND (
    COALESCE(advance_amount, 0) = 0
    OR (COALESCE(advance_amount, 0) > 0 AND lower(COALESCE(advance_source, '')) IN ('bkash','nagad','rocket'))
  )
  AND (refund_amount = 0)
  AND (NOT (partial_amount IS DISTINCT FROM 0::numeric))
  AND (call_attempt_count = 0)
  AND (pipeline_log = '[]'::jsonb) AND (status_log = '[]'::jsonb)
  AND (COALESCE(array_length(tags, 1), 0) = 0)
  AND (COALESCE(array_length(order_tags, 1), 0) = 0)
);

CREATE POLICY "users insert own orders" ON public.orders
FOR INSERT WITH CHECK (
  ((SELECT auth.uid()) IS NOT NULL) AND ((SELECT auth.uid()) = user_id)
  AND (is_guest_order = false)
  AND (status = 'new'::order_status)
  AND (payment_status = 'unpaid'::payment_status)
  AND (confirmation_status = 'pending'::confirmation_status)
  AND (call_status = 'not_called'::call_status)
  AND (priority = 'normal'::order_priority)
  AND (risk_flag = false) AND (duplicate_flag = false)
  AND (admin_notes IS NULL) AND (internal_note IS NULL)
  AND (rejection_reason IS NULL) AND (cancellation_reason IS NULL)
  AND (hold_reason IS NULL) AND (assigned_to IS NULL)
  AND (confirmed_by IS NULL) AND (packaged_by IS NULL)
  AND (shipped_by IS NULL) AND (last_called_by IS NULL)
  AND (
    COALESCE(advance_amount, 0) = 0
    OR (COALESCE(advance_amount, 0) > 0 AND lower(COALESCE(advance_source, '')) IN ('bkash','nagad','rocket'))
  )
  AND (refund_amount = 0)
  AND (NOT (partial_amount IS DISTINCT FROM 0::numeric))
  AND (call_attempt_count = 0)
  AND (pipeline_log = '[]'::jsonb) AND (status_log = '[]'::jsonb)
  AND (COALESCE(array_length(tags, 1), 0) = 0)
  AND (COALESCE(array_length(order_tags, 1), 0) = 0)
);
