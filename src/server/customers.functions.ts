import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

async function assertStaff(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  const isStaff =
    roles.includes("admin") ||
    roles.includes("customer_service") ||
    roles.includes("operations");
  if (!isStaff) throw new Error("Not authorized");
  return { isAdmin: roles.includes("admin") };
}

// ---------------- LIST CUSTOMERS ----------------
export const listCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      search: z.string().trim().max(100).optional(),
      segment: z.enum(["new", "regular", "vip", "all"]).default("all"),
      flagged_only: z.boolean().default(false),
      page: z.number().int().min(1).default(1),
      page_size: z.number().int().min(1).max(100).default(50),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const offset = (data.page - 1) * data.page_size;
    let q = supabaseAdmin
      .from("profiles")
      .select(
        "id, display_name, total_orders, total_spent, customer_segment, fake_order_count, cancellation_count, is_flagged, flag_reason, created_at",
        { count: "exact" },
      );
    if (data.search) {
      const s = data.search.replace(/[%,]/g, "");
      q = q.ilike("display_name", `%${s}%`);
    }
    if (data.segment !== "all") q = q.eq("customer_segment", data.segment);
    if (data.flagged_only) q = q.eq("is_flagged", true);
    q = q.order("total_spent", { ascending: false }).range(offset, offset + data.page_size - 1);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, page_size: data.page_size };
  });

// ---------------- CUSTOMER DETAIL (360) ----------------
export const getCustomerDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);

    const [profile, orders, addresses, statsRpc] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", data.user_id).maybeSingle(),
      supabaseAdmin
        .from("orders")
        .select("id, created_at, status, total, shipping_phone, payment_status, courier_name")
        .eq("user_id", data.user_id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin.from("addresses").select("*").eq("user_id", data.user_id),
      supabaseAdmin.rpc("get_customer_stats", { p_user_id: data.user_id }),
    ]);

    if (profile.error) throw new Error(profile.error.message);

    return {
      profile: profile.data,
      orders: orders.data ?? [],
      addresses: addresses.data ?? [],
      stats: statsRpc.data ?? null,
    };
  });

// ---------------- FLAG CUSTOMER ----------------
export const flagCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      user_id: z.string().uuid(),
      is_flagged: z.boolean(),
      flag_reason: z.string().max(500).optional(),
      admin_notes: z.string().max(2000).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const { isAdmin } = await assertStaff(context.userId);
    if (!isAdmin) throw new Error("Only admins can flag customers");
    const patch: Record<string, unknown> = {
      is_flagged: data.is_flagged,
      flag_reason: data.is_flagged ? data.flag_reason ?? null : null,
      updated_at: new Date().toISOString(),
    };
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(patch as never)
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
