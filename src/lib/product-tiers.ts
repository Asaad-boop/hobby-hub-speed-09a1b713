// Per-product bundle pricing overrides.
// Key: product slug. Value: qty -> total price (BDT) for that pack.
// When a product has an override, the product page shows these packs and
// checkout applies a discount = (product.price * qty) - overrideTotal.

export type TierMap = Record<number, number>;

export const PRODUCT_TIERS: Record<string, TierMap> = {
  "flower-pearl-curtain-buckle": {
    2: 399,
    3: 549,
    4: 699,
    6: 899,
  },
};

export function getTiers(slug?: string | null): TierMap | null {
  if (!slug) return null;
  return PRODUCT_TIERS[slug] ?? null;
}

/** Bundle discount for a line given custom tier map (fallback to % rule if none). */
export function computeBundleDiscount(
  slug: string | null | undefined,
  unitPrice: number,
  qty: number,
): number {
  const tiers = getTiers(slug);
  if (tiers && tiers[qty] != null) {
    return Math.max(0, Math.round(unitPrice * qty - tiers[qty]));
  }
  const pct = qty >= 3 ? 15 : qty === 2 ? 10 : 0;
  if (!pct) return 0;
  return Math.round(unitPrice * qty * (pct / 100));
}
