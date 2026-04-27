-- Enable pg_net for HTTP calls from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: call edge function on new order
CREATE OR REPLACE FUNCTION public.notify_telegram_on_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://bgsspipkjeuceftuatue.supabase.co/functions/v1/notify-order-telegram',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('order_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block order creation if notification fails
  RAISE WARNING 'Telegram notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_telegram_on_new_order ON public.orders;

CREATE TRIGGER trg_notify_telegram_on_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_telegram_on_new_order();