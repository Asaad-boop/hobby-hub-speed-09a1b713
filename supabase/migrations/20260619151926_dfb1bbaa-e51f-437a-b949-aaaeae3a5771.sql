
-- Fix active_sessions RLS so guests can upsert their own presence row
-- without requiring an x-session-id request header.
DROP POLICY IF EXISTS "owner insert own session" ON public.active_sessions;
DROP POLICY IF EXISTS "owner update own session" ON public.active_sessions;

CREATE POLICY "anyone insert presence"
  ON public.active_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "anyone update presence"
  ON public.active_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
