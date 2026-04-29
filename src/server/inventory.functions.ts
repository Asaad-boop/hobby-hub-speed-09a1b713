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
  if (!roles.includes("admin") && !roles.includes("operations")) {
    throw new Error("Not authorized");
  }
  return { isAdmin: roles.includes("admin") };
}

// ---------------- ADJUST STOCK ----------------
export const adjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      product_id: z.string().uuid(),
      delta: z.number().int(),
      reason: z.enum(["restock", "correction", "damage", "return", "manual"]).default("manual"),
      note: z.string().max(500).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);

    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id, stock")
      .eq("id", data.product_id)
      .single();
    if (pErr || !product) throw new Error("Product not found");

    const before = product.stock ?? 0;
    const after = Math.max(0, before + data.delta);

    const { error: uErr } = await supabaseAdmin
      .from("products")
      .update({ stock: after, updated_at: new Date().toISOString() })
      .eq("id", data.product_id);
    if (uErr) throw new Error(uErr.message);

    await supabaseAdmin.from("stock_movements").insert({
      product_id: data.product_id,
      user_id: context.userId,
      delta: data.delta,
      stock_before: before,
      stock_after: after,
      reason: data.reason,
      note: data.note ?? null,
    });

    return { ok: true, stock_before: before, stock_after: after };
  });

// ---------------- BULK RESTOCK ----------------
export const bulkRestock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      items: z
        .array(z.object({ product_id: z.string().uuid(), delta: z.number().int() }))
        .min(1)
        .max(100),
      note: z.string().max(500).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    let ok = 0;
    for (const item of data.items) {
      const { data: p } = await supabaseAdmin
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single();
      if (!p) continue;
      const before = p.stock ?? 0;
      const after = Math.max(0, before + item.delta);
      const { error } = await supabaseAdmin
        .from("products")
        .update({ stock: after, updated_at: new Date().toISOString() })
        .eq("id", item.product_id);
      if (!error) {
        await supabaseAdmin.from("stock_movements").insert({
          product_id: item.product_id,
          user_id: context.userId,
          delta: item.delta,
          stock_before: before,
          stock_after: after,
          reason: "restock",
          note: data.note ?? null,
        });
        ok++;
      }
    }
    return { ok, failed: data.items.length - ok };
  });

// ---------------- LOW STOCK LIST ----------------
export const listLowStock = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const { data, error } = await supabaseAdmin
      .from("low_stock_alerts")
      .select(
        `id, current_stock, threshold, created_at, is_resolved,
         product:products!low_stock_alerts_product_id_fkey(id, title, slug, image, stock)`,
      )
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(200);
    // Fallback if FK alias not present
    if (error) {
      const { data: alerts } = await supabaseAdmin
        .from("low_stock_alerts")
        .select("id, current_stock, threshold, created_at, is_resolved, product_id")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })
        .limit(200);
      const ids = (alerts ?? []).map((a) => a.product_id);
      const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, title, slug, image, stock")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const byId = new Map((products ?? []).map((p) => [p.id, p]));
      return {
        rows: (alerts ?? []).map((a) => ({ ...a, product: byId.get(a.product_id) ?? null })),
      };
    }
    return { rows: data ?? [] };
  });

// ---------------- STOCK MOVEMENT HISTORY ----------------
export const listStockMovements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      product_id: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    let q = supabaseAdmin
      .from("stock_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.product_id) q = q.eq("product_id", data.product_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });
