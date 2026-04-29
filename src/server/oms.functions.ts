// OMS server functions — orders, products, customers, dashboard stats.
// All authenticated, RLS-respected.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ----------------- DASHBOARD -----------------
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const since14 = new Date(Date.now() - 13 * 86400_000).toISOString();

    const [todayOrders, allCounts, recentRes, last14Res, lowStockRes] = await Promise.all([
      supabase.from("orders").select("id,total,status,created_at").gte("created_at", todayIso),
      supabase.from("orders").select("id,status,total"),
      supabase
        .from("orders")
        .select(
          "id,total,status,confirmation_status,call_status,hold_until,advance_amount,shipping_name,guest_name,shipping_phone,guest_phone,courier_name,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("orders")
        .select("total,status,created_at")
        .gte("created_at", since14),
      supabase
        .from("products")
        .select("id,title,stock,image")
        .lte("stock", 5)
        .eq("is_active", true)
        .order("stock", { ascending: true })
        .limit(8),
    ]);

    const all = allCounts.data ?? [];
    const todayList = todayOrders.data ?? [];
    const todayRevenue = todayList
      .filter((o) => o.status !== "cancelled" && o.status !== "fake")
      .reduce((s, o) => s + Number(o.total), 0);

    const stageCount = {
      processing: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    };
    for (const o of all) {
      const s = o.status as string;
      if (s === "delivered") stageCount.delivered++;
      else if (s === "returned") stageCount.returned++;
      else if (s === "shipped" || s === "in_transit" || s === "ready_to_ship") stageCount.shipped++;
      else if (s === "cancelled" || s === "fake") stageCount.cancelled++;
      else if (s === "confirmed" || s === "packaging" || s === "packed") stageCount.confirmed++;
      else stageCount.processing++;
    }

    // 14-day series
    const days: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      days[d] = { date: d.slice(5), revenue: 0, orders: 0 };
    }
    for (const o of last14Res.data ?? []) {
      const d = (o.created_at as string).slice(0, 10);
      if (d in days) {
        days[d].orders += 1;
        if (o.status === "delivered") days[d].revenue += Number(o.total);
      }
    }

    const total = all.length || 1;
    const delivered = stageCount.delivered;
    const successRate = Math.round((delivered / total) * 100);

    return {
      todayOrders: todayList.length,
      todayRevenue,
      pending: stageCount.processing,
      confirmed: stageCount.confirmed,
      shipped: stageCount.shipped,
      delivered,
      cancelled: stageCount.cancelled,
      returned: stageCount.returned,
      totalOrders: all.length,
      totalRevenue: all
        .filter((o) => o.status === "delivered")
        .reduce((s, o) => s + Number(o.total), 0),
      successRate,
      stageCount,
      series: Object.values(days),
      recent: recentRes.data ?? [],
      lowStock: lowStockRes.data ?? [],
    };
  });

// ----------------- ORDERS LIST -----------------
const listOrdersInput = z.object({
  search: z.string().max(100).optional(),
  status: z.string().max(50).optional(),
  limit: z.number().min(1).max(500).default(100),
});
export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listOrdersInput.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    let q = supabase
      .from("orders")
      .select(
        "id,total,subtotal,shipping_fee,discount_amount,advance_amount,status,confirmation_status,call_status,hold_until,courier_name,tracking_number,shipping_name,guest_name,shipping_phone,guest_phone,shipping_address,shipping_city,shipping_district,payment_method,is_guest_order,created_at,updated_at,admin_notes,cancel_reason",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.search) {
      const term = `%${data.search}%`;
      q = q.or(
        `shipping_name.ilike.${term},guest_name.ilike.${term},shipping_phone.ilike.${term},guest_phone.ilike.${term}`,
      );
    }
    if (data.status && data.status !== "all") {
      q = q.eq("status", data.status as never);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ----------------- ORDER DETAIL -----------------
export const getOrderDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const [orderRes, itemsRes, logsRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", data.id).single(),
      supabase.from("order_items").select("*").eq("order_id", data.id),
      supabase
        .from("activity_logs")
        .select("*")
        .eq("order_id", data.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (orderRes.error) throw new Error(orderRes.error.message);
    return {
      order: orderRes.data,
      items: itemsRes.data ?? [],
      logs: logsRes.data ?? [],
    };
  });

// ----------------- UPDATE ORDER -----------------
const updateOrderInput = z.object({
  id: z.string().uuid(),
  patch: z.record(z.string(), z.any()),
});
export const updateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateOrderInput.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("orders")
      .update(data.patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const bulkUpdateInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  patch: z.record(z.string(), z.any()),
});
export const bulkUpdateOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bulkUpdateInput.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("orders")
      .update(data.patch as never)
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

// ----------------- ADD ORDER NOTE -----------------
const addNoteInput = z.object({
  orderId: z.string().uuid(),
  note: z.string().min(1).max(500),
});
export const addOrderNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => addNoteInput.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("activity_logs").insert({
      order_id: data.orderId,
      user_id: userId,
      action: "note_added",
      note: data.note,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----------------- PRODUCTS / INVENTORY -----------------
export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("products")
      .select("id,title,slug,price,stock,image,is_active,category_id,updated_at")
      .order("stock", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const adjustStockInput = z.object({
  productId: z.string().uuid(),
  delta: z.number().int().min(-10000).max(10000),
  reason: z.string().min(1).max(80),
  note: z.string().max(300).optional(),
});
export const adjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => adjustStockInput.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: prod, error: getErr } = await supabase
      .from("products")
      .select("stock")
      .eq("id", data.productId)
      .single();
    if (getErr) throw new Error(getErr.message);
    const before = prod.stock;
    const after = Math.max(0, before + data.delta);
    const { error: upErr } = await supabase
      .from("products")
      .update({ stock: after, updated_at: new Date().toISOString() } as never)
      .eq("id", data.productId);
    if (upErr) throw new Error(upErr.message);
    await supabase.from("stock_movements").insert({
      product_id: data.productId,
      user_id: userId,
      delta: data.delta,
      stock_before: before,
      stock_after: after,
      reason: data.reason,
      note: data.note ?? null,
    } as never);
    return { ok: true, stock: after };
  });

// ----------------- CUSTOMERS -----------------
export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id,display_name,total_orders,total_spent,customer_segment,is_flagged,flag_reason,fake_order_count,cancellation_count,created_at",
      )
      .order("total_spent", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ----------------- REPORTS -----------------
const reportInput = z.object({
  fromIso: z.string().min(8).max(40),
  toIso: z.string().min(8).max(40),
});
export const getSalesReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reportInput.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("orders")
      .select("id,total,status,courier_name,created_at,delivered_at")
      .gte("created_at", data.fromIso)
      .lte("created_at", data.toIso)
      .limit(5000);
    if (error) throw new Error(error.message);

    const byStatus: Record<string, { count: number; revenue: number }> = {};
    const byCourier: Record<string, { count: number; revenue: number; delivered: number }> = {};
    let totalOrders = 0;
    let totalRevenue = 0;
    let delivered = 0;

    for (const r of rows ?? []) {
      totalOrders++;
      const t = Number(r.total);
      const s = (r.status as string) ?? "unknown";
      byStatus[s] = byStatus[s] || { count: 0, revenue: 0 };
      byStatus[s].count++;
      byStatus[s].revenue += t;
      if (s === "delivered") {
        delivered++;
        totalRevenue += t;
      }
      const c = r.courier_name || "—";
      byCourier[c] = byCourier[c] || { count: 0, revenue: 0, delivered: 0 };
      byCourier[c].count++;
      if (s === "delivered") {
        byCourier[c].delivered++;
        byCourier[c].revenue += t;
      }
    }

    return {
      totalOrders,
      totalRevenue,
      delivered,
      successRate: totalOrders ? Math.round((delivered / totalOrders) * 100) : 0,
      byStatus,
      byCourier,
    };
  });
