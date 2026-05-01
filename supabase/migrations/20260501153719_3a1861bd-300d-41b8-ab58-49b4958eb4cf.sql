
ALTER TABLE public.courier_shipments
  ADD COLUMN IF NOT EXISTS last_status_text text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
