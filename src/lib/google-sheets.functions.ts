import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SPREADSHEET_ID = "1MG2swEO4rZYZxUV8btM0U6UDQGQKx2mRS_iOVn86wF0";
const SHEET_NAME = "Orders";

const HEADER_ROW = [
  "Order ID",
  "Date",
  "Customer",
  "Phone",
  "Email",
  "Address",
  "City",
  "District",
  "Thana",
  "Items",
  "Quantity",
  "Subtotal",
  "Shipping",
  "Discount",
  "Total",
  "Payment Method",
  "Status",
  "Tracking",
  "Notes",
];

function authHeaders() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const SHEETS_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  if (!SHEETS_KEY) throw new Error("GOOGLE_SHEETS_API_KEY not configured");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": SHEETS_KEY,
    "Content-Type": "application/json",
  };
}

async function ensureHeader() {
  // Read first row
  const res = await fetch(
    `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:Z1`,
    { headers: authHeaders() },
  );
  if (!res.ok) {
    const body = await res.text();
    // If sheet/tab missing, try to create it
    if (body.includes("Unable to parse range") || res.status === 400) {
      await fetch(
        `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
          }),
        },
      );
    } else if (res.status !== 200) {
      throw new Error(`Sheets read failed [${res.status}]: ${body}`);
    }
  }
  const data = res.ok ? await res.json() : { values: [] };
  const firstRow: string[] | undefined = data.values?.[0];
  if (!firstRow || firstRow.length === 0) {
    // Write header
    await fetch(
      `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ values: [HEADER_ROW] }),
      },
    );
  }
}

type OrderForSheet = {
  id: string;
  created_at: string;
  shipping_name: string | null;
  guest_name: string | null;
  shipping_phone: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_district: string | null;
  shipping_thana: string | null;
  subtotal: number | null;
  shipping_fee: number | null;
  discount_amount: number | null;
  total: number;
  payment_method: string | null;
  status: string;
  tracking_number: string | null;
  admin_notes: string | null;
};

function rowFromOrder(o: OrderForSheet, itemsSummary: string, totalQty: number): (string | number)[] {
  return [
    o.id.slice(0, 8),
    new Date(o.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }),
    o.shipping_name || o.guest_name || "",
    o.shipping_phone || o.guest_phone || "",
    o.guest_email || "",
    o.shipping_address || "",
    o.shipping_city || "",
    o.shipping_district || "",
    o.shipping_thana || "",
    itemsSummary,
    totalQty,
    Number(o.subtotal ?? 0),
    Number(o.shipping_fee ?? 0),
    Number(o.discount_amount ?? 0),
    Number(o.total ?? 0),
    o.payment_method || "COD",
    o.status,
    o.tracking_number || "",
    o.admin_notes || "",
  ];
}

async function fetchOrderRows(orderIds: string[]): Promise<(string | number)[][]> {
  if (orderIds.length === 0) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id,created_at,shipping_name,guest_name,shipping_phone,guest_phone,guest_email,shipping_address,shipping_city,shipping_district,shipping_thana,subtotal,shipping_fee,discount_amount,total,payment_method,status,tracking_number,admin_notes",
    )
    .in("id", orderIds);
  if (error) throw new Error(error.message);

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("order_id,name,quantity")
    .in("order_id", orderIds);

  const grouped = new Map<string, { summary: string; qty: number }>();
  for (const it of items ?? []) {
    const g = grouped.get(it.order_id) || { summary: "", qty: 0 };
    g.summary += (g.summary ? "; " : "") + `${it.name} x${it.quantity}`;
    g.qty += Number(it.quantity);
    grouped.set(it.order_id, g);
  }

  return (orders ?? []).map((o) => {
    const g = grouped.get(o.id) || { summary: "", qty: 0 };
    return rowFromOrder(o as OrderForSheet, g.summary, g.qty);
  });
}

export async function appendOrderToSheetById(orderId: string) {
  const rows = await fetchOrderRows([orderId]);
  return appendRows(rows);
}

async function appendRows(rows: (string | number)[][]) {
  if (rows.length === 0) return { appended: 0 };
  await ensureHeader();
  const res = await fetch(
    `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ values: rows }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets append failed [${res.status}]: ${body}`);
  }
  return { appended: rows.length };
}

/** Append a single order to the sheet. Called automatically after placeOrder. */
export const appendOrderToSheet = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    try {
      const result = await appendOrderToSheetById(data.orderId);
      return { ok: true as const, ...result };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[appendOrderToSheet]", msg);
      return { ok: false as const, error: msg };
    }
  });

/** Bulk export — admin button. Appends last N orders (default 500). */
export const syncOrdersToSheet = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ limit: z.number().min(1).max(2000).optional() }).parse(input ?? {}))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const limit = data.limit ?? 500;
      const { data: orders, error } = await supabaseAdmin
        .from("orders")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);

      // Clear existing data rows (keep header)
      await ensureHeader();
      await fetch(
        `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A2:Z:clear`,
        { method: "POST", headers: authHeaders() },
      );

      const ids = (orders ?? []).map((o) => o.id).reverse(); // oldest first
      const rows = await fetchOrderRows(ids);
      const result = await appendRows(rows);
      return { ok: true as const, ...result };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[syncOrdersToSheet]", msg);
      return { ok: false as const, error: msg };
    }
  });
