-- Add videos column to reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS videos TEXT[] NOT NULL DEFAULT '{}'::text[];

-- Create review-videos public bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-videos', 'review-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for review-videos: public read, anyone can upload
DO $$ BEGIN
  CREATE POLICY "review-videos public read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'review-videos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "review-videos anyone upload"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'review-videos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "review-videos admin delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'review-videos' AND public.has_role(auth.uid(), 'admin'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;