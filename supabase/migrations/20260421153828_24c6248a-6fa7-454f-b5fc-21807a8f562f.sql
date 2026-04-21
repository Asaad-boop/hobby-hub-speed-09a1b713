
-- ============================================================
-- PART 1: DATA WIPE
-- ============================================================
DELETE FROM public.order_items;
DELETE FROM public.order_financials;
DELETE FROM public.transactions;
DELETE FROM public.courier_shipments;
DELETE FROM public.stock_movements;
DELETE FROM public.returns_exchanges;
DELETE FROM public.damaged_inventory;
DELETE FROM public.ad_spend_entries;
DELETE FROM public.ad_campaigns;
DELETE FROM public.coupon_usage;
DELETE FROM public.reviews;
DELETE FROM public.orders;
DELETE FROM public.products;
DELETE FROM public.categories;
UPDATE public.cash_accounts SET current_balance = 0;
UPDATE public.profiles SET admin_notes = NULL;

-- ============================================================
-- PART 5: ENUMS + COLUMNS
-- ============================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'packer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'incomplete';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method text DEFAULT 'pathao',
  ADD COLUMN IF NOT EXISTS shipping_note text,
  ADD COLUMN IF NOT EXISTS source_website text DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS source_platform text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS latest_note text,
  ADD COLUMN IF NOT EXISTS auto_call_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS merchant_ip_address text,
  ADD COLUMN IF NOT EXISTS customer_ip_address text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS packaged_at timestamptz,
  ADD COLUMN IF NOT EXISTS packaged_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_orders int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_segment text DEFAULT 'new';

-- Extend handle_order_status_change to set timestamps
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (OLD.status = 'new'::public.order_status
      AND NEW.status = 'confirmed'::public.order_status) THEN
    PERFORM public.reserve_stock(NEW.id);
    PERFORM public.finalize_order_on_confirm(NEW.id);
    NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
    NEW.verified_at := COALESCE(NEW.verified_at, now());
  END IF;

  IF (NEW.status IN ('cancelled'::public.order_status, 'fake'::public.order_status)
      AND OLD.status IN (
        'confirmed'::public.order_status, 'packaging'::public.order_status,
        'packed'::public.order_status, 'ready_to_ship'::public.order_status
      )) THEN
    PERFORM public.release_stock(NEW.id);
  END IF;

  IF NEW.status = 'packaging'::public.order_status AND OLD.status <> 'packaging'::public.order_status THEN
    NEW.packaged_at := COALESCE(NEW.packaged_at, now());
  END IF;
  IF NEW.status = 'shipped'::public.order_status AND OLD.status <> 'shipped'::public.order_status THEN
    NEW.shipped_at := COALESCE(NEW.shipped_at, now());
  END IF;
  IF NEW.status = 'delivered'::public.order_status AND OLD.status <> 'delivered'::public.order_status THEN
    NEW.delivered_at := COALESCE(NEW.delivered_at, now());
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- PART 6: BD LOCATION HIERARCHY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bd_cities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en text NOT NULL,
  name_bn text,
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bd_zones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id uuid NOT NULL REFERENCES public.bd_cities(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_bn text,
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bd_areas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id uuid NOT NULL REFERENCES public.bd_zones(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_bn text,
  postal_code text,
  pathao_zone_id text,
  pathao_area_id text,
  delivery_charge_pathao numeric(12,2) DEFAULT 60,
  delivery_charge_steadfast numeric(12,2) DEFAULT 60,
  delivery_charge_redx numeric(12,2) DEFAULT 60,
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bd_zones_city ON public.bd_zones(city_id);
CREATE INDEX IF NOT EXISTS idx_bd_areas_zone ON public.bd_areas(zone_id);

ALTER TABLE public.bd_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bd_zones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bd_areas  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bd_cities public read" ON public.bd_cities;
CREATE POLICY "bd_cities public read" ON public.bd_cities FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "bd_cities admin write" ON public.bd_cities;
CREATE POLICY "bd_cities admin write" ON public.bd_cities FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "bd_zones public read" ON public.bd_zones;
CREATE POLICY "bd_zones public read" ON public.bd_zones FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "bd_zones admin write" ON public.bd_zones;
CREATE POLICY "bd_zones admin write" ON public.bd_zones FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "bd_areas public read" ON public.bd_areas;
CREATE POLICY "bd_areas public read" ON public.bd_areas FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "bd_areas admin write" ON public.bd_areas;
CREATE POLICY "bd_areas admin write" ON public.bd_areas FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_city_id uuid REFERENCES public.bd_cities(id),
  ADD COLUMN IF NOT EXISTS delivery_zone_id uuid REFERENCES public.bd_zones(id),
  ADD COLUMN IF NOT EXISTS delivery_area_id uuid REFERENCES public.bd_areas(id);

-- Seed cities
INSERT INTO public.bd_cities (name_en, name_bn, display_order) VALUES
('Dhaka','ঢাকা',1),('Chittagong','চট্টগ্রাম',2),('Khulna','খুলনা',3),
('Sylhet','সিলেট',4),('Rajshahi','রাজশাহী',5),('Barisal','বরিশাল',6),
('Rangpur','রংপুর',7),('Mymensingh','ময়মনসিংহ',8),('Comilla','কুমিল্লা',9),
('Narayanganj','নারায়ণগঞ্জ',10),('Gazipur','গাজীপুর',11),('Jessore','যশোর',12),
('Bogra','বগুড়া',13),('Tangail','টাঙ্গাইল',14),('Cox''s Bazar','কক্সবাজার',15)
ON CONFLICT DO NOTHING;

-- Seed zones for Dhaka
DO $seed$
DECLARE
  v_dhaka uuid; v_ctg uuid; v_syl uuid; v_khulna uuid; v_raj uuid; v_bar uuid;
  v_rang uuid; v_mym uuid; v_com uuid; v_nar uuid; v_gaz uuid; v_jes uuid;
  v_bog uuid; v_tan uuid; v_cox uuid;
  v_zone uuid;
BEGIN
  SELECT id INTO v_dhaka FROM public.bd_cities WHERE name_en='Dhaka';
  SELECT id INTO v_ctg   FROM public.bd_cities WHERE name_en='Chittagong';
  SELECT id INTO v_syl   FROM public.bd_cities WHERE name_en='Sylhet';
  SELECT id INTO v_khulna FROM public.bd_cities WHERE name_en='Khulna';
  SELECT id INTO v_raj   FROM public.bd_cities WHERE name_en='Rajshahi';
  SELECT id INTO v_bar   FROM public.bd_cities WHERE name_en='Barisal';
  SELECT id INTO v_rang  FROM public.bd_cities WHERE name_en='Rangpur';
  SELECT id INTO v_mym   FROM public.bd_cities WHERE name_en='Mymensingh';
  SELECT id INTO v_com   FROM public.bd_cities WHERE name_en='Comilla';
  SELECT id INTO v_nar   FROM public.bd_cities WHERE name_en='Narayanganj';
  SELECT id INTO v_gaz   FROM public.bd_cities WHERE name_en='Gazipur';
  SELECT id INTO v_jes   FROM public.bd_cities WHERE name_en='Jessore';
  SELECT id INTO v_bog   FROM public.bd_cities WHERE name_en='Bogra';
  SELECT id INTO v_tan   FROM public.bd_cities WHERE name_en='Tangail';
  SELECT id INTO v_cox   FROM public.bd_cities WHERE name_en='Cox''s Bazar';

  -- Skip if zones already seeded
  IF NOT EXISTS (SELECT 1 FROM public.bd_zones WHERE city_id = v_dhaka) THEN
    -- Dhaka zones
    INSERT INTO public.bd_zones (city_id, name_en) VALUES
    (v_dhaka,'Dhanmondi'),(v_dhaka,'Gulshan'),(v_dhaka,'Banani'),(v_dhaka,'Uttara'),
    (v_dhaka,'Mirpur'),(v_dhaka,'Mohammadpur'),(v_dhaka,'Bashundhara'),(v_dhaka,'Old Dhaka'),
    (v_dhaka,'Motijheel'),(v_dhaka,'Wari'),(v_dhaka,'Khilgaon'),(v_dhaka,'Rampura'),
    (v_dhaka,'Tejgaon'),(v_dhaka,'Savar'),(v_dhaka,'Mohakhali'),(v_dhaka,'Dhaka Cantonment'),
    (v_dhaka,'Badda'),(v_dhaka,'Aftabnagar'),(v_dhaka,'Niketon'),(v_dhaka,'Lalmatia');

    INSERT INTO public.bd_zones (city_id, name_en) VALUES
    (v_ctg,'Agrabad'),(v_ctg,'GEC'),(v_ctg,'Halishahar'),(v_ctg,'Pahartali'),(v_ctg,'Chandgaon'),(v_ctg,'Bayezid'),
    (v_syl,'Zindabazar'),(v_syl,'Ambarkhana'),(v_syl,'Subidbazar'),(v_syl,'Shibganj'),
    (v_khulna,'Khalishpur'),(v_khulna,'Daulatpur'),(v_khulna,'Sonadanga'),
    (v_raj,'Boalia'),(v_raj,'Motihar'),(v_raj,'Rajpara'),
    (v_bar,'Barisal Sadar'),(v_bar,'Kawnia'),(v_bar,'Bandar'),
    (v_rang,'Rangpur Sadar'),(v_rang,'Mahiganj'),(v_rang,'Lalbagh'),
    (v_mym,'Mymensingh Sadar'),(v_mym,'Trishal'),(v_mym,'Bhaluka'),
    (v_com,'Cumilla Sadar'),(v_com,'Kotbari'),(v_com,'Daudkandi'),
    (v_nar,'Narayanganj Sadar'),(v_nar,'Fatullah'),(v_nar,'Siddhirganj'),
    (v_gaz,'Gazipur Sadar'),(v_gaz,'Tongi'),(v_gaz,'Kaliakair'),
    (v_jes,'Jessore Sadar'),(v_jes,'Benapole'),(v_jes,'Jhikargachha'),
    (v_bog,'Bogra Sadar'),(v_bog,'Sherpur'),(v_bog,'Shibganj'),
    (v_tan,'Tangail Sadar'),(v_tan,'Mirzapur'),(v_tan,'Kalihati'),
    (v_cox,'Cox Sadar'),(v_cox,'Teknaf'),(v_cox,'Ukhia');
  END IF;

  -- Seed sample areas if not present
  IF NOT EXISTS (SELECT 1 FROM public.bd_areas) THEN
    -- Dhanmondi
    SELECT id INTO v_zone FROM public.bd_zones WHERE name_en='Dhanmondi' AND city_id=v_dhaka;
    INSERT INTO public.bd_areas (zone_id, name_en, postal_code) VALUES
    (v_zone,'Dhanmondi R/A','1205'),(v_zone,'Kalabagan','1205'),(v_zone,'Jigatola','1209');

    SELECT id INTO v_zone FROM public.bd_zones WHERE name_en='Gulshan' AND city_id=v_dhaka;
    INSERT INTO public.bd_areas (zone_id, name_en, postal_code) VALUES
    (v_zone,'Gulshan 1','1212'),(v_zone,'Gulshan 2','1212'),(v_zone,'Baridhara','1212');

    SELECT id INTO v_zone FROM public.bd_zones WHERE name_en='Banani' AND city_id=v_dhaka;
    INSERT INTO public.bd_areas (zone_id, name_en, postal_code) VALUES
    (v_zone,'Banani Block A','1213'),(v_zone,'Banani Block B','1213'),(v_zone,'Banani DOHS','1206');

    SELECT id INTO v_zone FROM public.bd_zones WHERE name_en='Uttara' AND city_id=v_dhaka;
    INSERT INTO public.bd_areas (zone_id, name_en, postal_code) VALUES
    (v_zone,'Uttara Sector 3','1230'),(v_zone,'Uttara Sector 7','1230'),(v_zone,'Uttara Sector 10','1230');

    SELECT id INTO v_zone FROM public.bd_zones WHERE name_en='Mirpur' AND city_id=v_dhaka;
    INSERT INTO public.bd_areas (zone_id, name_en, postal_code) VALUES
    (v_zone,'Mirpur 1','1216'),(v_zone,'Mirpur 10','1216'),(v_zone,'Mirpur DOHS','1216');

    -- For all remaining zones, add 2 default areas
    INSERT INTO public.bd_areas (zone_id, name_en, postal_code, delivery_charge_pathao, delivery_charge_steadfast, delivery_charge_redx)
    SELECT z.id, z.name_en || ' Main', NULL,
      CASE WHEN z.city_id = v_dhaka THEN 60 ELSE 120 END,
      CASE WHEN z.city_id = v_dhaka THEN 60 ELSE 130 END,
      CASE WHEN z.city_id = v_dhaka THEN 60 ELSE 110 END
    FROM public.bd_zones z
    WHERE NOT EXISTS (SELECT 1 FROM public.bd_areas a WHERE a.zone_id = z.id);

    INSERT INTO public.bd_areas (zone_id, name_en, postal_code, delivery_charge_pathao, delivery_charge_steadfast, delivery_charge_redx)
    SELECT z.id, z.name_en || ' East', NULL,
      CASE WHEN z.city_id = v_dhaka THEN 60 ELSE 120 END,
      CASE WHEN z.city_id = v_dhaka THEN 60 ELSE 130 END,
      CASE WHEN z.city_id = v_dhaka THEN 60 ELSE 110 END
    FROM public.bd_zones z
    WHERE (SELECT count(*) FROM public.bd_areas a WHERE a.zone_id = z.id) < 2;
  END IF;
END
$seed$;

-- ============================================================
-- PART 7: ATTRIBUTION + ACTIVITY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_attribution (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  source text,
  utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
  meta_ad_account_id text, meta_ad_account_name text,
  meta_campaign_id text, meta_campaign_name text,
  meta_adset_id text, meta_adset_name text,
  meta_ad_id text, meta_ad_name text,
  fbclid text, gclid text,
  facebook_click_id text, facebook_browser_pixel text,
  device_type text, referrer text, entry_url text, landing_page text,
  ip_address text, user_agent text, country text, city text,
  captured_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attr_source ON public.order_attribution(source);
CREATE INDEX IF NOT EXISTS idx_attr_campaign ON public.order_attribution(meta_campaign_id);
ALTER TABLE public.order_attribution ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attr staff read" ON public.order_attribution;
CREATE POLICY "attr staff read" ON public.order_attribution FOR SELECT USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'customer_service')
);
DROP POLICY IF EXISTS "attr authenticated insert" ON public.order_attribution;
CREATE POLICY "attr authenticated insert" ON public.order_attribution FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "attr guest insert" ON public.order_attribution;
CREATE POLICY "attr guest insert" ON public.order_attribution FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_attribution.order_id AND o.is_guest_order = true)
);

CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON public.activity_log(entity_type, entity_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_performer ON public.activity_log(performed_by, performed_at DESC);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity staff read" ON public.activity_log;
CREATE POLICY "activity staff read" ON public.activity_log FOR SELECT USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'customer_service') OR public.has_role(auth.uid(),'operations')
);
DROP POLICY IF EXISTS "activity authenticated insert" ON public.activity_log;
CREATE POLICY "activity authenticated insert" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.log_order_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (entity_type, entity_id, action, details, performed_by)
    VALUES ('order', NEW.id, 'ORDER_CREATED', jsonb_build_object('total', NEW.total, 'status', NEW.status), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.activity_log (entity_type, entity_id, action, details, performed_by)
      VALUES ('order', NEW.id, 'STATUS_CHANGED', jsonb_build_object('from', OLD.status, 'to', NEW.status), auth.uid());
    END IF;
    IF OLD.confirmation_status IS DISTINCT FROM NEW.confirmation_status THEN
      INSERT INTO public.activity_log (entity_type, entity_id, action, details, performed_by)
      VALUES ('order', NEW.id, 'CONFIRMATION_CHANGED', jsonb_build_object('from', OLD.confirmation_status, 'to', NEW.confirmation_status), auth.uid());
    END IF;
    IF OLD.admin_notes IS DISTINCT FROM NEW.admin_notes AND NEW.admin_notes IS NOT NULL THEN
      INSERT INTO public.activity_log (entity_type, entity_id, action, details, performed_by)
      VALUES ('order', NEW.id, 'NOTE_ADDED', jsonb_build_object('note', LEFT(NEW.admin_notes, 200)), auth.uid());
    END IF;
    IF OLD.call_attempt_count < NEW.call_attempt_count THEN
      INSERT INTO public.activity_log (entity_type, entity_id, action, details, performed_by)
      VALUES ('order', NEW.id, 'CALL_LOGGED', jsonb_build_object('status', NEW.call_status, 'attempt', NEW.call_attempt_count), auth.uid());
    END IF;
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.activity_log (entity_type, entity_id, action, details, performed_by)
      VALUES ('order', NEW.id, 'ASSIGNED', jsonb_build_object('to', NEW.assigned_to), auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_order_activity ON public.orders;
CREATE TRIGGER trg_log_order_activity
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_activity();

CREATE OR REPLACE FUNCTION public.log_order_view(p_order_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.activity_log (entity_type, entity_id, action, performed_by)
  VALUES ('order', p_order_id, 'ORDER_VIEWED', auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.log_order_view(uuid) TO authenticated;

-- ============================================================
-- PART 8: HELPER FUNCTIONS + STATS TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_customer_courier_stats(p_phone text)
RETURNS TABLE(courier text, total bigint, success bigint, cancelled bigint, success_rate numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cs.provider::text,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE cs.status = 'delivered')::bigint,
    COUNT(*) FILTER (WHERE cs.status IN ('cancelled','returned','damaged','lost'))::bigint,
    ROUND(COUNT(*) FILTER (WHERE cs.status = 'delivered')::numeric * 100 / NULLIF(COUNT(*), 0), 1)
  FROM public.courier_shipments cs
  JOIN public.orders o ON o.id = cs.order_id
  WHERE o.shipping_phone = p_phone
  GROUP BY cs.provider
  UNION ALL
  SELECT 'overall'::text,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE cs.status = 'delivered')::bigint,
    COUNT(*) FILTER (WHERE cs.status IN ('cancelled','returned','damaged','lost'))::bigint,
    ROUND(COUNT(*) FILTER (WHERE cs.status = 'delivered')::numeric * 100 / NULLIF(COUNT(*), 0), 1)
  FROM public.courier_shipments cs
  JOIN public.orders o ON o.id = cs.order_id
  WHERE o.shipping_phone = p_phone;
$$;
GRANT EXECUTE ON FUNCTION public.get_customer_courier_stats(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_customer_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_orders', COUNT(*),
    'total_spent', COALESCE(SUM(total), 0),
    'avg_order_value', COALESCE(AVG(total), 0),
    'first_order_date', MIN(created_at),
    'last_order_date', MAX(created_at),
    'delivered_orders', COUNT(*) FILTER (WHERE status = 'delivered'),
    'cancelled_orders', COUNT(*) FILTER (WHERE status IN ('cancelled', 'fake')),
    'return_rate', ROUND(COUNT(*) FILTER (WHERE status = 'returned')::numeric * 100 / NULLIF(COUNT(*), 0), 2)
  ) INTO v_result
  FROM public.orders
  WHERE user_id = p_user_id;
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_customer_stats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_profile_order_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'delivered'::public.order_status AND OLD.status <> 'delivered'::public.order_status THEN
    UPDATE public.profiles
    SET total_orders = total_orders + 1,
        total_spent = total_spent + NEW.total,
        customer_segment = CASE
          WHEN total_orders + 1 >= 6 THEN 'vip'
          WHEN total_orders + 1 >= 2 THEN 'regular'
          ELSE 'new'
        END
    WHERE id = NEW.user_id;
  END IF;

  IF NEW.status = 'fake'::public.order_status AND OLD.status <> 'fake'::public.order_status THEN
    UPDATE public.profiles
    SET fake_order_count = fake_order_count + 1,
        is_flagged = CASE WHEN fake_order_count + 1 >= 3 THEN true ELSE is_flagged END,
        flag_reason = CASE WHEN fake_order_count + 1 >= 3 THEN 'Auto-flagged: 3+ fake orders' ELSE flag_reason END
    WHERE id = NEW.user_id;
  END IF;

  IF NEW.status = 'cancelled'::public.order_status AND OLD.status <> 'cancelled'::public.order_status THEN
    UPDATE public.profiles SET cancellation_count = cancellation_count + 1 WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_profile_stats ON public.orders;
CREATE TRIGGER trg_update_profile_stats
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_order_stats();

-- ============================================================
-- PART 9: SMS + CATEGORIES SEED
-- ============================================================
DO $sms_enum$ BEGIN
  CREATE TYPE public.sms_template_type AS ENUM ('reminder','advance','confirmation','shipped','delivered','cancelled','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $sms_enum$;

DO $sms_status_enum$ BEGIN
  CREATE TYPE public.sms_status AS ENUM ('pending','sent','failed','delivered','undelivered');
EXCEPTION WHEN duplicate_object THEN NULL; END $sms_status_enum$;

CREATE TABLE IF NOT EXISTS public.sms_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type public.sms_template_type NOT NULL,
  message_bn text NOT NULL,
  message_en text,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.sms_templates(id) ON DELETE SET NULL,
  recipient_phone text NOT NULL,
  message_sent text NOT NULL,
  status public.sms_status DEFAULT 'pending',
  provider_response jsonb,
  provider_message_id text,
  sent_at timestamptz DEFAULT now(),
  sent_by uuid REFERENCES auth.users(id),
  delivered_at timestamptz,
  error_message text
);
CREATE INDEX IF NOT EXISTS idx_sms_order ON public.sms_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_sms_status ON public.sms_logs(status);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_templates staff manage" ON public.sms_templates;
CREATE POLICY "sms_templates staff manage" ON public.sms_templates FOR ALL USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'customer_service')
) WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'customer_service')
);

DROP POLICY IF EXISTS "sms_logs staff manage" ON public.sms_logs;
CREATE POLICY "sms_logs staff manage" ON public.sms_logs FOR ALL USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'customer_service')
) WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'customer_service')
);

DROP TRIGGER IF EXISTS trg_sms_templates_updated_at ON public.sms_templates;
CREATE TRIGGER trg_sms_templates_updated_at BEFORE UPDATE ON public.sms_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.sms_templates (name, type, message_bn, variables) VALUES
('Default Reminder','reminder','প্রিয় {{name}}, আপনার অর্ডার #{{order_id}} কনফার্ম করতে চাইলে আমাদের কল করুন: {{phone}}। ধন্যবাদ, HobbyShop।','["name","order_id","phone"]'::jsonb),
('Default Advance Payment','advance','প্রিয় {{name}}, আপনার অর্ডার #{{order_id}} এর জন্য ৳{{amount}} এডভান্স bKash: {{bkash}} এ পাঠান। ধন্যবাদ।','["name","order_id","amount","bkash"]'::jsonb),
('Order Confirmed','confirmation','আপনার অর্ডার #{{order_id}} কনফার্ম হয়েছে। ডেলিভারি: ২৪-৪৮ ঘন্টা। ধন্যবাদ HobbyShop থেকে।','["order_id"]'::jsonb),
('Order Shipped','shipped','আপনার অর্ডার #{{order_id}} কুরিয়ারে পাঠানো হয়েছে। Tracking: {{tracking_id}}। {{courier}} এর মাধ্যমে আসছে।','["order_id","tracking_id","courier"]'::jsonb),
('Order Delivered','delivered','ধন্যবাদ! আপনার অর্ডার #{{order_id}} ডেলিভারি সম্পন্ন। Review দিতে ভুলবেন না। HobbyShop।','["order_id"]'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (name, slug, description, display_order, is_active) VALUES
('Home Decor','home-decor','Beautiful items for your home',1,true),
('Kitchen & Home','kitchen-home','Essentials for everyday use',2,true),
('Gadgets & Tech','gadgets-tech','Latest gadgets and tech',3,true),
('DIY & Hobby Kits','diy-hobby','Creative DIY projects',4,true),
('Gift Items','gift-items','Perfect gifts for loved ones',5,true),
('Kids & Toys','kids-toys','Fun for children',6,true),
('Smart Products','smart-products','Smart home and lifestyle',7,true),
('Lighting','lighting','Decorative and functional lighting',8,true)
ON CONFLICT (slug) DO NOTHING;
