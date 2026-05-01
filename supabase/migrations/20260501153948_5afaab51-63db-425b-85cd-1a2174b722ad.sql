
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with the same name so this is idempotent
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-pathao-status-15min') THEN
    PERFORM cron.unschedule('sync-pathao-status-15min');
  END IF;
END $$;

SELECT cron.schedule(
  'sync-pathao-status-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--2c26f5f9-694d-40ad-b719-1afc69bb0a15.lovable.app/api/public/hooks/sync-pathao-status',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
