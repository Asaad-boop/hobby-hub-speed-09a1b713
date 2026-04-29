import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type AppRole = Database["public"]["Enums"]["app_role"];

const ORDER_STATUSES: OrderStatus[] = [
  "new", "confirmed", "packaging", "packed", "ready_to_ship",
  "shipped", "in_transit", "delivered", "partial_delivered",
  "returned", "exchanged", "damaged", "cancelled", "fake",
  "on_hold", "advance_payment_pending", "incomplete",
  "ready_to_pack", "courier_entry", "exchange",
  "paid_return", "unpaid_return", "partial_return", "pending_return",
];

const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const PAYMENT_STATUSES = ["unpaid", "partial", "paid", "refunded"] as const;

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
  return { roles, isAdmin: roles.includes("admin") };
}

// ---------------- LIST ORDERS ----------------
export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      search: z.string().trim().max(100).optional(),
      status: z.array(z.enum(ORDER_STATUSES as [string, ...string[]])).optional(),
      priority: z.array(z.enum(PRIORITIES)).optional(),
      payment_status: z.array(z.enum(PAYMENT_STATUSES)).optional(),
      assigned_to: z.string().uuid().nullable().optional(),
      tags: z.array(z.string()).optional(),
      source: z.string().optional(),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      sort_by: z.enum(["created_at", "total", "priority", "updated_at"]).default("created_at"),
      sort_dir: z.enum(["asc", "desc"]).default("desc"),
      page: z.number().int().min(1).default(1),
      page_size: z.number().int().min(1).max(200).default(50),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);

    const offset = (data.page - 1) * data.page_size;
    let q = supabaseAdmin
      .from("orders")
      .select(
        `id, created_at, updated_at, status, priority, payment_status,
         shipping_name, shipping_phone, shipping_city, shipping_district,
         shipping_address, total, subtotal, shipping_fee, discount_amount,
         advance_amount, payment_method, source, source_website, tags, order_tags,
         assigned_to, confirmation_status, call_status, call_attempt_count,
         is_guest_order, user_id, courier_name, tracking_number,
         expected_delivery_date, refund_amount,
         order_items(id, name, image, quantity, unit_price, line_total, variant_label)`,
        { count: "exact" },
      );

    if (data.search) {
      const s = data.search.replace(/[%,]/g, "");
      q = q.or(
        `shipping_name.ilike.%${s}%,shipping_phone.ilike.%${s}%,id.eq.${/^[0-9a-f-]{36}$/i.test(s) ? s : "00000000-0000-0000-0000-000000000000"}`,
      );
    }
    if (data.status?.length) q = q.in("status", data.status as OrderStatus[]);
    if (data.priority?.length) q = q.in("priority", data.priority as never);
    if (data.payment_status?.length) q = q.in("payment_status", data.payment_status as never);
    if (data.assigned_to === null) q = q.is("assigned_to", null);
    else if (data.assigned_to) q = q.eq("assigned_to", data.assigned_to);
    if (data.source) q = q.eq("source", data.source as never);
    if (data.tags?.length) q = q.overlaps("order_tags", data.tags);
    if (data.date_from) q = q.gte("created_at", data.date_from);
    if (data.date_to) q = q.lte("created_at", data.date_to);

    q = q.order(data.sort_by, { ascending: data.sort_dir === "asc" }).range(offset, offset + data.page_size - 1);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, page_size: data.page_size };
  });

// ---------------- GET ORDER DETAIL ----------------
export const getOrderDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);

    const [order, items, history, notes] = await Promise.all([
      supabaseAdmin.from("orders").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin.from("order_items").select("*").eq("order_id", data.id),
      supabaseAdmin
        .from("order_status_history")
        .select("*")
        .eq("order_id", data.id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("order_notes")
        .select("*")
        .eq("order_id", data.id)
        .order("created_at", { ascending: false }),
    ]);

    if (order.error) throw new Error(order.error.message);
    if (!order.data) throw new Error("Order not found");

    return {
      order: order.data,
      items: items.data ?? [],
      history: history.data ?? [],
      notes: notes.data ?? [],
    };
  });

// ---------------- TRANSITION STATUS ----------------
export const transitionOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      order_id: z.string().uuid(),
      new_status: z.enum(ORDER_STATUSES as [string, ...string[]]),
      reason: z.string().max(500).optional(),
      note: z.string().max(2000).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);

    const { error } = await supabaseAdmin.rpc("transition_order_status", {
      _order_id: data.order_id,
      _new_status: data.new_status as OrderStatus,
      _reason: data.reason ?? undefined,
      _note: data.note ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- BULK STATUS UPDATE ----------------
export const bulkTransitionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      order_ids: z.array(z.string().uuid()).min(1).max(200),
      new_status: z.enum(ORDER_STATUSES as [string, ...string[]]),
      reason: z.string().max(500).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const results = await Promise.allSettled(
      data.order_ids.map((id) =>
        supabaseAdmin.rpc("transition_order_status", {
          _order_id: id,
          _new_status: data.new_status as OrderStatus,
          _reason: data.reason ?? undefined,
          _note: undefined,
        }),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    return { ok, failed: results.length - ok };
  });

// ---------------- UPDATE ORDER (priority, assignment, etc) ----------------
export const updateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      priority: z.enum(PRIORITIES).optional(),
      payment_status: z.enum(PAYMENT_STATUSES).optional(),
      assigned_to: z.string().uuid().nullable().optional(),
      expected_delivery_date: z.string().nullable().optional(),
      tags: z.array(z.string().max(50)).max(20).optional(),
      admin_notes: z.string().max(5000).optional(),
      shipping_name: z.string().max(200).optional(),
      shipping_phone: z.string().max(30).optional(),
      shipping_address: z.string().max(500).optional(),
      shipping_city: z.string().max(100).optional(),
      shipping_district: z.string().max(100).optional(),
      shipping_thana: z.string().max(100).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { id, tags, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
    if (tags !== undefined) patch.order_tags = tags;

    const { error } = await supabaseAdmin.from("orders").update(patch as never).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- ADD NOTE ----------------
export const addOrderNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      order_id: z.string().uuid(),
      body: z.string().trim().min(1).max(2000),
      is_internal: z.boolean().default(true),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("order_notes")
      .insert({
        order_id: data.order_id,
        body: data.body,
        is_internal: data.is_internal,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { note: row };
  });

// ---------------- DELETE ORDER (admin only) ----------------
export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { isAdmin } = await assertStaff(context.userId);
    if (!isAdmin) throw new Error("Only admins can delete orders");
    const { error } = await supabaseAdmin.rpc("hard_delete_order", { _order_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- ORDER COUNTS BY STATUS ----------------
export const getOrderCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("status")
      .limit(10000);
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const s = (row as { status: string }).status;
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return { counts, total: (data ?? []).length };
  });
