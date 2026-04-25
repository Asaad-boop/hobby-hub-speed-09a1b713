
CREATE TABLE public.active_sessions (
  session_id text PRIMARY KEY,
  path text,
  user_agent text,
  referrer text,
  country text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  first_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_active_sessions_last_seen ON public.active_sessions(last_seen_at DESC);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone insert own session"
  ON public.active_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "anyone update own session"
  ON public.active_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "staff read sessions"
  ON public.active_sessions FOR SELECT
  TO anon, authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'customer_service'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
  );
