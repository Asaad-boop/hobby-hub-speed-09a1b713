-- ============================================================
-- China Sourcing Module
-- ============================================================

-- Status enum for shipments
DO $$ BEGIN
  CREATE TYPE public.china_shipment_status AS ENUM (
    'draft',
    'ordered',
    'in_transit',
    'customs',
    'received',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ------------------------------------------------------------
-- china_shipments (header)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.china_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no text NOT NULL UNIQUE,
  supplier_name text,
  supplier_contact text,
  status public.china_shipment_status NOT NULL DEFAULT 'draft',

  -- Dates
  order_date date,
  shipped_date date,
  arrival_date date,
  received_date date,

  -- FX
  cny_amount numeric(14,2) NOT NULL DEFAULT 0,
  exchange_rate numeric(10,4) NOT NULL DEFAULT 0, -- 1 CNY = X BDT

  -- Cost breakdown (all in BDT)
  product_cost_bdt numeric(14,2) NOT NULL DEFAULT 0,        -- cny_amount * exchange_rate
  international_shipping numeric(14,2) NOT NULL DEFAULT 0,
  customs_duty numeric(14,2) NOT NULL DEFAULT 0,
  local_transport numeric(14,2) NOT NULL DEFAULT 0,
  other_costs numeric(14,2) NOT NULL DEFAULT 0,

  -- Totals (computed via trigger to keep simple)
  total_landed_cost numeric(14,2) NOT NULL DEFAULT 0,
  total_quantity integer NOT NULL DEFAULT 0,
  per_unit_landed_cost numeric(14,4) NOT NULL DEFAULT 0,

  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_china_shipments_status ON public.china_shipments(status);
CREATE INDEX IF NOT EXISTS idx_china_shipments_arrival ON public.china_shipments(arrival_date DESC);

-- ------------------------------------------------------------
-- china_shipment_items (line items)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.china_shipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.china_shipments(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,

  product_name_snapshot text NOT NULL, -- so we keep the name even if product is deleted
  quantity integer NOT NULL DEFAULT 0,
  cny_unit_price numeric(12,4) NOT NULL DEFAULT 0,

  -- Allocated cost (computed when shipment is finalized)
  allocated_landed_cost numeric(14,4) NOT NULL DEFAULT 0,
  per_unit_landed_cost numeric(14,4) NOT NULL DEFAULT 0,

  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_china_shipment_items_shipment ON public.china_shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_china_shipment_items_product ON public.china_shipment_items(product_id);

-- ------------------------------------------------------------
-- Trigger: keep totals in sync on the header
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalc_china_shipment_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
  v_qty integer;
  v_total numeric(14,2);
BEGIN
  sid := COALESCE(NEW.shipment_id, OLD.shipment_id);

  SELECT COALESCE(SUM(quantity), 0)
    INTO v_qty
    FROM public.china_shipment_items
   WHERE shipment_id = sid;

  -- Total landed cost = product cost + all logistics costs (already in BDT)
  UPDATE public.china_shipments
     SET product_cost_bdt = ROUND(cny_amount * exchange_rate, 2),
         total_quantity = v_qty,
         total_landed_cost = ROUND(
           (cny_amount * exchange_rate)
           + international_shipping + customs_duty
           + local_transport + other_costs, 2
         ),
         per_unit_landed_cost = CASE
           WHEN v_qty > 0 THEN ROUND(
             ((cny_amount * exchange_rate)
              + international_shipping + customs_duty
              + local_transport + other_costs) / v_qty, 4
           )
           ELSE 0
         END,
         updated_at = now()
   WHERE id = sid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_china_shipment_totals_items ON public.china_shipment_items;
CREATE TRIGGER trg_recalc_china_shipment_totals_items
AFTER INSERT OR UPDATE OR DELETE ON public.china_shipment_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_china_shipment_totals();

-- Recalc when header costs change too
CREATE OR REPLACE FUNCTION public.recalc_china_shipment_self()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qty integer;
BEGIN
  SELECT COALESCE(SUM(quantity), 0)
    INTO v_qty
    FROM public.china_shipment_items
   WHERE shipment_id = NEW.id;

  NEW.product_cost_bdt := ROUND(NEW.cny_amount * NEW.exchange_rate, 2);
  NEW.total_quantity := v_qty;
  NEW.total_landed_cost := ROUND(
    NEW.product_cost_bdt + NEW.international_shipping + NEW.customs_duty
    + NEW.local_transport + NEW.other_costs, 2
  );
  NEW.per_unit_landed_cost := CASE
    WHEN v_qty > 0 THEN ROUND(NEW.total_landed_cost / v_qty, 4)
    ELSE 0
  END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_china_shipment_self ON public.china_shipments;
CREATE TRIGGER trg_recalc_china_shipment_self
BEFORE UPDATE OF cny_amount, exchange_rate, international_shipping,
                 customs_duty, local_transport, other_costs
ON public.china_shipments
FOR EACH ROW EXECUTE FUNCTION public.recalc_china_shipment_self();

-- ------------------------------------------------------------
-- When shipment becomes 'received', update product avg_cost / unit_cost
-- weighted-average against existing stock.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_china_shipment_to_products()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  v_per_unit numeric(14,4);
  v_existing_stock integer;
  v_existing_cost numeric(14,4);
  v_new_avg numeric(14,4);
BEGIN
  -- Only fire when transitioning into 'received'
  IF NEW.status = 'received' AND (OLD.status IS DISTINCT FROM 'received') THEN

    -- Allocate landed cost proportionally to each item by CNY value share
    FOR rec IN
      SELECT csi.id, csi.product_id, csi.quantity, csi.cny_unit_price,
             (csi.quantity * csi.cny_unit_price) AS line_cny
        FROM public.china_shipment_items csi
       WHERE csi.shipment_id = NEW.id
    LOOP
      -- per-unit landed cost = (item's share of total landed cost) / qty
      IF NEW.cny_amount > 0 AND rec.quantity > 0 THEN
        v_per_unit := ROUND(
          (rec.line_cny / NEW.cny_amount) * NEW.total_landed_cost / rec.quantity,
          4
        );
      ELSE
        v_per_unit := NEW.per_unit_landed_cost;
      END IF;

      UPDATE public.china_shipment_items
         SET allocated_landed_cost = ROUND(v_per_unit * rec.quantity, 4),
             per_unit_landed_cost = v_per_unit
       WHERE id = rec.id;

      -- Weighted-average update on product
      IF rec.product_id IS NOT NULL THEN
        SELECT stock, COALESCE(avg_cost, 0)
          INTO v_existing_stock, v_existing_cost
          FROM public.products
         WHERE id = rec.product_id;

        IF (v_existing_stock + rec.quantity) > 0 THEN
          v_new_avg := ROUND(
            ((v_existing_stock * v_existing_cost) + (rec.quantity * v_per_unit))
            / (v_existing_stock + rec.quantity), 4
          );
        ELSE
          v_new_avg := v_per_unit;
        END IF;

        UPDATE public.products
           SET stock = stock + rec.quantity,
               avg_cost = v_new_avg,
               unit_cost = v_per_unit, -- latest landed cost
               updated_at = now()
         WHERE id = rec.product_id;
      END IF;
    END LOOP;

    NEW.received_date := COALESCE(NEW.received_date, CURRENT_DATE);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_china_shipment_received ON public.china_shipments;
CREATE TRIGGER trg_apply_china_shipment_received
BEFORE UPDATE OF status ON public.china_shipments
FOR EACH ROW EXECUTE FUNCTION public.apply_china_shipment_to_products();

-- ------------------------------------------------------------
-- updated_at trigger (generic)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_china_shipments_updated_at ON public.china_shipments;
CREATE TRIGGER trg_china_shipments_updated_at
BEFORE UPDATE ON public.china_shipments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.china_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.china_shipment_items ENABLE ROW LEVEL SECURITY;

-- Admins: full control
CREATE POLICY "admins manage china shipments"
ON public.china_shipments FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins manage china shipment items"
ON public.china_shipment_items FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Operations: read-only (to know what stock is incoming)
CREATE POLICY "ops view china shipments"
ON public.china_shipments FOR SELECT
USING (public.has_role(auth.uid(), 'operations'::public.app_role));

CREATE POLICY "ops view china shipment items"
ON public.china_shipment_items FOR SELECT
USING (public.has_role(auth.uid(), 'operations'::public.app_role));