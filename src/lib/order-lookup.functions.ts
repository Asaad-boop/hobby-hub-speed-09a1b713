import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://bgsspipkjeuceftuatue.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnc3NwaXBramV1Y2VmdHVhdHVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDcyMzIsImV4cCI6MjA5MTgyMzIzMn0.h6aRTBUhTvEvKCx8M-lvyA2BCBQbhvWMWKgn8dIyilc";

function getServerClient(): SupabaseClient<Database> {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_SERVICE_ROLE_KEY;
  // Prefer service role for full read (bypasses RLS); fall back to publishable.
  const key = serviceKey || SUPABASE_PUBLISHABLE_KEY;
  return createClient<Database>(SUPABASE_URL, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

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
    try {
      const supabase = getServerClient();
      const { data: rows, error } = await supabase
        .rpc("lookup_order_by_id", { _order_id: data.orderId });
      if (error) {
        console.error("[getOrderByFullId]", error);
        return { ok: false as const, error: error.message };
      }
      const order = Array.isArray(rows) ? rows[0] : rows;
      if (!order) return { ok: false as const, error: "Order not found" };
      const { data: items } = await supabase
        .from("order_items")
        .select("id,product_id,name,image,price,quantity,variant_label")
        .eq("order_id", order.id);
      return { ok: true as const, order: { ...order, order_items: items ?? [] } };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[getOrderByFullId] server error:", e);
      return { ok: false as const, error: `Server error: ${msg}` };
    }
  });

/**
 * Order lookup. Works for guests via full Order ID / phone; signed-in users
 * see their own; staff see all. Returns ok:false with a friendly error
 * instead of throwing.
 */
export const lookupOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => {
    const query = String(input.query || "").trim();
    if (!query) throw new Error("Please enter Order ID, phone or email");
    if (query.length > 254) throw new Error("Input too long");
    return { query };
  })
  .handler(async ({ data }) => {
    try {
      const supabase = getServerClient();

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
        try {
          const { data: claimsData } = await authedClient.auth.getClaims(token);
          if (claimsData?.claims?.sub) {
            userId = claimsData.claims.sub;
            const { data: rolesRow } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", userId);
            const roles = (rolesRow ?? []).map((r: { role: string }) => r.role);
            isStaff =
              roles.includes("admin") ||
              roles.includes("customer_service") ||
              roles.includes("operations");
          }
        } catch (e) {
          console.warn("[lookupOrder] auth parse failed (continuing as guest):", e);
        }
      }

      const { query } = data;
      const isEmail = query.includes("@");
      const digits = normalizePhone(query);
      const isPhone = !isEmail && digits.length >= 10;
      const hexQuery = query.toLowerCase().replace(/[^0-9a-f]/g, "");
      const isFullUuid = query.length === 36 && UUID_RE.test(query);
      const isShortId =
        !isEmail && !isPhone && !isFullUuid && hexQuery.length >= 8 && /^[0-9a-f]+$/.test(hexQuery);

      const baseSelect = "*, order_items(id,product_id,name,image,price,quantity,variant_label)";

      if (isFullUuid) {
        let q = supabase.from("orders").select(baseSelect).eq("id", query);
        if (userId && !isStaff) q = q.eq("user_id", userId);
        const { data: orders, error } = await q.limit(1);
        if (error) return { ok: false as const, error: error.message };
        if (orders && orders.length > 0) return { ok: true as const, order: orders[0] };
        return { ok: false as const, error: "No order found with that Order ID" };
      }

      if (isShortId) {
        let q = supabase
          .from("orders")
          .select(baseSelect)
          .or(`id::text.like.${hexQuery}%`);
        if (userId && !isStaff) q = q.eq("user_id", userId);
        const { data: orders, error } = await q.limit(2);
        if (error) return { ok: false as const, error: error.message };
        if (orders && orders.length === 1) return { ok: true as const, order: orders[0] };
        if (orders && orders.length > 1)
          return {
            ok: false as const,
            error: "Multiple orders match that ID. Please enter the full Order ID.",
          };
        return { ok: false as const, error: "No order found with that Order ID" };
      }

      if (isPhone) {
        let q = supabase
          .from("orders")
          .select(baseSelect)
          .ilike("shipping_phone", `%${digits}`)
          .order("created_at", { ascending: false })
          .limit(1);
        if (userId && !isStaff) q = q.eq("user_id", userId);
        const { data: orders, error } = await q;
        if (error) return { ok: false as const, error: error.message };
        if (orders && orders.length > 0) return { ok: true as const, order: orders[0] };
        return { ok: false as const, error: "No order found with that phone number" };
      }

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
          const { data: orders } = await supabase
            .from("orders")
            .select(baseSelect)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1);
          if (orders && orders.length > 0) return { ok: true as const, order: orders[0] };
          return { ok: false as const, error: "No order found for your account" };
        }
        // Staff lookup by email — needs admin API (service role).
        const serviceKey =
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_SERVICE_ROLE_KEY;
        if (!serviceKey) {
          return { ok: false as const, error: "Email lookup unavailable" };
        }
        const admin = createClient<Database>(SUPABASE_URL, serviceKey, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
        const user = usersData?.users?.find((u) => u.email?.toLowerCase() === email);
        if (!user) return { ok: false as const, error: "No order found with that email" };
        const { data: orders } = await supabase
          .from("orders")
          .select(baseSelect)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (orders && orders.length > 0) return { ok: true as const, order: orders[0] };
        return { ok: false as const, error: "No order found with that email" };
      }

      return {
        ok: false as const,
        error: "Please enter a full Order ID (36 characters), phone number, or email",
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[lookupOrder] server error:", e);
      return { ok: false as const, error: `Server error: ${msg}` };
    }
  });
