import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Pathao webhook events — see https://merchant.pathao.com/courier/developer-api
// Pathao sends POST with header `X-PATHAO-Signature-Key` containing the
// shared secret. We compare it to PATHAO_WEBHOOK_SECRET (env).
//
// Pathao expects the receiver to echo back the same key in the response
// header `X-Pathao-Merchant-Webhook-Integration-Secret` to confirm receipt.

const PATHAO_RESPONSE_HEADER = "X-Pathao-Merchant-Webhook-Integration-Secret";

// Map Pathao event -> internal order status
function mapStatus(event: string): string | null {
  const e = (event || "").toLowerCase();
  if (e.includes("delivered")) return "delivered";
  if (e.includes("returned") || e.includes("return")) return "returned";
  if (e.includes("cancel")) return "cancelled";
  if (e.includes("picked") || e.includes("in_transit") || e.includes("on_the_way") || e.includes("hub"))
    return "in_transit";
  if (e.includes("pickup_requested") || e.includes("assigned")) return "shipped";
  return null;
}

export const Route = createFileRoute("/api/public/webhooks/pathao")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PATHAO_WEBHOOK_SECRET;
        if (!secret) {
          return new Response(
            JSON.stringify({ ok: false, error: "PATHAO_WEBHOOK_SECRET not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        // Signature verification
        const headerSig =
          request.headers.get("x-pathao-signature-key") ||
          request.headers.get("X-PATHAO-Signature-Key");
        if (!headerSig || headerSig !== secret) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Pathao payload shape (typical):
        // {
        //   event: "order.delivered",
        //   consignment_id: "DA191219ABCD",
        //   merchant_order_id: "...",
        //   order_status: "Delivered",
        //   updated_at: "...",
        //   ... other fields
        // }
        const consignmentId: string | undefined =
          payload?.consignment_id || payload?.data?.consignment_id;
        const orderStatus: string | undefined =
          payload?.order_status || payload?.event || payload?.data?.order_status;

        if (!consignmentId) {
          // Acknowledge anyway so Pathao doesn't keep retrying
          return new Response(
            JSON.stringify({ ok: true, ignored: "no consignment_id" }),
            {
              status: 202,
              headers: {
                "Content-Type": "application/json",
                [PATHAO_RESPONSE_HEADER]: secret,
              },
            },
          );
        }

        // Find shipment
        const { data: shipment } = await supabaseAdmin
          .from("pathao_shipments")
          .select("id, order_id")
          .eq("consignment_id", consignmentId)
          .maybeSingle();

        if (!shipment) {
          return new Response(
            JSON.stringify({ ok: true, ignored: "shipment not found" }),
            {
              status: 202,
              headers: {
                "Content-Type": "application/json",
                [PATHAO_RESPONSE_HEADER]: secret,
              },
            },
          );
        }

        // Update shipment
        await supabaseAdmin
          .from("pathao_shipments")
          .update({
            order_status: orderStatus ?? null,
            response_raw: payload,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", shipment.id);

        // Update internal order status
        const internal = mapStatus(orderStatus ?? "");
        if (internal) {
          await supabaseAdmin
            .from("orders")
            .update({ status: internal as any })
            .eq("id", shipment.order_id);
        }

        return new Response(
          JSON.stringify({ ok: true, orderId: shipment.order_id, status: orderStatus }),
          {
            status: 202,
            headers: {
              "Content-Type": "application/json",
              [PATHAO_RESPONSE_HEADER]: secret,
            },
          },
        );
      },
      // Pathao sometimes pings GET to verify URL
      GET: async () => {
        return new Response(
          JSON.stringify({ ok: true, service: "pathao-webhook" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
