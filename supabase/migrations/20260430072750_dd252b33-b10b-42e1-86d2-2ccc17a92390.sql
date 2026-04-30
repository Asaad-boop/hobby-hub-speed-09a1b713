-- Drop duplicate trigger that causes "tuple already modified" error
DROP TRIGGER IF EXISTS trg_order_status_change ON public.orders;

-- Also drop duplicate updated_at triggers to keep things clean
DROP TRIGGER IF EXISTS set_updated_at ON public.orders;
DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;

-- Make finalize_order_on_confirm a no-op-on-self-row to avoid recursive update on the same row
-- The BEFORE trigger already assigns NEW.confirmed_at and NEW.verified_at directly, so we don't
-- need to UPDATE the same row again. Keep function for backward-compat callers.
CREATE OR REPLACE FUNCTION public.finalize_order_on_confirm(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- No-op: timestamps are set directly in the BEFORE UPDATE trigger handle_order_status_change.
  -- Updating the same row here would raise "tuple to be updated was already modified".
  RETURN;
END;
$function$;