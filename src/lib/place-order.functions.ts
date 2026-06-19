import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { appendOrderToSheet } from "./google-sheets.functions";
import type { Database } from "@/integrations/supabase/types";


type OrderItemInput = {
  user_id?: string | null;
  product_id: string;
  name: string;
  image: string | null;
  price: number;
  quantity: number;
  variant_id?: string | null;
  variant_label?: string | null;
};

type PlaceOrderInput = {
  order: Record<string, unknown>;
  items: OrderItemInput[];
};

/**
 * Insert a new order + items using the admin client (bypasses RLS).
 *
 * Reason: the public SELECT policy on `orders` was removed for security,
 * so guest checkout `.insert().select("id").single()` fails with PGRST116
 * because anon users can't read the row back. This server fn returns the
 * new order id without relying on client-side SELECT.
 */
export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: PlaceOrderInput) => {
    if (!input?.order || typeof input.order !== "object") {
      throw new Error("Invalid order payload");
    }
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("Order must have at least one item");
    }
    return input;
  })
  .handler(async ({ data }) => {
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_SERVICE_ROLE_KEY;
      const orderId = typeof data.order.id === "string" ? data.order.id : crypto.randomUUID();
      const orderPayload: Record<string, unknown> = { ...data.order, id: orderId };
      const isGuestOrder = orderPayload.is_guest_order === true && orderPayload.user_id == null;
      const supabase = serviceKey
        ? (await import("@/integrations/supabase/client.server")).supabaseAdmin
        : isGuestOrder
          ? createClient<Database>(
              process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://bgsspipkjeuceftuatue.supabase.co",
              process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
              { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
            )
          : null;

      if (!supabase) {
        const error = new Error("Missing Supabase server credentials for authenticated order placement");
        console.error("Order error:", error);
        return { ok: false as const, error: error.message };
      }

      const { error: orderErr } = await supabase
        .from("orders")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(orderPayload as any);

      if (orderErr) {
        console.error("Order error:", orderErr);
        return {
          ok: false as const,
          error: orderErr?.message || "Could not place order",
        };
      }

      const itemsPayload = data.items.map((it) => ({
        ...it,
        order_id: orderId,
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(itemsPayload as any);

      if (itemsErr) {
        console.error("Order error:", itemsErr);
        await supabase.from("orders").delete().eq("id", orderId);
        return {
          ok: false as const,
          error: `Could not save your items: ${itemsErr.message}`,
        };
      }

      // Fire-and-forget: append to Google Sheet (don't block order success)
      appendOrderToSheet({ data: { orderId } }).catch((e) => {
        console.error("[placeOrder] sheet append failed:", e);
      });

      return { ok: true as const, orderId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Order error:", e);
      return { ok: false as const, error: `Server error: ${msg}` };
    }
  });
