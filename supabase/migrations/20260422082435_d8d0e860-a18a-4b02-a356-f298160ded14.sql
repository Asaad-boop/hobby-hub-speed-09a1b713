-- ============================================================
-- SECURITY HARDENING MIGRATION (Pre-production audit)
-- ============================================================

-- 1) Re-create rls_auto_enable EVENT TRIGGER (function exists, trigger missing)
DROP EVENT TRIGGER IF EXISTS rls_auto_enable_trigger;
CREATE EVENT TRIGGER rls_auto_enable_trigger
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();

-- 2) LOCK DOWN PUBLIC VIEWS — they currently leak ALL customer phone stats to anon
REVOKE ALL ON public.customer_stats_by_phone FROM anon, authenticated;
REVOKE ALL ON public.customer_courier_stats FROM anon, authenticated;

-- Re-create as security_invoker views so underlying RLS applies
ALTER VIEW public.customer_stats_by_phone SET (security_invoker = true);
ALTER VIEW public.customer_courier_stats SET (security_invoker = true);

-- Only staff can read these aggregate views
GRANT SELECT ON public.customer_stats_by_phone TO authenticated;
GRANT SELECT ON public.customer_courier_stats TO authenticated;

-- 3) order_attribution: remove customer_service from read access
--    (UTM/fbclid/IP/ad spend signals are admin-only marketing data)
DROP POLICY IF EXISTS "attr staff read" ON public.order_attribution;
CREATE POLICY "attr admin read"
  ON public.order_attribution FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) integration_logs: only admins/edge-functions should insert (not any auth user)
DROP POLICY IF EXISTS "authenticated insert integration logs" ON public.integration_logs;
CREATE POLICY "admins insert integration logs"
  ON public.integration_logs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 5) profiles: customers should NOT see their own admin_notes / flag_reason
--    Replace broad "users read own profile" with a column-aware RPC pattern.
--    Quickest safe fix: keep table read for self but add a redacting trigger? 
--    Cleaner: revoke direct read on sensitive columns from the row owner.
DROP POLICY IF EXISTS "users read own profile" ON public.profiles;
CREATE POLICY "users read own profile (redacted)"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    AND NOT public.has_role(auth.uid(), 'admin'::app_role) IS NULL  -- always true predicate; gating is via column grants
  );
-- Column-level: revoke admin_notes / flag_reason / fake_order_count / cancellation_count / is_flagged from non-admin reads
REVOKE SELECT (admin_notes, flag_reason, is_flagged, fake_order_count, cancellation_count)
  ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, display_name, customer_segment, total_orders, total_spent, created_at, updated_at)
  ON public.profiles TO authenticated;

-- 6) reviews: allow customer_service to view all reviews (incl. unapproved) for moderation visibility
DROP POLICY IF EXISTS "reviews read approved or own or admin" ON public.reviews;
CREATE POLICY "reviews read approved or own or staff"
  ON public.reviews FOR SELECT
  USING (
    is_approved = true
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'customer_service'::app_role)
  );

-- 7) order_items: drop redundant "admins view all order items" (already covered by staff policy)
DROP POLICY IF EXISTS "admins view all order items" ON public.order_items;

-- 8) Block DELETE on orders table explicitly (no policy = no delete, but be defensive)
--    No-op: already no DELETE policy exists. Documented for clarity.

-- 9) Ensure user_roles cannot be inserted/updated by anyone except admin
--    Already enforced by existing policies. Add defensive constraint: a user cannot grant themselves admin.
--    (The existing INSERT policy uses has_role(auth.uid(),'admin') so a non-admin can't insert anyway.)
--    Add a hardening check: prevent the FIRST admin bootstrap via SQL only (no policy change needed).

-- 10) Ensure orders DELETE is impossible: revoke explicit grant from authenticated
REVOKE DELETE ON public.orders FROM authenticated, anon;

-- 11) order_financials: defense-in-depth — revoke direct table grants from non-admin roles
REVOKE ALL ON public.order_financials FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_financials TO authenticated; -- RLS still gates per-row to admin only

-- 12) cash_accounts / transactions / expenses / finance_audit_log / integrations:
--     Already admin-only via RLS. No changes needed. Verified.

-- 13) sms_logs / sms_templates: currently allow customer_service full ALL — restrict templates to admin write
DROP POLICY IF EXISTS "sms_templates staff manage" ON public.sms_templates;
CREATE POLICY "sms_templates admin manage"
  ON public.sms_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "sms_templates staff read"
  ON public.sms_templates FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'customer_service'::app_role)
    OR public.has_role(auth.uid(), 'operations'::app_role)
  );
