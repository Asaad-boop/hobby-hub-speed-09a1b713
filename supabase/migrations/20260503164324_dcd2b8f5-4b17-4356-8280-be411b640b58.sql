
UPDATE products
SET gallery = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(gallery::jsonb) elem
  WHERE elem::text NOT IN (
    '"/products/hair-claw-combo-3pcs.png"',
    '"/products/hair-claw-combo-4pcs.png"'
  )
)
WHERE id = 'a33feefc-78e8-4b0c-b663-bb3c3ace8f37';
