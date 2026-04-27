-- Per-staff granular permissions
CREATE TABLE IF NOT EXISTS public.staff_permissions (
  user_id uuid PRIMARY KEY,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "admins manage staff permissions"
  ON public.staff_permissions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users can read their own permissions
CREATE POLICY "users read own permissions"
  ON public.staff_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER trg_staff_permissions_updated_at
  BEFORE UPDATE ON public.staff_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: check granular permission (admin always returns true)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::public.app_role)
    OR COALESCE(
      (SELECT (permissions ->> _permission)::boolean
         FROM public.staff_permissions
        WHERE user_id = _user_id),
      false
    );
$$;