import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
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

function isDuplicateKeyError(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  return err?.code === "23505" || /duplicate key/i.test(err?.message ?? "");
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

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

      const itemsPayload = data.items.map((it) => {
        const quantity = Math.max(1, Math.floor(Number(it.quantity)));
        const price = Number(it.price);
        const unitPrice = Number(it.unit_price ?? it.price);
        const lineTotal = Number(it.line_total ?? price * quantity);

        if (!it.product_id || !it.name || !isValidNumber(price) || !isValidNumber(unitPrice) || !isValidNumber(lineTotal)) {
          throw new Error("Invalid order item payload");
        }

        return {
          ...it,
          order_id: orderId,
          quantity,
          price,
          unit_price: unitPrice,
          line_total: lineTotal,
        };
      });

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

      const insertItems = async (allowExistingOrder: boolean) => {
        const { error: itemsErr } = await supabase
          .from("order_items")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(itemsPayload as any);

        if (itemsErr) {
          console.error("Order error:", itemsErr);
          if (!allowExistingOrder) await supabase.from("orders").delete().eq("id", orderId);
          return {
            ok: false as const,
            error: `Could not save your items: ${itemsErr.message}`,
          };
        }

        return { ok: true as const, orderId };
      };

      const { error: orderErr } = await supabase
        .from("orders")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(orderPayload as any);

      if (orderErr) {
        if (isDuplicateKeyError(orderErr)) {
          const { count, error: countErr } = await supabase
            .from("order_items")
            .select("id", { count: "exact", head: true })
            .eq("order_id", orderId);

          if (!countErr && typeof count === "number" && count > 0) {
            return { ok: true as const, orderId };
          }

          const retryItems = await insertItems(true);
          if (retryItems.ok) return retryItems;
          return retryItems;
        }

        console.error("Order error:", orderErr);
        return {
          ok: false as const,
          error: orderErr?.message || "Could not place order",
        };
      }

      const itemInsertRes = await insertItems(false);
      if (!itemInsertRes.ok) return itemInsertRes;

      // Fire-and-forget: append to Google Sheet (don't block order success).
      // Wrapped in try so a sync throw (e.g. server-fn invoked inside server-fn)
      // never breaks the order response.
      void import("./google-sheets.functions")
        .then(({ appendOrderToSheetById }) => appendOrderToSheetById(orderId))
        .catch((e: unknown) => {
          console.error("[placeOrder] sheet append failed:", e);
        });

      return { ok: true as const, orderId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Order error:", e);
      return { ok: false as const, error: `Server error: ${msg}` };
    }
  });
