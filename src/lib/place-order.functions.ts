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
  unit_price?: number;
  line_total?: number;
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
      const orderId = typeof data.order.id === "string" ? data.order.id : crypto.randomUUID();
      const orderPayload: Record<string, unknown> = { ...data.order, id: orderId };

      const supabaseUrl =
        process.env.SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL ||
        "https://bgsspipkjeuceftuatue.supabase.co";
      const serviceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_SERVICE_ROLE_KEY;
      const publishableKey =
        process.env.SUPABASE_PUBLISHABLE_KEY ||
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY;

      const key = serviceKey || publishableKey;
      if (!key) {
        const msg = "Missing Supabase server credentials (service role or publishable key)";
        console.error("Order error:", msg);
        return { ok: false as const, error: msg };
      }

      const supabase = createClient<Database>(supabaseUrl, key, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });

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

      // Fire-and-forget: append to Google Sheet (don't block order success).
      // Wrapped in try so a sync throw (e.g. server-fn invoked inside server-fn)
      // never breaks the order response.
      try {
        appendOrderToSheet({ data: { orderId } })?.catch?.((e: unknown) => {
          console.error("[placeOrder] sheet append failed:", e);
        });
      } catch (e) {
        console.error("[placeOrder] sheet append threw:", e);
      }

      return { ok: true as const, orderId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Order error:", e);
      return { ok: false as const, error: `Server error: ${msg}` };
    }
  });
