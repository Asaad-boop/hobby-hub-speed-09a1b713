import { supabase } from "@/integrations/supabase/client";

export type OptionType = {
  id: string;
  product_id: string;
  name: string;
  display_order: number;
};

export type OptionValue = {
  id: string;
  option_type_id: string;
  value: string;
  swatch_hex: string | null;
  display_order: number;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  sku: string | null;
  price_override: number | null;
  stock: number;
  image: string | null;
  is_active: boolean;
  display_order: number;
  /** ordered list of option_value ids that define this variant */
  value_ids: string[];
};

export type ProductVariantData = {
  optionTypes: OptionType[];
  optionValues: OptionValue[];
  variants: ProductVariant[];
};

/** Fetch all variant data for a product in one shot (3 round-trips). */
export async function fetchProductVariantData(productId: string): Promise<ProductVariantData> {
  const [typesRes, variantsRes] = await Promise.all([
    supabase
      .from("product_option_types")
      .select("*")
      .eq("product_id", productId)
      .order("display_order"),
    supabase
      .from("product_variants")
      .select("id, product_id, sku, price_override, stock, image, is_active, display_order")
      .eq("product_id", productId)
      .order("display_order"),
  ]);
  if (typesRes.error) throw typesRes.error;
  if (variantsRes.error) throw variantsRes.error;

  const optionTypes = (typesRes.data ?? []) as OptionType[];
  const variantRows = (variantsRes.data ?? []) as Omit<ProductVariant, "value_ids">[];

  const typeIds = optionTypes.map((t) => t.id);
  const variantIds = variantRows.map((v) => v.id);

  const [valuesRes, joinRes] = await Promise.all([
    typeIds.length
      ? supabase
          .from("product_option_values")
          .select("*")
          .in("option_type_id", typeIds)
          .order("display_order")
      : Promise.resolve({ data: [], error: null } as const),
    variantIds.length
      ? supabase
          .from("product_variant_values")
          .select("variant_id, option_value_id")
          .in("variant_id", variantIds)
      : Promise.resolve({ data: [], error: null } as const),
  ]);
  if (valuesRes.error) throw valuesRes.error;
  if (joinRes.error) throw joinRes.error;

  const optionValues = (valuesRes.data ?? []) as OptionValue[];
  const joins = (joinRes.data ?? []) as { variant_id: string; option_value_id: string }[];

  const variants: ProductVariant[] = variantRows.map((v) => ({
    ...v,
    value_ids: joins.filter((j) => j.variant_id === v.id).map((j) => j.option_value_id),
  }));

  return { optionTypes, optionValues, variants };
}

/** Find the variant whose set of option values exactly matches the provided ids. */
export function findVariantByValues(
  variants: ProductVariant[],
  selectedValueIds: string[],
): ProductVariant | null {
  const target = new Set(selectedValueIds);
  for (const v of variants) {
    if (v.value_ids.length !== target.size) continue;
    if (v.value_ids.every((id) => target.has(id))) return v;
  }
  return null;
}

/** Build a human label like "Red / Small" from selected value ids. */
export function buildVariantLabel(
  optionTypes: OptionType[],
  optionValues: OptionValue[],
  selectedValueIds: string[],
): string {
  const parts: string[] = [];
  for (const t of optionTypes) {
    const v = optionValues.find(
      (ov) => ov.option_type_id === t.id && selectedValueIds.includes(ov.id),
    );
    if (v) parts.push(v.value);
  }
  return parts.join(" / ");
}

/** Effective price of a variant — falls back to product price if no override. */
export function variantPrice(variant: ProductVariant | null, productPrice: number): number {
  if (!variant || variant.price_override == null) return productPrice;
  return Number(variant.price_override);
}

/** Cartesian product of arrays — used to generate variant matrix. */
export function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap((a) => arr.map((x) => [...a, x])),
    [[]],
  );
}

// ---------- Admin mutations ----------

export async function createOptionType(input: { product_id: string; name: string; display_order?: number }) {
  const { data, error } = await supabase
    .from("product_option_types")
    .insert({ ...input, display_order: input.display_order ?? 0 })
    .select()
    .single();
  if (error) throw error;
  return data as OptionType;
}

export async function deleteOptionType(id: string) {
  const { error } = await supabase.from("product_option_types").delete().eq("id", id);
  if (error) throw error;
}

export async function createOptionValue(input: {
  option_type_id: string;
  value: string;
  swatch_hex?: string | null;
  display_order?: number;
}) {
  const { data, error } = await supabase
    .from("product_option_values")
    .insert({
      option_type_id: input.option_type_id,
      value: input.value,
      swatch_hex: input.swatch_hex ?? null,
      display_order: input.display_order ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as OptionValue;
}

export async function deleteOptionValue(id: string) {
  const { error } = await supabase.from("product_option_values").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertVariant(input: {
  id?: string;
  product_id: string;
  value_ids: string[];
  sku?: string | null;
  price_override?: number | null;
  stock: number;
  image?: string | null;
  is_active?: boolean;
}) {
  let variantId = input.id;
  if (variantId) {
    const { error } = await supabase
      .from("product_variants")
      .update({
        sku: input.sku ?? null,
        price_override: input.price_override ?? null,
        stock: input.stock,
        image: input.image ?? null,
        is_active: input.is_active ?? true,
      })
      .eq("id", variantId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("product_variants")
      .insert({
        product_id: input.product_id,
        sku: input.sku ?? null,
        price_override: input.price_override ?? null,
        stock: input.stock,
        image: input.image ?? null,
        is_active: input.is_active ?? true,
      })
      .select("id")
      .single();
    if (error) throw error;
    variantId = data.id;
    // attach option values
    const rows = input.value_ids.map((vid) => ({ variant_id: variantId!, option_value_id: vid }));
    if (rows.length) {
      const { error: joinErr } = await supabase.from("product_variant_values").insert(rows);
      if (joinErr) throw joinErr;
    }
  }
  return variantId!;
}

export async function deleteVariant(id: string) {
  const { error } = await supabase.from("product_variants").delete().eq("id", id);
  if (error) throw error;
}
