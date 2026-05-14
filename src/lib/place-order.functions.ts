import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type OrderItemInput = {
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
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.ADMIN_SERVICE_ROLE_KEY) {
      return { ok: false as const, error: "Order service temporarily unavailable" };
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(data.order as any)
      .select("id")
      .single();

    if (orderErr || !order) {
      return {
        ok: false as const,
        error: orderErr?.message || "Could not place order",
      };
    }

    const itemsPayload = data.items.map((it) => ({
      ...it,
      order_id: order.id,
    }));

    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(itemsPayload as any);

    if (itemsErr) {
      // Best-effort cleanup of the orphaned order row
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      return {
        ok: false as const,
        error: `Could not save your items: ${itemsErr.message}`,
      };
    }

    return { ok: true as const, orderId: order.id as string };
  });
