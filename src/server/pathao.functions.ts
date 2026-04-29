import { createServerFn } from "@tanstack/react-start";

// Pathao Courier API integration.
// We accept credentials in the request body so users can configure them via the
// Settings page (stored in localStorage). Switch to env vars if you want
// secrets to live only on the server.

type CredsAndOrder = {
  creds: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
    storeId: string;
    senderName: string;
    senderPhone: string;
    recipientCityId: string;
    recipientZoneId: string;
  };
  order: {
    merchantOrderId: string;
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    amountToCollect: number; // BDT (0 if prepaid)
    itemDescription: string;
    itemQuantity: number;
    itemWeight: number; // kg
  };
};

async function fetchPathaoToken(c: CredsAndOrder["creds"]): Promise<string> {
  const url = `${c.baseUrl.replace(/\/$/, "")}/aladdin/api/v1/issue-token`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      username: c.username,
      password: c.password,
      grant_type: "password",
    }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access_token) {
    throw new Error(
      `Pathao token failed [${res.status}]: ${data?.message || JSON.stringify(data).slice(0, 200)}`,
    );
  }
  return data.access_token as string;
}

export const createPathaoConsignment = createServerFn({ method: "POST" })
  .inputValidator((d: CredsAndOrder) => d)
  .handler(async ({ data }) => {
    const { creds, order } = data;
    if (!creds.clientId || !creds.clientSecret || !creds.username || !creds.password || !creds.storeId) {
      return { ok: false as const, error: "Pathao credentials missing. Open Settings to configure." };
    }
    try {
      const token = await fetchPathaoToken(creds);
      const url = `${creds.baseUrl.replace(/\/$/, "")}/aladdin/api/v1/orders`;
      const body = {
        store_id: Number(creds.storeId),
        merchant_order_id: order.merchantOrderId,
        sender_name: creds.senderName,
        sender_phone: creds.senderPhone,
        recipient_name: order.recipientName,
        recipient_phone: order.recipientPhone,
        recipient_address: order.recipientAddress,
        recipient_city: Number(creds.recipientCityId),
        recipient_zone: Number(creds.recipientZoneId),
        delivery_type: 48,        // 48 = Normal Delivery
        item_type: 2,             // 2 = Parcel
        item_quantity: order.itemQuantity,
        item_weight: order.itemWeight,
        amount_to_collect: order.amountToCollect,
        item_description: order.itemDescription,
      };
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const result: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false as const,
          error: `Pathao API [${res.status}]: ${result?.message || JSON.stringify(result?.errors || result).slice(0, 250)}`,
        };
      }
      const consignmentId =
        result?.data?.consignment_id ||
        result?.data?.tracking_code ||
        result?.consignment_id ||
        null;
      if (!consignmentId) {
        return { ok: false as const, error: `Pathao returned no tracking id: ${JSON.stringify(result).slice(0, 200)}` };
      }
      return {
        ok: true as const,
        trackingNumber: String(consignmentId),
        merchantOrderId: order.merchantOrderId,
        raw: result?.data ?? result,
      };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Pathao request failed" };
    }
  });
