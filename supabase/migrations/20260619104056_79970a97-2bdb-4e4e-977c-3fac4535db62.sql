
-- Helper to check if user is any kind of staff (not a customer)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role <> 'customer'::app_role
  )
$$;

-- Restrict brands SELECT to staff only (settings jsonb may contain sensitive config)
DROP POLICY IF EXISTS "Authenticated users view brands" ON public.brands;
CREATE POLICY "Staff view brands"
  ON public.brands
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Restrict PO sequence reads to staff only
DROP POLICY IF EXISTS "Staff read po seq" ON public.imp_po_sequences;
CREATE POLICY "Staff read po seq"
  ON public.imp_po_sequences
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));
