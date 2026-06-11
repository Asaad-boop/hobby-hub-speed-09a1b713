import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

const normalizePhone = (p: string) => p.replace(/\D/g, "").slice(-10);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fetch an order by full UUID. The 36-char UUID acts as the unguessable
 * token, so this is safe to call without auth (used by guest order-success
 * and track pages). Returns ok:false if not found.
 */
export const getOrderByFullId = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string }) => {
    const orderId = String(input.orderId || "").trim().toLowerCase();
    if (!UUID_RE.test(orderId)) throw new Error("Invalid order id");
    return { orderId };
  })
  .handler(async ({ data }) => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.ADMIN_SERVICE_ROLE_KEY) {
      return { ok: false as const, error: "Order lookup temporarily unavailable" };
    }
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(id,product_id,name,image,price,quantity,variant_label)")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return { ok: false as const, error: "Order not found" };
    return { ok: true as const, order };
  });

/**
 * Order lookup — REQUIRES AUTHENTICATION.
 * Returns ok:false with a friendly error instead of throwing, so the
 * client never sees a raw Response/blank screen.
 */
export const lookupOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => {
    const query = String(input.query || "").trim();
    if (!query) throw new Error("Please enter Order ID, phone or email");
    if (query.length > 254) throw new Error("Input too long");
    return { query };
  })
  .handler(async ({ data }) => {
    const SUPABASE_URL = "https://bgsspipkjeuceftuatue.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnc3NwaXBramV1Y2VmdHVhdHVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDcyMzIsImV4cCI6MjA5MTgyMzIzMn0.h6aRTBUhTvEvKCx8M-lvyA2BCBQbhvWMWKgn8dIyilc";
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.ADMIN_SERVICE_ROLE_KEY) {
      return {
        ok: false as const,
        code: "unavailable" as const,
        error: "Order tracking is temporarily unavailable. Please try again in a moment.",
      };
    }

    // Optional auth — staff get broader access; guests can still track by phone or full Order ID
    let userId: string | null = null;
    let isStaff = false;
    const authHeader = getRequestHeader("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const authedClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data: claimsData } = await authedClient.auth.getClaims(token);
      if (claimsData?.claims?.sub) {
        userId = claimsData.claims.sub;
        const { data: rolesRow } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        const roles = (rolesRow ?? []).map((r: any) => r.role);
        isStaff =
          roles.includes("admin") ||
          roles.includes("customer_service") ||
          roles.includes("operations");
      }
    }

    const { query } = data;
    const isEmail = query.includes("@");
    const digits = normalizePhone(query);
    const isPhone = !isEmail && digits.length >= 10;
    // Order ID: accept full UUID (36) OR a hex prefix of at least 8 chars.
    // 8 hex chars = ~4 billion combinations — safe against enumeration, and matches
    // the short ID we display to customers in the UI/emails.
    const hexQuery = query.toLowerCase().replace(/[^0-9a-f]/g, "");
    const isFullUuid = query.length === 36 && UUID_RE.test(query);
    const isShortId =
      !isEmail && !isPhone && !isFullUuid && hexQuery.length >= 8 && /^[0-9a-f]+$/.test(hexQuery);

    const baseSelect = "*, order_items(id,product_id,name,image,price,quantity,variant_label)";

    // Lookup by full Order ID — UUID acts as unguessable token, safe for guests
    if (isFullUuid) {
      let q = supabaseAdmin.from("orders").select(baseSelect).eq("id", query);
      if (userId && !isStaff) q = q.eq("user_id", userId);
      const { data: orders } = await q.limit(1);
      if (orders && orders.length > 0)
        return { ok: true as const, order: orders[0] };
      return { ok: false as const, error: "No order found with that Order ID" };
    }

    // Lookup by short Order ID prefix — must be unique to return.
    if (isShortId) {
      let q = supabaseAdmin
        .from("orders")
        .select(baseSelect)
        .or(`id::text.like.${hexQuery}%`);
      if (userId && !isStaff) q = q.eq("user_id", userId);
      const { data: orders } = await q.limit(2);
      if (orders && orders.length === 1)
        return { ok: true as const, order: orders[0] };
      if (orders && orders.length > 1)
        return {
          ok: false as const,
          error: "Multiple orders match that ID. Please enter the full Order ID.",
        };
      return { ok: false as const, error: "No order found with that Order ID" };
    }

    // Lookup by phone — phone itself is the credential the guest has
    if (isPhone) {
      let q = supabaseAdmin
        .from("orders")
        .select(baseSelect)
        .ilike("shipping_phone", `%${digits}`)
        .order("created_at", { ascending: false })
        .limit(1);
      if (userId && !isStaff) q = q.eq("user_id", userId);
      const { data: orders } = await q;
      if (orders && orders.length > 0)
        return { ok: true as const, order: orders[0] };
      return {
        ok: false as const,
        error: "No order found with that phone number",
      };
    }

    // Lookup by email — requires sign-in (we can't verify ownership otherwise)
    if (isEmail) {
      if (!userId) {
        return {
          ok: false as const,
          code: "unauthorized" as const,
          error: "Please sign in to track by email, or use your Order ID / phone number.",
        };
      }
      const email = query.toLowerCase();
      if (!isStaff) {
        const { data: orders } = await supabaseAdmin
          .from("orders")
          .select(baseSelect)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1);
        if (orders && orders.length > 0)
          return { ok: true as const, order: orders[0] };
        return { ok: false as const, error: "No order found for your account" };
      }
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000,
      });
      const user = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === email,
      );
      if (!user)
        return { ok: false as const, error: "No order found with that email" };
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select(baseSelect)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (orders && orders.length > 0)
        return { ok: true as const, order: orders[0] };
      return { ok: false as const, error: "No order found with that email" };
    }

    return {
      ok: false as const,
      error:
        "Please enter a full Order ID (36 characters), phone number, or email",
    };
  });
