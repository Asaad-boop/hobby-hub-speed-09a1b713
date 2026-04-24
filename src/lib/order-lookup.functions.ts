import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const normalizePhone = (p: string) => p.replace(/\D/g, "").slice(-10);

/**
 * Order lookup — REQUIRES AUTHENTICATION.
 * Customers must sign in (account created with phone/email) to track orders.
 * Staff (admin/customer_service/operations) can look up any order; regular
 * users can only look up orders that belong to them.
 */
export const lookupOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => {
    const query = String(input.query || "").trim();
    if (!query) throw new Error("Please enter Order ID, phone or email");
    if (query.length > 254) throw new Error("Input too long");
    return { query };
  })
  .handler(async ({ data, context }) => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        ok: false as const,
        error:
          "Order tracking is temporarily unavailable. Please try again in a moment.",
      };
    }

    const userId = context.userId;
    const claims = context.claims as { role?: string } | undefined;

    // Check if caller is staff
    const { data: rolesRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (rolesRow ?? []).map((r: any) => r.role);
    const isStaff =
      roles.includes("admin") ||
      roles.includes("customer_service") ||
      roles.includes("operations");

    const { query } = data;
    const isEmail = query.includes("@");
    const digits = normalizePhone(query);
    const isPhone = !isEmail && digits.length >= 10;
    // Order ID lookups must use full UUID (36 chars) — prefix enumeration removed.
    const isOrderId = !isEmail && !isPhone && query.length === 36;

    const baseSelect = "*, order_items(id,name,image,price,quantity)";

    // Lookup by full Order ID
    if (isOrderId) {
      let q = supabaseAdmin.from("orders").select(baseSelect).eq("id", query);
      if (!isStaff) q = q.eq("user_id", userId);
      const { data: orders } = await q.limit(1);
      if (orders && orders.length > 0)
        return { ok: true as const, order: orders[0] };
      return { ok: false as const, error: "No order found with that Order ID" };
    }

    // Lookup by phone — server-side filter, scoped to caller unless staff
    if (isPhone) {
      let q = supabaseAdmin
        .from("orders")
        .select(baseSelect)
        .ilike("shipping_phone", `%${digits}`)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!isStaff) q = q.eq("user_id", userId);
      const { data: orders } = await q;
      if (orders && orders.length > 0)
        return { ok: true as const, order: orders[0] };
      return {
        ok: false as const,
        error: "No order found with that phone number",
      };
    }

    // Lookup by email — only staff can lookup arbitrary emails;
    // regular users can only look up their own email implicitly via user_id.
    if (isEmail) {
      const email = query.toLowerCase();
      if (!isStaff) {
        // Regular user: just return their own latest order
        const { data: orders } = await supabaseAdmin
          .from("orders")
          .select(baseSelect)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1);
        if (orders && orders.length > 0)
          return { ok: true as const, order: orders[0] };
        return { ok: false as const, error: "No order found for your account" };
      }
      // Staff path: direct user lookup by email
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000,
      });
      const user = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === email,
      );
      if (!user)
        return { ok: false as const, error: "No order found with that email" };
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select(baseSelect)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (orders && orders.length > 0)
        return { ok: true as const, order: orders[0] };
      return { ok: false as const, error: "No order found with that email" };
    }

    return {
      ok: false as const,
      error:
        "Please enter a full Order ID (36 characters), phone number, or email",
    };
  });
