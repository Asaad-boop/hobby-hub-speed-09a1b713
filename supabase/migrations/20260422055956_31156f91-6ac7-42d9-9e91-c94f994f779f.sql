INSERT INTO public.integrations (name, provider, is_enabled, config)
VALUES ('bd_courier', 'bdcourier', true, '{"cache_hours": 24}'::jsonb)
ON CONFLICT (name) DO UPDATE SET is_enabled = true;