import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Returns order details for the order-confirmation page.
 *
 * Security model: an order's UUID is an unguessable cryptographic identifier
 * (~122 bits of entropy). The success page is reached immediately after a
 * customer creates an order; the URL is shared only with that customer.
 * We additionally only return data for orders created within the last 24h
 * to limit the exposure window if a URL is leaked.
 *
 * For older orders the customer must sign in and look it up via /track.
 */
export const getOrderForSuccess = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, status, total, subtotal, shipping_fee, payment_method, created_at, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_district, order_items(id,name,image,price,quantity)",
      )
      .eq("id", data.id)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (error) {
      return { ok: false as const, error: "Could not load order" };
    }
    if (!order) {
      return { ok: false as const, error: "Order not found or expired" };
    }
    return { ok: true as const, order };
  });
