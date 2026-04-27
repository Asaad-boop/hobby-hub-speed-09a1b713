import { supabase } from "@/integrations/supabase/client";

export type ReviewRow = {
  id: string;
  product_id: string;
  user_id: string | null;
  order_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  admin_note: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
};

export type ReviewWithProfile = ReviewRow & {
  display_name: string | null;
};

export type ReviewStatus = "pending" | "approved" | "rejected" | "all";

export async function fetchProductReviews(productId: string): Promise<ReviewWithProfile[]> {
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const list = (reviews ?? []) as ReviewRow[];
  if (list.length === 0) return [];

  const userIds = Array.from(new Set(list.map((r) => r.user_id).filter((id): id is string => !!id)));
  const nameMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    (profiles ?? []).forEach((p) => nameMap.set(p.id, p.display_name));
  }

  return list.map((r) => ({
    ...r,
    display_name: r.guest_name ?? (r.user_id ? nameMap.get(r.user_id) ?? null : null),
  }));
}

export type RatingBreakdown = {
  total: number;
  average: number;
  buckets: { stars: 1 | 2 | 3 | 4 | 5; count: number; pct: number }[];
};

export function computeBreakdown(reviews: ReviewWithProfile[]): RatingBreakdown {
  const total = reviews.length;
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  const average = total ? Number((sum / total).toFixed(2)) : 0;
  const buckets = ([5, 4, 3, 2, 1] as const).map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    const pct = total ? Math.round((count / total) * 100) : 0;
    return { stars, count, pct };
  });
  return { total, average, buckets };
}

/**
 * Returns the most recent delivered order_id (if any) for the current user
 * containing the given product. null = not eligible to review.
 */
export async function fetchEligibleOrderId(productId: string): Promise<string | null> {
  const { data: sess } = await supabase.auth.getSession();
  const user = sess.session?.user;
  if (!user) return null;

  // order_items.product_id is text, products.id is uuid
  const { data, error } = await supabase
    .from("order_items")
    .select("order_id, orders!inner(id, status, user_id, created_at)")
    .eq("product_id", productId)
    .eq("orders.user_id", user.id)
    .eq("orders.status", "delivered")
    .order("created_at", { ascending: false, referencedTable: "orders" })
    .limit(1);
  if (error) return null;
  const row = (data ?? [])[0] as { order_id: string } | undefined;
  return row?.order_id ?? null;
}

export async function uploadReviewImages(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const { error } = await supabase.storage.from("review-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("review-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

function formatSupabaseError(error: { message?: string; code?: string; details?: string; hint?: string }, fallback: string): Error {
  // Map common Postgres / PostgREST errors to friendly explanations
  const code = error.code;
  const raw = [error.message, error.details, error.hint].filter(Boolean).join(" — ");

  if (code === "23505") return new Error("You have already submitted a review for this product.");
  if (code === "23514") return new Error(`Validation failed: ${raw || "a value is out of allowed range."}`);
  if (code === "23502") return new Error(`Missing required field: ${error.message || raw}`);
  if (code === "42501" || /row-level security/i.test(error.message || "")) {
    return new Error(
      `Permission denied by server. ${raw || ""} (Likely cause: the form fields don't satisfy the review insert rules — name ≥ 2 chars, phone ≥ 6 chars, rating 1–5.)`,
    );
  }
  if (raw) return new Error(`${fallback}: ${raw}`);
  return new Error(fallback);
}

export async function submitReview(input: {
  product_id: string;
  order_id?: string | null;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
  guest_name?: string;
  guest_phone?: string;
}) {
  const { data: sess } = await supabase.auth.getSession();
  const user = sess.session?.user;

  // Pre-flight client-side validation with clear messages
  if (!input.product_id) throw new Error("Missing product reference.");
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error("Please choose a star rating between 1 and 5.");
  }

  // Verified-buyer path: logged in AND has eligible delivered order
  if (user && input.order_id) {
    const { error } = await supabase.from("reviews").insert({
      product_id: input.product_id,
      user_id: user.id,
      order_id: input.order_id,
      rating: input.rating,
      title: input.title?.trim() || null,
      comment: input.comment?.trim() || null,
      images: input.images ?? [],
    });
    if (error) throw formatSupabaseError(error, "Could not submit your review");
    return;
  }

  // Guest path (also used by logged-in users without an eligible order)
  const name = input.guest_name?.trim() ?? "";
  const phone = input.guest_phone?.trim() ?? "";
  if (name.length < 2) throw new Error("Please enter your name (at least 2 characters).");
  if (phone.length < 6) throw new Error("Please enter a valid phone number (at least 6 digits).");

  const { error } = await supabase.from("reviews").insert({
    product_id: input.product_id,
    user_id: null,
    order_id: null,
    rating: input.rating,
    title: input.title?.trim() || null,
    comment: input.comment?.trim() || null,
    images: input.images ?? [],
    guest_name: name,
    guest_phone: phone,
    is_approved: false,
  });
  if (error) throw formatSupabaseError(error, "Could not submit your review");
}

// ─── Admin helpers ─────────────────────────────────────────────────────────

export type AdminReview = ReviewRow & {
  product_title: string | null;
  product_image: string | null;
  customer_name: string | null;
};

export async function fetchAdminReviews(): Promise<AdminReview[]> {
  const [revRes, prodRes, profRes] = await Promise.all([
    supabase.from("reviews").select("*").order("created_at", { ascending: false }),
    supabase.from("products").select("id, title, image"),
    supabase.from("profiles").select("id, display_name"),
  ]);
  if (revRes.error) throw revRes.error;
  if (prodRes.error) throw prodRes.error;
  if (profRes.error) throw profRes.error;

  const products = new Map<string, { title: string; image: string }>();
  (prodRes.data ?? []).forEach((p) => products.set(p.id, { title: p.title, image: p.image }));
  const profiles = new Map<string, string | null>();
  (profRes.data ?? []).forEach((p) => profiles.set(p.id, p.display_name));

  return (revRes.data ?? []).map((r) => {
    const prod = products.get(r.product_id);
    return {
      ...(r as ReviewRow),
      product_title: prod?.title ?? null,
      product_image: prod?.image ?? null,
      customer_name: (r.guest_name as string | null) ?? (r.user_id ? profiles.get(r.user_id) ?? null : null),
    };
  });
}

export async function setReviewApproval(id: string, value: boolean) {
  const { error } = await supabase.from("reviews").update({ is_approved: value }).eq("id", id);
  if (error) throw error;
}

export async function bulkSetApproval(ids: string[], value: boolean) {
  if (ids.length === 0) return;
  const { error } = await supabase.from("reviews").update({ is_approved: value }).in("id", ids);
  if (error) throw error;
}

export async function deleteReview(id: string) {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
}

export async function bulkDelete(ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await supabase.from("reviews").delete().in("id", ids);
  if (error) throw error;
}

export async function updateAdminNote(id: string, admin_note: string | null) {
  const { error } = await supabase
    .from("reviews")
    .update({ admin_note: admin_note?.trim() || null })
    .eq("id", id);
  if (error) throw error;
}

export async function updateReviewDate(id: string, isoDate: string) {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) throw new Error("Invalid date");
  const { error } = await supabase
    .from("reviews")
    .update({ created_at: d.toISOString() })
    .eq("id", id);
  if (error) throw error;
}
