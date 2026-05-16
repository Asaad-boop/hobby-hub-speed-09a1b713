
ALTER TABLE public.orders DROP COLUMN IF EXISTS shipment_id;
DROP TABLE IF EXISTS public.courier_shipments CASCADE;
DROP TABLE IF EXISTS public.courier_stats_cache CASCADE;
DROP TABLE IF EXISTS public.integration_logs CASCADE;
DROP TABLE IF EXISTS public.integrations CASCADE;
DROP TABLE IF EXISTS public.fraud_checks CASCADE;
DROP TYPE IF EXISTS public.shipment_status CASCADE;
DROP TYPE IF EXISTS public.courier_provider CASCADE;
DROP TYPE IF EXISTS public.delivery_zone CASCADE;
DROP TYPE IF EXISTS public.fraud_risk_level CASCADE;
