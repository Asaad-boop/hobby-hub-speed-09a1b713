-- Add Meta Pixel + CAPI configuration to site_settings (key/value pattern)
-- First check the existing structure of site_settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='site_settings') THEN
    CREATE TABLE public.site_settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by uuid
    );
    ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "site_settings public read"
      ON public.site_settings FOR SELECT
      USING (true);

    CREATE POLICY "site_settings admin write"
      ON public.site_settings FOR ALL
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Seed Meta Pixel settings rows (only if missing)
INSERT INTO public.site_settings (key, value)
VALUES
  ('meta_pixel_id', '{"value": ""}'::jsonb),
  ('meta_pixel_enabled', '{"value": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
