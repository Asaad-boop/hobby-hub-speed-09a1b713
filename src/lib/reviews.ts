import { supabase } from "@/integrations/supabase/client";

export type ReviewRow = {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
};

export type ReviewWithProfile = ReviewRow & {
  display_name: string | null;
};

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

  const userIds = Array.from(new Set(list.map((r) => r.user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);
  const nameMap = new Map<string, string | null>();
  (profiles ?? []).forEach((p) => nameMap.set(p.id, p.display_name));

  return list.map((r) => ({ ...r, display_name: nameMap.get(r.user_id) ?? null }));
}

export async function submitReview(input: {
  product_id: string;
  rating: number;
  title?: string;
  comment?: string;
}) {
  const { data: sess } = await supabase.auth.getSession();
  const user = sess.session?.user;
  if (!user) throw new Error("Login required to submit a review");

  const { error } = await supabase.from("reviews").insert({
    product_id: input.product_id,
    user_id: user.id,
    rating: input.rating,
    title: input.title?.trim() || null,
    comment: input.comment?.trim() || null,
    is_approved: true,
  });
  if (error) throw error;
}
