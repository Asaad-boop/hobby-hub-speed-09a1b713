-- Fix order status change trigger: switch from BEFORE to AFTER UPDATE to avoid
-- "tuple already modified" errors when updating the same row.

DROP TRIGGER IF EXISTS trg_log_order_status_change ON public.orders;

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.activity_logs (order_id, user_id, action, old_value, new_value)
    VALUES (
      NEW.id,
      auth.uid(),
      'status_changed',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;

  IF NEW.confirmation_status IS DISTINCT FROM OLD.confirmation_status THEN
    INSERT INTO public.activity_logs (order_id, user_id, action, old_value, new_value)
    VALUES (
      NEW.id,
      auth.uid(),
      'confirmation_changed',
      jsonb_build_object('confirmation_status', OLD.confirmation_status),
      jsonb_build_object('confirmation_status', NEW.confirmation_status)
    );
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_log_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_status_change();