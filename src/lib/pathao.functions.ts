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

/* ──────────────────────────────────────────────────────────────────────────
 * Dynamic location resolution via Pathao API.
 * Pathao requires the merchant's actual numeric city/zone IDs which differ
 * per account. We fetch & cache them at runtime.
 * ────────────────────────────────────────────────────────────────────────*/

type PathaoCity = { city_id: number; city_name: string };
type PathaoZone = { zone_id: number; zone_name: string };

let cityCache: { data: PathaoCity[]; expiresAt: number } | null = null;
const zoneCache = new Map<number, { data: PathaoZone[]; expiresAt: number }>();
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function pathaoGet<T>(path: string, token: string): Promise<T> {
  const res = await fetchWithTimeout(`${PATHAO_BASE_URL}${path}`, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const json = (await res.json().catch(() => ({}))) as { data?: { data?: T } };
  if (!res.ok || !json.data?.data) {
    throw new Error(`Pathao GET ${path} failed [${res.status}]`);
  }
  return json.data.data;
}

async function getCities(token: string): Promise<PathaoCity[]> {
  if (cityCache && cityCache.expiresAt > Date.now()) return cityCache.data;
  const data = await pathaoGet<PathaoCity[]>("/aladdin/api/v1/city-list", token);
  cityCache = { data, expiresAt: Date.now() + TTL_MS };
  return data;
}

async function getZones(cityId: number, token: string): Promise<PathaoZone[]> {
  const cached = zoneCache.get(cityId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const data = await pathaoGet<PathaoZone[]>(
    `/aladdin/api/v1/cities/${cityId}/zone-list`,
    token,
  );
  zoneCache.set(cityId, { data, expiresAt: Date.now() + TTL_MS });
  return data;
}

function normalize(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Map common BD city/district names to Pathao's city naming. */
function cityAliases(input: string): string[] {
  const n = normalize(input);
  const aliases: string[] = [n];
  if (n.includes("chittagong") || n.includes("chattogram")) aliases.push("chittagong");
  if (n.includes("comilla") || n.includes("cumilla")) aliases.push("cumilla");
  if (n.includes("bogra") || n.includes("bogura")) aliases.push("bogra");
  if (n.includes("barishal") || n.includes("barisal")) aliases.push("barisal");
  if (n.includes("jessore") || n.includes("jashore")) aliases.push("jashore");
  // Dhaka area suburbs / thanas → Dhaka city
  const dhakaSubs = [
    "uttara", "mirpur", "gulshan", "banani", "dhanmondi", "mohammadpur",
    "khilgaon", "badda", "rampura", "motijheel", "tejgaon", "shyamoli",
    "farmgate", "bashundhara", "savar", "keraniganj", "jatrabari",
  ];
  if (dhakaSubs.some((s) => n.includes(s))) aliases.push("dhaka");
  return aliases;
}

async function resolveLocation(
  order: {
    shipping_city: string | null;
    shipping_district: string | null;
    shipping_thana: string | null;
    shipping_address: string | null;
  },
  token: string,
): Promise<{ city_id: number; zone_id: number }> {
  const cities = await getCities(token);

  // 1. Try district first (more reliable city-level), then city
  const candidates = [
    ...cityAliases(order.shipping_district ?? ""),
    ...cityAliases(order.shipping_city ?? ""),
  ];

  let matchedCity: PathaoCity | undefined;
  for (const cand of candidates) {
    if (!cand) continue;
    matchedCity = cities.find((c) => normalize(c.city_name) === cand);
    if (matchedCity) break;
    matchedCity = cities.find((c) => normalize(c.city_name).includes(cand));
    if (matchedCity) break;
  }
  if (!matchedCity) {
    // Default to Dhaka so booking still goes through; merchant can edit on Pathao side.
    matchedCity = cities.find((c) => normalize(c.city_name) === "dhaka") ?? cities[0];
  }
  if (!matchedCity) throw new Error("Pathao city list empty");

  const zones = await getZones(matchedCity.city_id, token);
  if (!zones.length) throw new Error(`No zones for city ${matchedCity.city_name}`);

  // Try to match thana/area against zones
  const thana = normalize(order.shipping_thana ?? "");
  const addr = normalize(order.shipping_address ?? "");
  let matchedZone: PathaoZone | undefined;
  if (thana) {
    matchedZone =
      zones.find((z) => normalize(z.zone_name) === thana) ??
      zones.find((z) => normalize(z.zone_name).includes(thana)) ??
      zones.find((z) => thana.includes(normalize(z.zone_name).split(" ")[0])) ??
      undefined;
  }
  if (!matchedZone && addr) {
    matchedZone = zones.find((z) => addr.includes(normalize(z.zone_name)));
  }
  if (!matchedZone) matchedZone = zones[0]; // fallback: first zone of the city

  return { city_id: matchedCity.city_id, zone_id: matchedZone.zone_id };
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
 * Pathao status sync — implementation lives in pathao-sync.server.ts
 * ──────────────────────────────────────────────────────────────────────── */

/** Manual trigger from admin UI. Staff-only. */
export const syncPathaoStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const { syncPathaoStatusesInternal } = await import("./pathao-sync.server");
    return syncPathaoStatusesInternal(200);
  });

