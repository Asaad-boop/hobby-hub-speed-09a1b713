
-- Add 4-pcs combo image to product gallery, then add Pack Size variants for the hair claw clip product
DO $$
DECLARE
  pid uuid := 'a33feefc-78e8-4b0c-b663-bb3c3ace8f37';
  type_id uuid;
  v3_id uuid;
  v4_id uuid;
  var3_id uuid;
  var4_id uuid;
  img_3pcs text := '/products/hair-claw-combo-3pcs.png';
  img_4pcs text := '/products/hair-claw-combo-4pcs.png';
BEGIN
  -- Append the two combo images to gallery if not already there
  UPDATE products
     SET gallery = gallery
                   || CASE WHEN gallery::jsonb @> to_jsonb(img_3pcs) THEN '[]'::jsonb ELSE jsonb_build_array(img_3pcs) END
                   || CASE WHEN gallery::jsonb @> to_jsonb(img_4pcs) THEN '[]'::jsonb ELSE jsonb_build_array(img_4pcs) END
   WHERE id = pid;

  -- Create option type "Pack Size"
  INSERT INTO product_option_types (product_id, name, display_order)
  VALUES (pid, 'Pack Size', 0)
  RETURNING id INTO type_id;

  -- Option values
  INSERT INTO product_option_values (option_type_id, value, display_order)
  VALUES (type_id, '3 PCS Combo', 0) RETURNING id INTO v3_id;

  INSERT INTO product_option_values (option_type_id, value, display_order)
  VALUES (type_id, '4 PCS Combo', 1) RETURNING id INTO v4_id;

  -- Variants
  INSERT INTO product_variants (product_id, sku, price_override, stock, image, is_active, display_order)
  VALUES (pid, 'HCC-COMBO-3', 490, 50, img_3pcs, true, 0)
  RETURNING id INTO var3_id;

  INSERT INTO product_variants (product_id, sku, price_override, stock, image, is_active, display_order)
  VALUES (pid, 'HCC-COMBO-4', 590, 50, img_4pcs, true, 1)
  RETURNING id INTO var4_id;

  -- Link variants to values
  INSERT INTO product_variant_values (variant_id, option_value_id) VALUES (var3_id, v3_id);
  INSERT INTO product_variant_values (variant_id, option_value_id) VALUES (var4_id, v4_id);
END $$;
