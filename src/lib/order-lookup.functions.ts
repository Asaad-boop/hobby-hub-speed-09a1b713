import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const normalizePhone = (p: string) => p.replace(/\D/g, "").slice(-10);

export const lookupOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => {
    const query = String(input.query || "").trim();
    if (!query) throw new Error("Please enter Order ID, phone or email");
    return { query };
  })
  .handler(async ({ data }) => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        ok: false as const,
        error:
          "Order tracking is temporarily unavailable. Please try again in a moment.",
      };
    }
    const { query } = data;
    const isEmail = query.includes("@");
    const digits = normalizePhone(query);
    const isPhone = !isEmail && digits.length >= 10;
    const isOrderId = !isEmail && !isPhone;

    // Lookup by Order ID (full UUID or short prefix)
    if (isOrderId) {
      let q = supabaseAdmin
        .from("orders")
        .select("*, order_items(id,name,image,price,quantity)");
      if (query.length === 36) q = q.eq("id", query);
      else q = q.ilike("id", `${query.toLowerCase()}%`);
      const { data: orders } = await q.order("created_at", { ascending: false }).limit(1);
      if (orders && orders.length > 0) return { ok: true as const, order: orders[0] };
      return { ok: false as const, error: "No order found with that Order ID" };
    }

    // Lookup by phone
    if (isPhone) {
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("*, order_items(id,name,image,price,quantity)")
        .order("created_at", { ascending: false })
        .limit(50);
      const match = (orders || []).find(
        (o) => normalizePhone(o.shipping_phone || "") === digits
      );
      if (match) return { ok: true as const, order: match };
      return { ok: false as const, error: "No order found with that phone number" };
    }

    // Lookup by email
    if (isEmail) {
      const email = query.toLowerCase();
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const user = usersData?.users?.find((u) => u.email?.toLowerCase() === email);
      if (!user) return { ok: false as const, error: "No order found with that email" };
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("*, order_items(id,name,image,price,quantity)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (orders && orders.length > 0) return { ok: true as const, order: orders[0] };
      return { ok: false as const, error: "No order found with that email" };
    }

    return { ok: false as const, error: "Invalid input" };
  });
