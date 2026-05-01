import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Pathao courier integration.
 * Docs: https://merchant.pathao.com/docs/api
 *
 * Flow:
 *  1. Get OAuth access token (cached in memory, ~5h TTL).
 *  2. Create order via /aladdin/api/v1/orders
 *  3. Save tracking + consignment id back to orders + courier_shipments
 */

const PATHAO_BASE_URL = "https://api-hermes.pathao.com";
const FETCH_TIMEOUT_MS = 20_000;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function assertStaff(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error("Authorization check failed");
  const roles = (data ?? []).map((r) => r.role as string);
  const ok = roles.some((r) => r === "admin" || r === "operations" || r === "customer_service");
  if (!ok) throw new Error("Forbidden: staff role required");
}

function getEnv() {
  const clientId = process.env.PATHAO_CLIENT_ID;
  const clientSecret = process.env.PATHAO_CLIENT_SECRET;
  const username = process.env.PATHAO_USERNAME;
  const password = process.env.PATHAO_PASSWORD;
  const storeId = process.env.PATHAO_STORE_ID;

  if (!clientId || !clientSecret || !username || !password || !storeId) {
    throw new Error(
      "Pathao not configured. Add PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET, PATHAO_USERNAME, PATHAO_PASSWORD, PATHAO_STORE_ID secrets.",
    );
  }
  return { clientId, clientSecret, username, password, storeId };
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const { clientId, clientSecret, username, password } = getEnv();
  const res = await fetchWithTimeout(`${PATHAO_BASE_URL}/aladdin/api/v1/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      username,
      password,
      grant_type: "password",
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    message?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(`Pathao auth failed [${res.status}]: ${json.message ?? "unknown"}`);
  }
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 18000) * 1000,
  };
  return json.access_token;
}

type PathaoCreateOrderResponse = {
  code?: number;
  message?: string;
  type?: string;
  data?: {
    consignment_id?: string;
    merchant_order_id?: string;
    order_status?: string;
    delivery_fee?: number;
  };
  errors?: Record<string, string[]>;
};

/** Map our shipping_city / district to Pathao city/zone IDs.
 *  For now we default to Dhaka (city_id=1, zone_id=298 = "Bashundhara R/A" placeholder).
 *  Admin can extend by storing pathao_city_id / pathao_zone_id on bd_areas later.
 */
function inferLocation(order: {
  shipping_city: string | null;
  shipping_district: string | null;
}): { city_id: number; zone_id: number; area_id?: number } {
  const c = (order.shipping_city || order.shipping_district || "").toLowerCase();
  if (c.includes("dhaka")) return { city_id: 1, zone_id: 298 };
  if (c.includes("chittagong") || c.includes("chattogram")) return { city_id: 2, zone_id: 426 };
  if (c.includes("sylhet")) return { city_id: 3, zone_id: 538 };
  if (c.includes("rajshahi")) return { city_id: 4, zone_id: 612 };
  if (c.includes("khulna")) return { city_id: 5, zone_id: 686 };
  if (c.includes("barisal") || c.includes("barishal")) return { city_id: 6, zone_id: 737 };
  if (c.includes("rangpur")) return { city_id: 7, zone_id: 766 };
  if (c.includes("mymensingh")) return { city_id: 8, zone_id: 806 };
  // Default outside Dhaka
  return { city_id: 1, zone_id: 298 };
}

export const sendOrderToPathao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ order_id: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { storeId } = getEnv();

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select(
        `id, shipping_name, shipping_phone, shipping_address, shipping_city,
         shipping_district, shipping_thana, total, payment_method, courier_name,
         tracking_number, order_items(name, quantity)`,
      )
      .eq("id", data.order_id)
      .maybeSingle();
    if (orderErr) throw new Error(orderErr.message);
    if (!order) throw new Error("Order not found");
    if (order.tracking_number) {
      throw new Error(`Already booked: ${order.tracking_number}`);
    }

    // Atomically claim this order so concurrent clicks/bulk runs can't double-book.
    // We write a temporary sentinel into tracking_number; the unique partial index
    // on orders.tracking_number guarantees only one caller wins.
    const claimToken = `PENDING_PATHAO_${order.id.slice(0, 8)}_${Date.now()}`;
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("orders")
      .update({
        tracking_number: claimToken,
        courier_name: "pathao",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .is("tracking_number", null)
      .select("id")
      .maybeSingle();
    if (claimErr) {
      // Unique-violation or similar — another booking already in flight
      throw new Error("Order is already being booked. Please refresh.");
    }
    if (!claimed) {
      throw new Error("Already booked or booking in progress");
    }

    const releaseClaim = async () => {
      await supabaseAdmin
        .from("orders")
        .update({ tracking_number: null, updated_at: new Date().toISOString() })
        .eq("id", order.id)
        .eq("tracking_number", claimToken);
    };

    let consignmentId: string;
    let body: PathaoCreateOrderResponse;
    try {
      const phone = (order.shipping_phone ?? "").replace(/\D/g, "").slice(-11);
      if (!/^01[3-9]\d{8}$/.test(phone)) {
        throw new Error("Invalid recipient phone");
      }
      const itemCount =
        (order.order_items ?? []).reduce(
          (s: number, it: { quantity?: number }) => s + (it.quantity ?? 0),
          0,
        ) || 1;
      const itemDesc =
        (order.order_items ?? [])
          .map((it: { name?: string; quantity?: number }) => `${it.name} x${it.quantity ?? 1}`)
          .join(", ")
          .slice(0, 250) || "Order items";

      const isCOD = (order.payment_method ?? "cod").toLowerCase().includes("cod");
      const loc = inferLocation(order);

      const token = await getAccessToken();
      const payload = {
        store_id: Number(storeId),
        merchant_order_id: order.id.slice(0, 20),
        recipient_name: (order.shipping_name ?? "Customer").slice(0, 100),
        recipient_phone: phone,
        recipient_address:
          [order.shipping_address, order.shipping_thana, order.shipping_city]
            .filter(Boolean)
            .join(", ")
            .slice(0, 220) || "N/A",
        recipient_city: loc.city_id,
        recipient_zone: loc.zone_id,
        recipient_area: loc.area_id,
        delivery_type: 48,
        item_type: 2,
        special_instruction: "",
        item_quantity: itemCount,
        item_weight: 0.5,
        amount_to_collect: isCOD ? Math.round(Number(order.total)) : 0,
        item_description: itemDesc,
      };

      const res = await fetchWithTimeout(`${PATHAO_BASE_URL}/aladdin/api/v1/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      body = (await res.json().catch(() => ({}))) as PathaoCreateOrderResponse;
      if (!res.ok || !body.data?.consignment_id) {
        const errMsg = body.errors
          ? Object.entries(body.errors)
              .map(([k, v]) => `${k}: ${v.join(", ")}`)
              .join("; ")
          : body.message;
        throw new Error(`Pathao order failed [${res.status}]: ${errMsg ?? "unknown"}`);
      }
      consignmentId = body.data.consignment_id;

      // Replace the claim token with the real consignment id
      await supabaseAdmin
        .from("orders")
        .update({
          courier_name: "pathao",
          tracking_number: consignmentId,
          delivery_method: "pathao",
          courier_assigned_at: new Date().toISOString(),
          status: "ready_to_ship",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("tracking_number", claimToken);

      // Upsert shipment record — unique (order_id, provider) prevents duplicates
      await supabaseAdmin.from("courier_shipments").upsert(
        {
          order_id: order.id,
          provider: "pathao",
          tracking_id: consignmentId,
          consignment_id: consignmentId,
          status: "booked",
          booked_at: new Date().toISOString(),
          cod_amount_expected: isCOD ? Math.round(Number(order.total)) : 0,
          delivery_zone: loc.city_id === 1 ? "inside_dhaka" : "outside_dhaka",
          items_breakdown: order.order_items ?? [],
        },
        { onConflict: "order_id,provider" },
      );
    } catch (err) {
      await releaseClaim();
      throw err;
    }

    return {
      ok: true as const,
      consignment_id: consignmentId,
      order_status: body.data?.order_status,
      delivery_fee: body.data?.delivery_fee,
    };
  });

/* ──────────────────────────────────────────────────────────────────────────
 * Pathao status sync
 * ──────────────────────────────────────────────────────────────────────── */

type PathaoOrderInfoResponse = {
  code?: number;
  message?: string;
  data?: {
    consignment_id?: string;
    order_status?: string;
    order_status_slug?: string;
    updated_at?: string;
  };
};

type OrderStatus =
  | "delivered"
  | "partial_delivered"
  | "returned"
  | "on_hold"
  | "cancelled"
  | "in_transit"
  | "courier_entry";

type ShipmentStatus =
  | "booked"
  | "pickup_pending"
  | "in_transit"
  | "delivered"
  | "partial_delivered"
  | "returned"
  | "cancelled"
  | "damaged"
  | "lost"
  | "exchanged";

/**
 * Map Pathao status slug → our internal order_status enum (subset).
 * Returns null if no confident mapping.
 */
function mapPathaoStatus(slug: string | undefined | null): OrderStatus | null {
  if (!slug) return null;
  const s = slug.toLowerCase();
  if (s.includes("delivered") && s.includes("partial")) return "partial_delivered";
  if (s === "delivered" || s.includes("delivered")) return "delivered";
  if (s.includes("return")) return "returned";
  if (s.includes("hold")) return "on_hold";
  if (s.includes("cancel")) return "cancelled";
  if (
    s.includes("transit") ||
    s.includes("on_the_way") ||
    s.includes("on-the-way") ||
    s.includes("at_the_hub") ||
    s.includes("hub") ||
    s.includes("out_for_delivery") ||
    s.includes("delivery_man_assigned")
  )
    return "in_transit";
  if (s.includes("pickup") || s.includes("picked")) return "courier_entry";
  return null;
}

/** Map order-side status → courier_shipments.status enum. */
function toShipmentStatus(s: OrderStatus | null, fallback: ShipmentStatus): ShipmentStatus {
  if (!s) return fallback;
  if (s === "courier_entry") return "pickup_pending";
  if (s === "on_hold") return fallback;
  return s as ShipmentStatus;
}

async function fetchPathaoOrderInfo(
  consignmentId: string,
  token: string,
): Promise<PathaoOrderInfoResponse["data"] | null> {
  const res = await fetchWithTimeout(
    `${PATHAO_BASE_URL}/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const json = (await res.json().catch(() => ({}))) as PathaoOrderInfoResponse;
  if (!res.ok || !json.data) return null;
  return json.data;
}

async function syncPathaoStatusesInternal(maxOrders = 200) {
  // Pull active Pathao shipments that aren't in a terminal state.
  const { data: shipments, error } = await supabaseAdmin
    .from("courier_shipments")
    .select("id, order_id, consignment_id, status")
    .eq("provider", "pathao")
    .not("consignment_id", "is", null)
    .not("status", "in", '("delivered","returned","cancelled")')
    .order("booked_at", { ascending: false })
    .limit(maxOrders);

  if (error) throw new Error(error.message);
  if (!shipments || shipments.length === 0) {
    return { ok: true as const, checked: 0, updated: 0 };
  }

  const token = await getAccessToken();
  let updated = 0;
  const errors: { consignment_id: string; reason: string }[] = [];

  for (const sh of shipments) {
    if (!sh.consignment_id) continue;
    try {
      const info = await fetchPathaoOrderInfo(sh.consignment_id, token);
      if (!info) continue;

      const slug = info.order_status_slug ?? info.order_status ?? null;
      const mapped = mapPathaoStatus(slug);
      const newShipmentStatus = toShipmentStatus(mapped, (sh.status as ShipmentStatus) ?? "in_transit");

      // Update courier_shipments row with latest courier-side state.
      await supabaseAdmin
        .from("courier_shipments")
        .update({
          status: newShipmentStatus,
          last_status_text: info.order_status ?? slug ?? null,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", sh.id);

      // Promote our orders.status only when we have a confident mapping
      // and the new status is "more advanced" than current.
      if (mapped) {
        const { data: ord } = await supabaseAdmin
          .from("orders")
          .select("status")
          .eq("id", sh.order_id)
          .maybeSingle();

        const cur = ord?.status as string | undefined;
        const advanceable = new Set([
          "ready_to_ship",
          "shipped",
          "in_transit",
          "courier_entry",
        ]);
        const terminalStays = new Set([
          "delivered",
          "returned",
          "cancelled",
          "fake",
          "partial_delivered",
        ]);

        if (cur && !terminalStays.has(cur) && (advanceable.has(cur) || mapped === "delivered" || mapped === "returned")) {
          await supabaseAdmin
            .from("orders")
            .update({ status: mapped, updated_at: new Date().toISOString() })
            .eq("id", sh.order_id);
        }
      }

      updated += 1;
    } catch (e) {
      errors.push({
        consignment_id: sh.consignment_id,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return {
    ok: true as const,
    checked: shipments.length,
    updated,
    errors: errors.slice(0, 20),
  };
}

/** Manual trigger from admin UI. Staff-only. */
export const syncPathaoStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    return syncPathaoStatusesInternal(200);
  });

/** Internal entry-point used by the cron route (no auth — protected by route). */
export async function runPathaoStatusSync() {
  return syncPathaoStatusesInternal(300);
}
