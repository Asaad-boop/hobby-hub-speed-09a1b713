import { supabase } from "@/integrations/supabase/client";

export type CouponType = "percentage" | "fixed";

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  applicable_categories: string[] | null;
  applicable_products: string[] | null;
  created_at: string;
  updated_at: string;
};

export type CouponValidation =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; error: string };

export function calcDiscount(coupon: Coupon, subtotal: number): number {
  if (coupon.type === "percentage") {
    const raw = Math.round((subtotal * Number(coupon.value)) / 100);
    if (coupon.max_discount && raw > Number(coupon.max_discount)) {
      return Number(coupon.max_discount);
    }
    return raw;
  }
  // fixed
  return Math.min(Number(coupon.value), subtotal);
}

/**
 * Validate a coupon code against current cart context.
 * Reads only active coupons (RLS enforced).
 */
export async function validateCoupon(
  code: string,
  subtotal: number,
  productIds: string[],
): Promise<CouponValidation> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "Enter a coupon code" };

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return { ok: false, error: "Could not validate coupon" };
  if (!data) return { ok: false, error: "Invalid coupon code" };

  const coupon = data as unknown as Coupon;
  const now = new Date();

  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { ok: false, error: "Coupon is not yet active" };
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { ok: false, error: "Coupon has expired" };
  }
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    return { ok: false, error: "Coupon usage limit reached" };
  }
  if (subtotal < Number(coupon.min_order_amount)) {
    return {
      ok: false,
      error: `Minimum order ৳${coupon.min_order_amount} required`,
    };
  }
  if (
    Array.isArray(coupon.applicable_products) &&
    coupon.applicable_products.length > 0 &&
    !productIds.some((id) => coupon.applicable_products!.includes(id))
  ) {
    return { ok: false, error: "Coupon not valid for items in cart" };
  }

  const discount = calcDiscount(coupon, subtotal);
  if (discount <= 0) return { ok: false, error: "Coupon yields no discount" };

  return { ok: true, coupon, discount };
}
