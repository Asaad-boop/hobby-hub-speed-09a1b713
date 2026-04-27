// Sends a Telegram notification when a new order is created.
// Triggered by a Postgres trigger via pg_net on orders INSERT.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtTk(n: number): string {
  return `৳${Number(n || 0).toLocaleString("en-BD")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      return new Response(JSON.stringify({ error: "Telegram secrets missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const orderId: string | undefined = body.order_id ?? body.record?.id;

    if (!orderId) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order + items via REST (service role bypasses RLS)
    const orderRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=*`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const orders = await orderRes.json();
    const order = orders?.[0];
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const itemsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/order_items?order_id=eq.${orderId}&select=name,quantity,price,variant_label`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const items: Array<{ name: string; quantity: number; price: number; variant_label?: string | null }> =
      await itemsRes.json();

    const customerName = order.shipping_name || order.guest_name || "Customer";
    const phone = order.shipping_phone || order.guest_phone || "—";
    const address = [order.shipping_address, order.shipping_city, order.shipping_district]
      .filter(Boolean)
      .join(", ") || "—";
    const shortId = String(order.id).slice(0, 8).toUpperCase();

    const itemsList = items
      .map(
        (it) =>
          `• ${escapeHtml(it.name)}${it.variant_label ? ` (${escapeHtml(it.variant_label)})` : ""} × ${it.quantity} — ${fmtTk(it.price * it.quantity)}`
      )
      .join("\n") || "—";

    const text =
      `🔔 <b>NEW ORDER #${shortId}</b>\n\n` +
      `👤 <b>${escapeHtml(customerName)}</b>\n` +
      `📞 ${escapeHtml(phone)}\n` +
      `📍 ${escapeHtml(address)}\n\n` +
      `🛒 <b>Items:</b>\n${itemsList}\n\n` +
      `💰 Subtotal: ${fmtTk(order.subtotal)}\n` +
      `🚚 Shipping: ${fmtTk(order.shipping_fee)}\n` +
      (Number(order.discount_amount) > 0 ? `🎟️ Discount: -${fmtTk(order.discount_amount)}\n` : "") +
      `<b>Total: ${fmtTk(order.total)}</b>\n` +
      `💳 ${escapeHtml(order.payment_method || "COD")}` +
      (order.notes ? `\n\n📝 ${escapeHtml(order.notes)}` : "");

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const tgData = await tgRes.json();

    if (!tgRes.ok) {
      console.error("Telegram error:", tgData);
      return new Response(JSON.stringify({ error: "Telegram failed", details: tgData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-order-telegram error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
