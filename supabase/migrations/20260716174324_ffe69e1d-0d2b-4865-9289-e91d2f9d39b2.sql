
WITH new_ot AS (
  INSERT INTO public.product_option_types (product_id, name, display_order)
  VALUES ('026a1808-24b1-43a9-ab66-c367a39be559', 'Color', 0)
  RETURNING id
),
inserted AS (
  INSERT INTO public.product_option_values (option_type_id, value, swatch_hex, display_order)
  SELECT new_ot.id, v.value, v.hex, v.ord FROM new_ot,
  (VALUES
    ('Yellow', '#F5C518', 0),
    ('Pink',   '#EC4899', 1),
    ('Green',  '#22C55E', 2)
  ) AS v(value, hex, ord)
  RETURNING id, value
)
INSERT INTO public.product_variant_values (variant_id, option_value_id)
SELECT
  CASE i.value
    WHEN 'Yellow' THEN '867dd0b6-00e6-47d4-89f6-1af204f35fce'::uuid
    WHEN 'Pink'   THEN '75e842b5-0d13-4628-bbd4-f48c5fb318c4'::uuid
    WHEN 'Green'  THEN '5f05b104-d05b-4217-8b85-65f631fb3743'::uuid
  END,
  i.id
FROM inserted i;
