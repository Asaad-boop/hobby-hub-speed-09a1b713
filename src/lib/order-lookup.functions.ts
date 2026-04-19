import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const normalizePhone = (p: string) => p.replace(/\D/g, "").slice(-10);

export const lookupOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; contact: string }) => {
    const orderId = String(input.orderId || "").trim();
    const contact = String(input.contact || "").trim().toLowerCase();
    if (!orderId || orderId.length < 6) throw new Error("Invalid order ID");
    if (!contact) throw new Error("Phone or email required");
    return { orderId, contact };
  })
  .handler(async ({ data }) => {
    const { orderId, contact } = data;
    const isEmail = contact.includes("@");

    // Support short ID prefix (first 8 chars uppercase) or full UUID
    let orderQuery = supabaseAdmin
      .from("orders")
      .select("*, order_items(id,name,image,price,quantity)");

    if (orderId.length === 36) {
      orderQuery = orderQuery.eq("id", orderId);
    } else {
      // Match by short prefix (first 8 chars)
      orderQuery = orderQuery.ilike("id", `${orderId.toLowerCase()}%`);
    }

    const { data: orders, error } = await orderQuery.limit(5);
    if (error || !orders || orders.length === 0) {
      return { ok: false as const, error: "Order not found" };
    }

    // Find matching order by phone or email
    for (const order of orders) {
      if (!isEmail) {
        const inputDigits = normalizePhone(contact);
        const orderDigits = normalizePhone(order.shipping_phone || "");
        if (inputDigits && orderDigits && inputDigits === orderDigits) {
          return { ok: true as const, order };
        }
      } else {
        // Email check via auth.users
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
        if (userData?.user?.email?.toLowerCase() === contact) {
          return { ok: true as const, order };
        }
      }
    }

    return { ok: false as const, error: "Order ID and contact don't match" };
  });
