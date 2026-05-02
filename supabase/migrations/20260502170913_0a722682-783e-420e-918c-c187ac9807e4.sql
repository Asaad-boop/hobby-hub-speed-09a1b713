UPDATE public.products
SET image = '/products/solar-lamp-1.jpg',
    gallery = '["/products/solar-lamp-1.jpg","/products/solar-lamp-2.jpg","/products/solar-lamp-3.jpg","/products/solar-lamp-4.jpg","https://img.kwcdn.com/product/fancy/38335517-8534-4e6c-972c-1d463baf89d5.jpg"]'::jsonb
WHERE slug = 'solar-rechargeable-interaction-wall-lamp';