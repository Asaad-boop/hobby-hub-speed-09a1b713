
CREATE UNIQUE INDEX IF NOT EXISTS uniq_orders_tracking_number
  ON public.orders (tracking_number)
  WHERE tracking_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_courier_shipments_order_provider
  ON public.courier_shipments (order_id, provider);
