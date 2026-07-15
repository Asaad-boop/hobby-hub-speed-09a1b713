// Per-product bundle pricing overrides.
// Key: product slug. Value: qty -> total price (BDT) for that pack.
// When a product has an override, the product page shows these packs and
// checkout applies a discount = (product.price * qty) - overrideTotal.

export type TierMap = Record<number, number>;

export const PRODUCT_TIERS: Record<string, TierMap> = {
  "flower-pearl-curtain-buckle": {
    4: 590,
    6: 850,
    8: 1090,
    10: 1290,
  },
  // Product is sold as a 10pc pack; qty = number of packs.
  "compressed-travel-towel-disposable-face-towel": {
    10: 199,
    20: 349,
    30: 449,
    50: 699,
    100: 1199,
  },

};

export const PRODUCT_TIER_LABELS: Record<string, Record<number, string>> = {
  "flower-pearl-curtain-buckle": {
    4: "4 PCS • Minimum",
    6: "6 PCS • Best Value",
    8: "8 PCS • Most Popular",
    10: "10 PCS • Bulk Saver",
  },
};

export function getTierLabel(slug: string | null | undefined, qty: number): string | null {
  if (!slug) return null;
  return PRODUCT_TIER_LABELS[slug]?.[qty] ?? null;
}

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
