-- Allow admins/staff to insert and update active_sessions without x-session-id header
CREATE POLICY "staff insert any session"
ON public.active_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
  OR public.has_role(auth.uid(), 'operations'::public.app_role)
);

CREATE POLICY "staff update any session"
ON public.active_sessions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
  OR public.has_role(auth.uid(), 'operations'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'customer_service'::public.app_role)
  OR public.has_role(auth.uid(), 'operations'::public.app_role)
);