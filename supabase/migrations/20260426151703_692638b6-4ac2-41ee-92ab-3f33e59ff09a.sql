-- Drop finance, expenses, returns, sms tables (and any related enums)
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.product_costs CASCADE;
DROP TABLE IF EXISTS public.returns_exchanges CASCADE;
DROP TABLE IF EXISTS public.sms_logs CASCADE;
DROP TABLE IF EXISTS public.sms_templates CASCADE;

-- Drop unused enums
DROP TYPE IF EXISTS public.transaction_type CASCADE;
DROP TYPE IF EXISTS public.transaction_category CASCADE;
DROP TYPE IF EXISTS public.transaction_direction CASCADE;
DROP TYPE IF EXISTS public.transaction_reference_type CASCADE;
DROP TYPE IF EXISTS public.return_type CASCADE;
DROP TYPE IF EXISTS public.sms_status CASCADE;
DROP TYPE IF EXISTS public.sms_template_type CASCADE;