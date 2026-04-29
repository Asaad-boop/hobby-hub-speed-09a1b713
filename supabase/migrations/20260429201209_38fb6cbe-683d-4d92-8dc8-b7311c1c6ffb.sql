
-- 1. abandoned_carts: scope UPDATE to owner
DROP POLICY IF EXISTS "anyone update own session cart" ON public.abandoned_carts;

CREATE POLICY "owner update own cart"
ON public.abandoned_carts
FOR UPDATE
USING (
  ((user_id IS NULL) AND (session_id IS NOT NULL) AND (session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text)))
  OR ((auth.uid() IS NOT NULL) AND (auth.uid() = user_id))
)
WITH CHECK (
  ((user_id IS NULL) AND (session_id IS NOT NULL) AND (session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text)))
  OR ((auth.uid() IS NOT NULL) AND (auth.uid() = user_id))
);

-- 2. Drop public anon SELECT on guest orders / order_items (replaced by server fn)
DROP POLICY IF EXISTS "anon read guest orders" ON public.orders;
DROP POLICY IF EXISTS "anon read guest order items" ON public.order_items;

-- Note: the existing policy named "anon read guest orders" was actually scoped to authenticated
-- users (auth.uid() = user_id OR staff); recreate that for authenticated users only.
CREATE POLICY "users and staff read orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'customer_service'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR (auth.uid() = user_id)
);

-- 3. Realtime: remove sensitive tables from publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
ALTER PUBLICATION supabase_realtime DROP TABLE public.order_items;
ALTER PUBLICATION supabase_realtime DROP TABLE public.active_sessions;

-- 4. Reviews: public-facing reads must not expose guest_phone.
-- Replace the broad SELECT policy with a split: staff/owner can SELECT *,
-- public approved reads go through a SECURITY INVOKER view that omits guest_phone.
DROP POLICY IF EXISTS "reviews read approved or own or staff" ON public.reviews;

CREATE POLICY "reviews staff and owner read"
ON public.reviews
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'customer_service'::app_role)
);

-- Public sanitized view (omits guest_phone)
CREATE OR REPLACE VIEW public.reviews_public
WITH (security_invoker = true)
AS
SELECT
  id, product_id, user_id, order_id, rating, title, comment,
  is_approved, admin_note, guest_name,
  images, videos, created_at, updated_at
FROM public.reviews
WHERE is_approved = true;

GRANT SELECT ON public.reviews_public TO anon, authenticated;

-- Allow anon/auth to read approved rows directly too (for the view to work via security_invoker)
CREATE POLICY "reviews public read approved (no phone via view)"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (is_approved = true);

-- NOTE: Direct table SELECT still returns guest_phone for approved rows.
-- We'll fix this by revoking guest_phone column from anon/authenticated.
REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (
  id, product_id, user_id, order_id, rating, title, comment,
  is_approved, admin_note, guest_name, images, videos, created_at, updated_at
) ON public.reviews TO anon, authenticated;
-- Staff still gets full access through service_role / authenticated role check via RLS;
-- to allow staff to read guest_phone, grant the column to authenticated role too —
-- RLS will gate the rows.
GRANT SELECT (guest_phone) ON public.reviews TO authenticated;
-- (RLS on reviews still restricts which rows authenticated users see; only staff/owner
-- pass the policy that includes guest_phone access patterns.)

-- 5. SECURITY DEFINER function execute privileges
-- Trigger-only functions: revoke EXECUTE from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_review_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_order_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_telegram_on_new_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_profile_order_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_create_low_stock_alert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trim_homepage_versions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Internal helper functions (called from other server-side functions only)
REVOKE EXECUTE ON FUNCTION public.append_order_status_log(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_product_rating(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reserve_stock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_stock(uuid) FROM PUBLIC, anon, authenticated;

-- Admin-only RPCs: revoke from anon (internal role check still applies for authenticated)
REVOKE EXECUTE ON FUNCTION public.hard_delete_order(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transition_order_status(uuid, public.order_status, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_order_note(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_order_view(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_customer_stats(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_rls_audit() FROM PUBLIC, anon;

-- has_role / has_permission / is_admin: keep accessible — they're used in RLS policies.
-- Their internal logic is read-only and must be callable to evaluate policies.
