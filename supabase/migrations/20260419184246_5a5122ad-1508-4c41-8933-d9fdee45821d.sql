-- Create public bucket for reel videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('reel-videos', 'reel-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "reel videos public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'reel-videos');

-- Admins can upload
CREATE POLICY "admins upload reel videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'reel-videos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can update
CREATE POLICY "admins update reel videos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'reel-videos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can delete
CREATE POLICY "admins delete reel videos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'reel-videos' AND public.has_role(auth.uid(), 'admin'::public.app_role));