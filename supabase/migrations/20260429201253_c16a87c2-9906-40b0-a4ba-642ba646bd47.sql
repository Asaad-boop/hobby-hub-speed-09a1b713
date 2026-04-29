
-- active_sessions: only the matching session_id can update
DROP POLICY IF EXISTS "anyone update own session" ON public.active_sessions;
CREATE POLICY "owner update own session"
ON public.active_sessions
FOR UPDATE
TO anon, authenticated
USING (session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text))
WITH CHECK (session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text));

-- active_sessions: insert must be the caller's own session
DROP POLICY IF EXISTS "anyone insert own session" ON public.active_sessions;
CREATE POLICY "owner insert own session"
ON public.active_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text));

-- abandoned_carts: insert must match own session id (or own user_id)
DROP POLICY IF EXISTS "anyone insert abandoned cart" ON public.abandoned_carts;
CREATE POLICY "owner insert abandoned cart"
ON public.abandoned_carts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  ((user_id IS NULL) AND (session_id IS NOT NULL) AND (session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text)))
  OR ((auth.uid() IS NOT NULL) AND (auth.uid() = user_id))
);
