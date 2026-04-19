-- ORDERS
CREATE TYPE public.order_status AS ENUM ('pending','processing','shipped','delivered','cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  shipping_name TEXT,
  shipping_phone TEXT,
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_district TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own orders" ON public.orders FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_orders_user ON public.orders(user_id, created_at DESC);

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own order items" ON public.order_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own order items" ON public.order_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own order items" ON public.order_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own order items" ON public.order_items FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- ADDRESSES
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  postal_code TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own addresses" ON public.addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own addresses" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own addresses" ON public.addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own addresses" ON public.addresses FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER addresses_updated_at BEFORE UPDATE ON public.addresses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_addresses_user ON public.addresses(user_id);