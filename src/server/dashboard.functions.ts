import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

async function assertStaff(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  if (!roles.some((r) => r === "admin" || r === "customer_service" || r === "operations")) {
    throw new Error("Not authorized");
  }
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export const getDashboardKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);

    const now = new Date();
    const today = startOfDay(now);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [todayRes, yesterdayRes, sevenRes, thirtyRes, pendingConfirm, lowStock, abandoned] = await Promise.all([
      supabaseAdmin.from("orders")
        .select("id, total, status", { count: "exact" })
        .gte("created_at", today.toISOString()),
      supabaseAdmin.from("orders")
        .select("total")
        .gte("created_at", yesterday.toISOString())
        .lt("created_at", today.toISOString()),
      supabaseAdmin.from("orders")
        .select("total, status")
        .gte("created_at", sevenDaysAgo.toISOString()),
      supabaseAdmin.from("orders")
        .select("status")
        .gte("created_at", thirtyDaysAgo.toISOString()),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabaseAdmin.from("low_stock_alerts").select("id", { count: "exact", head: true }).eq("is_resolved", false),
      supabaseAdmin.from("abandoned_carts").select("id", { count: "exact", head: true }).eq("is_converted", false),
    ]);

    const todayRows = todayRes.data ?? [];
    const todayRevenue = todayRows
      .filter((o) => o.status !== "cancelled" && o.status !== "fake")
      .reduce((s, o) => s + Number(o.total ?? 0), 0);
    const todayOrders = todayRes.count ?? 0;

    const yesterdayRevenue = (yesterdayRes.data ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);
    const revenueDelta = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : todayRevenue > 0 ? 100 : 0;

    const sevenRows = sevenRes.data ?? [];
    const aov7 = sevenRows.length > 0
      ? sevenRows.reduce((s, o) => s + Number(o.total ?? 0), 0) / sevenRows.length
      : 0;

    const thirtyRows = thirtyRes.data ?? [];
    const delivered30 = thirtyRows.filter((o) => o.status === "delivered").length;
    const total30 = thirtyRows.length;
    const successRate = total30 > 0 ? (delivered30 / total30) * 100 : 0;

    return {
      todayRevenue,
      todayOrders,
      revenueDelta,
      aov7,
      successRate,
      pendingConfirm: pendingConfirm.count ?? 0,
      lowStockCount: lowStock.count ?? 0,
      abandonedCount: abandoned.count ?? 0,
    };
  });

export const getSalesTrend = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    const { data } = await supabaseAdmin
      .from("orders")
      .select("created_at, total, status")
      .gte("created_at", start.toISOString())
      .limit(5000);

    const byDay = new Map<string, { revenue: number; orders: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, { revenue: 0, orders: 0 });
    }
    for (const o of data ?? []) {
      const key = (o.created_at as string).slice(0, 10);
      const slot = byDay.get(key);
      if (!slot) continue;
      slot.orders += 1;
      if (o.status !== "cancelled" && o.status !== "fake") {
        slot.revenue += Number(o.total ?? 0);
      }
    }
    return Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v }));
  });

export const getTopProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const { data } = await supabaseAdmin
      .from("order_items")
      .select("product_id, name, quantity, line_total, created_at")
      .gte("created_at", start.toISOString())
      .limit(5000);

    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const it of data ?? []) {
      const id = it.product_id as string;
      const slot = map.get(id) ?? { name: it.name as string, qty: 0, revenue: 0 };
      slot.qty += Number(it.quantity ?? 0);
      slot.revenue += Number(it.line_total ?? 0);
      map.set(id, slot);
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  });

export const getActivityFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const { data } = await supabaseAdmin
      .from("orders")
      .select("id, created_at, status, total, shipping_name, shipping_phone")
      .order("created_at", { ascending: false })
      .limit(10);
    return { recent: data ?? [] };
  });
