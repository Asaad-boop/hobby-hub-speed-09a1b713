INSERT INTO public.products (slug, title, description, price, old_price, image, gallery, stock, is_active, is_featured, rating, reviews, shipping_fee_inside, shipping_fee_outside)
VALUES (
  'flower-pearl-curtain-buckle',
  'Flower Pearl Curtain Buckle',
  'Decorative magnetic curtain tieback with soft fabric flower and pearl accent.',
  549,
  799,
  '/curtain-buckle-cover.webp',
  '["/curtain-buckle-cover.webp"]'::jsonb,
  500,
  true,
  false,
  4.9,
  248,
  70,
  130
) ON CONFLICT (slug) DO NOTHING;