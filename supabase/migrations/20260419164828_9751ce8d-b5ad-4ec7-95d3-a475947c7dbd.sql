-- Seed products. image/gallery values are filenames that the client maps to bundled assets.
WITH cats AS (
  SELECT slug, id FROM public.categories
)
INSERT INTO public.products
  (slug, title, description, price, old_price, category_id, image, gallery, benefits, rating, reviews, stock, is_featured, is_new_arrival, display_order)
VALUES
  ('crystal-lamp', 'Sunset Crystal LED Lamp',
   'A premium crystal LED lamp that turns any room into a cozy retreat. Perfect for bedrooms, desks and gifting.',
   1290, 1990,
   (SELECT id FROM cats WHERE slug='home-decor'),
   'p-lamp.jpg',
   '["p-lamp.jpg","p-lamp-2.jpg","p-lamp-3.jpg","p-lamp-4.jpg"]'::jsonb,
   '["Warm ambient light","USB-C rechargeable","Touch control","8h battery"]'::jsonb,
   4.8, 1240, 7, true, false, 1),

  ('magsafe-charger', 'Magnetic Wireless Charger 15W',
   'Snap-on magnetic charging for the cleanest desk setup. Works with most modern phones.',
   890, 1490,
   (SELECT id FROM cats WHERE slug='gadgets'),
   'p-charger.jpg',
   '["p-charger.jpg","p-charger-2.jpg","p-charger-3.jpg","p-charger-4.jpg"]'::jsonb,
   '["15W fast charge","MagSafe compatible","Anti-slip base","Cable included"]'::jsonb,
   4.7, 832, 12, true, false, 2),

  ('mini-speaker', 'Boom Mini Bluetooth Speaker',
   'Pocket-sized speaker with surprisingly big sound. Bring it anywhere.',
   1490, 2290,
   (SELECT id FROM cats WHERE slug='gadgets'),
   'p-speaker.jpg',
   '["p-speaker.jpg","p-speaker-2.jpg","p-speaker-3.jpg","p-speaker-4.jpg"]'::jsonb,
   '["360° sound","12h playtime","IPX5 waterproof","Built-in mic"]'::jsonb,
   4.6, 510, 9, true, false, 3),

  ('diy-kit', 'Wooden Mechanical DIY Kit',
   'Build a working mechanical model with your own hands. Hours of focused fun.',
   1990, 2990,
   (SELECT id FROM cats WHERE slug='diy-kits'),
   'p-diy.jpg',
   '["p-diy.jpg","p-diy-2.jpg","p-diy-3.jpg","p-diy-4.jpg"]'::jsonb,
   '["No glue required","Step-by-step manual","200+ pieces","Great gift"]'::jsonb,
   4.9, 312, 5, true, false, 4),

  ('aroma-diffuser', 'Smart Aroma Diffuser with Light',
   'Fill your space with calming aromas and soft ambient light. Perfect for bedroom & living room.',
   1190, 1790,
   (SELECT id FROM cats WHERE slug='home-decor'),
   'p-diffuser.jpg',
   '["p-diffuser.jpg","p-diffuser-2.jpg","p-diffuser-3.jpg","p-diffuser-4.jpg"]'::jsonb,
   '["7 LED colors","Ultrasonic mist","Auto shut-off","300ml tank"]'::jsonb,
   4.7, 86, 15, false, true, 5),

  ('smart-watch', 'Pro Vivid Smart Watch',
   'A vibrant smartwatch that tracks your fitness, sleep and notifications — all day, every day.',
   2490, 3490,
   (SELECT id FROM cats WHERE slug='gadgets'),
   'p-smartwatch.jpg',
   '["p-smartwatch.jpg","p-smartwatch-2.jpg","p-smartwatch-3.jpg","p-smartwatch-4.jpg"]'::jsonb,
   '["AMOLED display","Heart rate & SpO2","7-day battery","IP68 waterproof"]'::jsonb,
   4.8, 142, 10, false, true, 6),

  ('mini-projector', 'Portable Cinema Mini Projector',
   'Turn any wall into a cinema. Perfect for movie nights, gaming and presentations.',
   4990, 6990,
   (SELECT id FROM cats WHERE slug='gadgets'),
   'p-projector.jpg',
   '["p-projector.jpg","p-projector-2.jpg","p-projector-3.jpg","p-projector-4.jpg"]'::jsonb,
   '["1080p support","HDMI & USB","Built-in speaker","Compact & portable"]'::jsonb,
   4.6, 58, 6, false, true, 7),

  ('ceramic-planter', 'Minimalist Ceramic Planter',
   'Add a touch of green to any corner. Comes with a small live succulent.',
   590, 890,
   (SELECT id FROM cats WHERE slug='home-decor'),
   'p-planter.jpg',
   '["p-planter.jpg","p-planter-2.jpg","p-planter-3.jpg","p-planter-4.jpg"]'::jsonb,
   '["Handcrafted ceramic","Drainage hole","Indoor & outdoor","Plant included"]'::jsonb,
   4.9, 204, 22, false, true, 8);
