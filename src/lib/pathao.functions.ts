import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin: any = _supabaseAdmin;

const PATHAO_BASE = "https://api-hermes.pathao.com";

// ---------------- Token management ----------------

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const { data: cached } = await supabaseAdmin
      .from("pathao_auth_cache")
      .select("access_token, expires_at")
      .eq("id", 1)
      .maybeSingle();

    if (cached?.access_token && cached.expires_at) {
      const exp = new Date(cached.expires_at).getTime();
      // keep 60s buffer
      if (exp - Date.now() > 60_000) return cached.access_token;
    }
  }

  const clientId = process.env.PATHAO_CLIENT_ID;
  const clientSecret = process.env.PATHAO_CLIENT_SECRET;
  const username = process.env.PATHAO_USERNAME;
  const password = process.env.PATHAO_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error("Missing Pathao credentials. Configure PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET, PATHAO_USERNAME, PATHAO_PASSWORD.");
  }

  const res = await fetch(`${PATHAO_BASE}/aladdin/api/v1/issue-token`, {
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

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.access_token) {
    throw new Error(`Pathao auth failed (${res.status}): ${JSON.stringify(body)}`);
  }

  const expiresIn = Number(body.expires_in ?? 432000); // default 5 days
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  await supabaseAdmin
    .from("pathao_auth_cache")
    .upsert({
      id: 1,
      access_token: body.access_token,
      refresh_token: body.refresh_token ?? null,
      token_type: body.token_type ?? "Bearer",
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });

  return body.access_token as string;
}

async function pathaoFetch(path: string, init: RequestInit = {}, retry = true): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${PATHAO_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && retry) {
    await getAccessToken(true);
    return pathaoFetch(path, init, false);
  }
  if (!res.ok) {
    const msg = body?.message || body?.error || JSON.stringify(body);
    throw new Error(`Pathao API error (${res.status}): ${msg}`);
  }
  return body;
}

// ---------------- Staff guard ----------------

async function requireStaff(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role);
  const ok = roles.includes("admin") || roles.includes("operations");
  if (!ok) throw new Error("Not authorized");
}

// ---------------- City / Zone / Area lookup ----------------

export const pathaoListCities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const body = await pathaoFetch(`/aladdin/api/v1/city-list`);
    return { ok: true as const, cities: body?.data?.data ?? [] };
  });

export const pathaoListZones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ cityId: z.number().int().positive() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.userId);
    const body = await pathaoFetch(`/aladdin/api/v1/cities/${data.cityId}/zone-list`);
    return { ok: true as const, zones: body?.data?.data ?? [] };
  });

export const pathaoListAreas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ zoneId: z.number().int().positive() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.userId);
    const body = await pathaoFetch(`/aladdin/api/v1/zones/${data.zoneId}/area-list`);
    return { ok: true as const, areas: body?.data?.data ?? [] };
  });

export const pathaoListStores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const body = await pathaoFetch(`/aladdin/api/v1/stores`);
    return { ok: true as const, stores: body?.data?.data ?? [] };
  });

// ---------------- Price calculator (optional helper) ----------------

export const pathaoCalculatePrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      cityId: z.number().int(),
      zoneId: z.number().int(),
      weight: z.number().min(0.5).max(10),
      itemType: z.number().int().default(2),
      deliveryType: z.number().int().default(48),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.userId);
    const storeId = Number(process.env.PATHAO_STORE_ID);
    const body = await pathaoFetch(`/aladdin/api/v1/merchant/price-plan`, {
      method: "POST",
      body: JSON.stringify({
        store_id: storeId,
        item_type: data.itemType,
        delivery_type: data.deliveryType,
        item_weight: data.weight,
        recipient_city: data.cityId,
        recipient_zone: data.zoneId,
      }),
    });
    return { ok: true as const, data: body?.data ?? body };
  });

// ---------------- Send single order ----------------

const sendOrderInput = z.object({
  orderId: z.string().uuid(),
  cityId: z.number().int().positive(),
  zoneId: z.number().int().positive(),
  areaId: z.number().int().positive().optional(),
  deliveryType: z.number().int().default(48), // 48 = Normal, 12 = Same-day
  itemType: z.number().int().default(2), // 2 = Parcel
  itemWeight: z.number().min(0.5).max(10).default(0.5),
  itemQuantity: z.number().int().min(1).default(1),
  specialInstruction: z.string().max(500).optional(),
});

export const pathaoSendOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => sendOrderInput.parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.userId);

    const storeId = Number(process.env.PATHAO_STORE_ID);
    if (!storeId) throw new Error("PATHAO_STORE_ID not configured");

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_thana, total, payment_method, order_items(name, quantity)")
      .eq("id", data.orderId)
      .maybeSingle();

    if (orderErr || !order) throw new Error("Order not found");

    // Prevent duplicate sends
    const { data: existing } = await supabaseAdmin
      .from("pathao_shipments")
      .select("consignment_id")
      .eq("order_id", order.id)
      .maybeSingle();
    if (existing?.consignment_id) {
      throw new Error(`Already sent to Pathao (Consignment: ${existing.consignment_id})`);
    }

    const isCOD = (order.payment_method ?? "cod").toLowerCase().includes("cod");
    const amountToCollect = isCOD ? Math.round(Number(order.total) || 0) : 0;
    const itemDescription =
      (order.order_items ?? []).map((i: any) => `${i.name} x${i.quantity}`).join(", ").slice(0, 200) || "Order items";

    const merchantOrderId = order.id.slice(0, 8).toUpperCase();

    const payload: Record<string, any> = {
      store_id: storeId,
      merchant_order_id: merchantOrderId,
      recipient_name: order.shipping_name || "Customer",
      recipient_phone: (order.shipping_phone || "").replace(/\D/g, "").slice(-11),
      recipient_address: order.shipping_address || "N/A",
      recipient_city: data.cityId,
      recipient_zone: data.zoneId,
      delivery_type: data.deliveryType,
      item_type: data.itemType,
      item_quantity: data.itemQuantity,
      item_weight: data.itemWeight,
      amount_to_collect: amountToCollect,
      item_description: itemDescription,
    };
    if (data.areaId) payload.recipient_area = data.areaId;
    if (data.specialInstruction) payload.special_instruction = data.specialInstruction;

    const body = await pathaoFetch(`/aladdin/api/v1/orders`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const consignmentId = body?.data?.consignment_id ?? null;
    const orderStatus = body?.data?.order_status ?? null;
    const deliveryFee = Number(body?.data?.delivery_fee ?? 0);

    await supabaseAdmin.from("pathao_shipments").upsert({
      order_id: order.id,
      merchant_order_id: merchantOrderId,
      consignment_id: consignmentId,
      order_status: orderStatus,
      delivery_fee: deliveryFee,
      payload_sent: payload,
      response_raw: body,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: "order_id" });

    // Update order tracking number
    if (consignmentId) {
      await supabaseAdmin
        .from("orders")
        .update({
          tracking_number: consignmentId,
          courier_name: "Pathao",
          status: "shipped" as any,
        })
        .eq("id", order.id);
    }

    return { ok: true as const, consignmentId, orderStatus, deliveryFee };
  });

// ---------------- Bulk send ----------------

export const pathaoBulkSend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      orderIds: z.array(z.string().uuid()).min(1).max(50),
      cityId: z.number().int().positive(),
      zoneId: z.number().int().positive(),
      areaId: z.number().int().positive().optional(),
      deliveryType: z.number().int().default(48),
      itemType: z.number().int().default(2),
      itemWeight: z.number().min(0.5).max(10).default(0.5),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.userId);

    const results: Array<{ orderId: string; ok: boolean; consignmentId?: string; error?: string }> = [];

    for (const orderId of data.orderIds) {
      try {
        const r = await pathaoSendOrder({
          data: {
            orderId,
            cityId: data.cityId,
            zoneId: data.zoneId,
            areaId: data.areaId,
            deliveryType: data.deliveryType,
            itemType: data.itemType,
            itemWeight: data.itemWeight,
            itemQuantity: 1,
          },
        } as any);
        results.push({ orderId, ok: true, consignmentId: r.consignmentId ?? undefined });
      } catch (e: any) {
        results.push({ orderId, ok: false, error: e?.message ?? String(e) });
      }
    }

    return { ok: true as const, results };
  });

// ---------------- Sync status ----------------

export const pathaoSyncOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ orderId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.userId);

    const { data: shipment } = await supabaseAdmin
      .from("pathao_shipments")
      .select("consignment_id")
      .eq("order_id", data.orderId)
      .maybeSingle();

    if (!shipment?.consignment_id) {
      throw new Error("This order has not been sent to Pathao yet");
    }

    const body = await pathaoFetch(`/aladdin/api/v1/orders/${shipment.consignment_id}/info`);
    const info = body?.data ?? {};

    await supabaseAdmin
      .from("pathao_shipments")
      .update({
        order_status: info.order_status ?? null,
        delivery_fee: Number(info.delivery_fee ?? 0),
        cod_fee: Number(info.cod_fee ?? 0),
        invoice_id: info.invoice_id ?? null,
        response_raw: body,
        last_synced_at: new Date().toISOString(),
      })
      .eq("order_id", data.orderId);

    // Map Pathao status -> internal status
    const status = String(info.order_status ?? "").toLowerCase();
    let internal: string | null = null;
    if (status.includes("delivered")) internal = "delivered";
    else if (status.includes("returned") || status.includes("return")) internal = "returned";
    else if (status.includes("in_transit") || status.includes("on_the_way") || status.includes("picked")) internal = "in_transit";
    else if (status.includes("cancel")) internal = "cancelled";

    if (internal) {
      await supabaseAdmin
        .from("orders")
        .update({ status: internal as any })
        .eq("id", data.orderId);
    }

    return { ok: true as const, status: info.order_status, info };
  });

export const pathaoSyncAllPending = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);

    const { data: rows } = await supabaseAdmin
      .from("pathao_shipments")
      .select("order_id, consignment_id, order_status")
      .not("consignment_id", "is", null)
      .not("order_status", "in", "(Delivery_Confirmed,Return_Confirmed,Cancel)")
      .limit(50);

    const list = rows ?? [];
    let updated = 0;
    for (const r of list) {
      try {
        await pathaoSyncOrder({ data: { orderId: r.order_id } } as any);
        updated++;
      } catch {
        /* keep going */
      }
    }
    return { ok: true as const, total: list.length, updated };
  });

// ---------------- Get shipment for an order ----------------

export const pathaoGetShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ orderId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireStaff(context.userId);
    const { data: shipment } = await supabaseAdmin
      .from("pathao_shipments")
      .select("*")
      .eq("order_id", data.orderId)
      .maybeSingle();
    return { ok: true as const, shipment };
  });
