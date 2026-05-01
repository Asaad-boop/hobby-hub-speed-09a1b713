import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PATHAO_BASE_URL = "https://api-hermes.pathao.com";
const FETCH_TIMEOUT_MS = 20_000;

let cachedToken: { token: string; expiresAt: number } | null = null;

function getEnv() {
  const clientId = process.env.PATHAO_CLIENT_ID;
  const clientSecret = process.env.PATHAO_CLIENT_SECRET;
  const username = process.env.PATHAO_USERNAME;
  const password = process.env.PATHAO_PASSWORD;
  if (!clientId || !clientSecret || !username || !password) {
    throw new Error("Pathao not configured");
  }
  return { clientId, clientSecret, username, password };
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

type PathaoOrderInfoResponse = {
  data?: {
    consignment_id?: string;
    order_status?: string;
    order_status_slug?: string;
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

function toShipmentStatus(s: OrderStatus | null, fallback: ShipmentStatus): ShipmentStatus {
  if (!s) return fallback;
  if (s === "courier_entry") return "pickup_pending";
  if (s === "on_hold") return fallback;
  return s as ShipmentStatus;
}

async function fetchPathaoOrderInfo(consignmentId: string, token: string) {
  const res = await fetchWithTimeout(
    `${PATHAO_BASE_URL}/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`,
    {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    },
  );
  const json = (await res.json().catch(() => ({}))) as PathaoOrderInfoResponse;
  if (!res.ok || !json.data) return null;
  return json.data;
}

export async function syncPathaoStatusesInternal(maxOrders = 200) {
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
    return { ok: true as const, checked: 0, updated: 0, errors: [] };
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
      const newShipmentStatus = toShipmentStatus(
        mapped,
        (sh.status as ShipmentStatus) ?? "in_transit",
      );

      await supabaseAdmin
        .from("courier_shipments")
        .update({
          status: newShipmentStatus,
          last_status_text: info.order_status ?? slug ?? null,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", sh.id);

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

        if (
          cur &&
          !terminalStays.has(cur) &&
          (advanceable.has(cur) || mapped === "delivered" || mapped === "returned")
        ) {
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
