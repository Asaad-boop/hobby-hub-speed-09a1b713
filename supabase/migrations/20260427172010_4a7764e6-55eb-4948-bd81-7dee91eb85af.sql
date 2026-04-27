-- Add images column to reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';

-- Create public review-images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read review images
DROP POLICY IF EXISTS "Review images public read" ON storage.objects;
CREATE POLICY "Review images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'review-images');

-- Anyone can upload review images
DROP POLICY IF EXISTS "Anyone upload review images" ON storage.objects;
CREATE POLICY "Anyone upload review images"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'review-images');

-- Admins can delete review images
DROP POLICY IF EXISTS "Admins delete review images" ON storage.objects;
CREATE POLICY "Admins delete review images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'review-images' AND has_role(auth.uid(), 'admin'::app_role));