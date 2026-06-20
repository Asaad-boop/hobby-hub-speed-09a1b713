import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only server functions for the Settings page.
 *
 * Every fn re-checks `has_role('admin')` so a non-admin signed-in user
 * cannot read CAPI status or fire test events.
 */

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) {
    throw new Response("Forbidden", { status: 403 });
  }
}

/** Returns server-side tracking config status (CAPI token, test code). */
export const getTrackingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const token = process.env.META_CAPI_TOKEN || "";
    const testCode = process.env.META_TEST_EVENT_CODE || "";
    return {
      capi: {
        tokenConfigured: token.length > 0,
        tokenPreview: token ? `${token.slice(0, 6)}…${token.slice(-4)}` : null,
        hasTestCode: testCode.length > 0,
      },
      pixelIdEnv: process.env.META_PIXEL_ID || null,
    };
  });

/** Last-24h event counts grouped by event_name from analytics_events. */
export const getEventCounts24h = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await context.supabase
      .from("analytics_events")
      .select("event_name")
      .gte("created_at", since)
      .limit(10000);
    if (error) {
      return { ok: false as const, error: error.message, counts: {} as Record<string, number> };
    }
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const k = (row as { event_name: string | null }).event_name ?? "unknown";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return { ok: true as const, counts, total: (data ?? []).length };
  });

/** Fires a synthetic CAPI Purchase event so the admin can verify the wiring. */
export const sendTestCapiEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const pixelId = process.env.META_PIXEL_ID || "2024086381823502";
    const token = process.env.META_CAPI_TOKEN;
    const testCode = process.env.META_TEST_EVENT_CODE;
    if (!token) {
      return { ok: false as const, error: "META_CAPI_TOKEN is not set" };
    }
    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: `admin_test_${Date.now()}`,
          action_source: "website",
          event_source_url: "https://hobby-hub-speed.lovable.app/admin/settings",
          user_data: { client_user_agent: "AdminSettingsTest/1.0" },
          custom_data: { currency: "BDT", value: 1, order_id: `test_${Date.now()}` },
        },
      ],
      ...(testCode ? { test_event_code: testCode } : {}),
    };
    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.text().catch(() => "");
      if (!res.ok) return { ok: false as const, status: res.status, body };
      return { ok: true as const, status: res.status, body };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  });
