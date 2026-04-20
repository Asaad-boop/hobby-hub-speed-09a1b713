-- Version history for homepage builder
CREATE TABLE public.homepage_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sections JSONB NOT NULL,
  label TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_homepage_versions_created_at ON public.homepage_versions (created_at DESC);

ALTER TABLE public.homepage_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins view homepage versions"
  ON public.homepage_versions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins insert homepage versions"
  ON public.homepage_versions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins delete homepage versions"
  ON public.homepage_versions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Trim to last 10 versions automatically
CREATE OR REPLACE FUNCTION public.trim_homepage_versions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.homepage_versions
  WHERE id IN (
    SELECT id FROM public.homepage_versions
    ORDER BY created_at DESC
    OFFSET 10
  );
  RETURN NULL;
END;
$$;

CREATE TRIGGER trim_homepage_versions_trigger
AFTER INSERT ON public.homepage_versions
FOR EACH STATEMENT
EXECUTE FUNCTION public.trim_homepage_versions();