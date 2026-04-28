-- Remove BD Courier integration completely
DROP TABLE IF EXISTS public.courier_stats_cache CASCADE;
DELETE FROM public.integrations WHERE name = 'bd_courier' OR provider = 'bdcourier';