
-- Restrict authenticated users from inserting staff-only fields on order_items
DROP POLICY IF EXISTS "users insert own order items" ON public.order_items;
CREATE POLICY "users insert own order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND COALESCE(cost_price, 0) = 0
  AND discount_amount = 0
  AND tax_amount = 0
);

-- Restrict authenticated users from inserting staff-only fields on orders
DROP POLICY IF EXISTS "users insert own orders" ON public.orders;
CREATE POLICY "users insert own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND is_guest_order = false
  AND status = 'new'::order_status
  AND payment_status = 'unpaid'::payment_status
  AND confirmation_status = 'pending'::confirmation_status
  AND call_status = 'not_called'::call_status
  AND priority = 'normal'::order_priority
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
  AND NOT (partial_amount IS DISTINCT FROM 0)
  AND call_attempt_count = 0
  AND pipeline_log = '[]'::jsonb
  AND status_log = '[]'::jsonb
  AND COALESCE(array_length(tags, 1), 0) = 0
  AND COALESCE(array_length(order_tags, 1), 0) = 0
);
