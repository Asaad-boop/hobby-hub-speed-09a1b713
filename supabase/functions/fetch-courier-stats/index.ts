// BD Courier API integration — fetches customer courier success history
// Caches results in courier_stats_cache for 24h (configurable per integration row)
// v2: handles courierData.{name} shape with total_parcel/success_parcel/cancelled_parcel
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CourierSummary {
  total?: number;
  success?: number;
  cancel?: number;
  total_parcel?: number;
  success_parcel?: number;
  cancelled_parcel?: number;
  success_ratio?: number;
}

function normalizeCourier(data: CourierSummary | undefined | null) {
  if (!data) return { total: 0, success: 0, cancel: 0, success_rate: 0 };
  const total = Number(data.total ?? data.total_parcel ?? 0) || 0;
  const success = Number(data.success ?? data.success_parcel ?? 0) || 0;
  const cancel = Number(data.cancel ?? data.cancelled_parcel ?? 0) || 0;
  if (!total) return { total: 0, success: 0, cancel: 0, success_rate: 0 };
  return {
    total,
    success,
    cancel,
    success_rate:
      data.success_ratio != null
        ? Number(Number(data.success_ratio).toFixed(1))
        : Number(((success / total) * 100).toFixed(1)),
  };
}

function calcRisk(total: number, successRate: number): string {
  if (!total || total < 3) return "new_customer";
  if (successRate >= 90) return "low";
  if (successRate >= 70) return "moderate";
  return "high";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, force_refresh = false } = await req.json();
    const cleanPhone = String(phone || "").replace(/[^0-9]/g, "").slice(-11);

    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      return new Response(JSON.stringify({ error: "Invalid BD phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Get integration config
    const { data: integration } = await supabase
      .from("integrations")
      .select("is_enabled, config")
      .eq("name", "bd_courier")
      .maybeSingle();

    const cacheHours = (integration?.config as { cache_hours?: number })?.cache_hours ?? 24;

    // 2. Cache hit?
    if (!force_refresh) {
      const { data: cached } = await supabase
        .from("courier_stats_cache")
        .select("*")
        .eq("phone", cleanPhone)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (cached) {
        return new Response(
          JSON.stringify({ data: cached, source: "cache" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const apiKey = Deno.env.get("BD_COURIER_API_KEY");
    console.log("BD_COURIER_API_KEY present:", !!apiKey, "integration row:", !!integration, "is_enabled:", integration?.is_enabled);

    // Auto-create/enable the integration row if missing (secret is the source of truth)
    if (apiKey && !integration) {
      await supabase.from("integrations").insert({
        name: "bd_courier",
        provider: "bdcourier",
        is_enabled: true,
        config: { cache_hours: 24 },
      });
    }

    if (!apiKey) {
      // Fall back to stale cache if available
      const { data: stale } = await supabase
        .from("courier_stats_cache")
        .select("*")
        .eq("phone", cleanPhone)
        .maybeSingle();
      if (stale) {
        return new Response(
          JSON.stringify({ data: stale, source: "stale_cache", warning: "API not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "BD Courier API not configured. Add API key in Settings → Integrations." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Live fetch
    const start = Date.now();
    let apiResp: Record<string, unknown> | null = null;
    let statusCode = 0;
    let errorMsg: string | null = null;

    try {
      const r = await fetch("https://bdcourier.com/api/courier-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      statusCode = r.status;
      apiResp = await r.json();
    } catch (e) {
      errorMsg = (e as Error).message;
    }

    // 4. Log call (no API key)
    await supabase.from("integration_logs").insert({
      integration_name: "bd_courier",
      endpoint: "/api/courier-check",
      method: "POST",
      request_payload: { phone: cleanPhone },
      response_payload: apiResp,
      status_code: statusCode,
      duration_ms: Date.now() - start,
      error: errorMsg,
    });

    if (errorMsg || !apiResp) {
      const { data: stale } = await supabase
        .from("courier_stats_cache")
        .select("*")
        .eq("phone", cleanPhone)
        .maybeSingle();
      if (stale) {
        return new Response(
          JSON.stringify({ data: stale, source: "stale_cache", warning: "API unavailable" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: errorMsg ?? "BD Courier API failed" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Normalize — BD Courier returns flexible shapes; try a few paths
    // deno-lint-ignore no-explicit-any
    const r: any = apiResp;
    const summaries =
      r?.courierData ||
      r?.data?.courierData ||
      r?.data?.result?.[cleanPhone]?.Summaries ||
      r?.data?.summaries ||
      r?.summaries ||
      r?.summary ||
      {};

    // Dynamic key mapping — case-insensitive, whitespace-tolerant
    const courierKeyMap: Record<string, string> = {
      pathao: "pathao",
      pathaocourier: "pathao",
      steadfast: "steadfast",
      steadfastcourierlimited: "steadfast",
      redx: "redx",
      paperfly: "paperfly",
      parceldex: "parceldex",
      carrybee: "carrybee",
      ecourier: "ecourier",
    };

    const couriers: Record<string, ReturnType<typeof normalizeCourier>> = {
      pathao: normalizeCourier(null),
      steadfast: normalizeCourier(null),
      redx: normalizeCourier(null),
      paperfly: normalizeCourier(null),
      parceldex: normalizeCourier(null),
      carrybee: normalizeCourier(null),
      ecourier: normalizeCourier(null),
    };

    const detectedKeys: string[] = [];
    const unknownCouriers: string[] = [];
    let totalSummary: CourierSummary = {};

    // Handle both object-of-couriers and array-of-couriers shapes
    const entries: Array<[string, unknown]> = Array.isArray(summaries)
      ? (summaries as Array<Record<string, unknown>>).map((c) => [
          String(c.name ?? c.courier ?? ""),
          c,
        ])
      : Object.entries(summaries);

    for (const [apiName, data] of entries) {
      detectedKeys.push(apiName);
      const lowerKey = apiName.toLowerCase().replace(/\s+/g, "");
      if (lowerKey === "summary" || lowerKey === "totalsummary") {
        totalSummary = (data as CourierSummary) ?? {};
        continue;
      }
      const dbKey = courierKeyMap[lowerKey] || lowerKey;
      if (couriers[dbKey]) {
        couriers[dbKey] = normalizeCourier(data as CourierSummary);
      } else {
        unknownCouriers.push(apiName);
      }
    }

    console.log("[BD Courier Parser] Detected keys:", detectedKeys);
    if (unknownCouriers.length > 0) {
      console.log("[BD Courier Parser] Unknown couriers (not mapped):", unknownCouriers);
    }

    // Compute overall from sum of couriers (more reliable than API summary)
    const sumTotal = Object.values(couriers).reduce((s, c) => s + c.total, 0);
    const sumSuccess = Object.values(couriers).reduce((s, c) => s + c.success, 0);
    const sumCancel = Object.values(couriers).reduce((s, c) => s + c.cancel, 0);

    // Prefer API summary if present, else use sum
    const overall_total = Number(
      totalSummary.total ?? totalSummary.total_parcel ?? sumTotal,
    );
    const overall_success = Number(
      totalSummary.success ?? totalSummary.success_parcel ?? sumSuccess,
    );
    const overall_cancel = Number(
      totalSummary.cancel ?? totalSummary.cancelled_parcel ?? sumCancel,
    );
    const overall_success_rate =
      totalSummary.success_ratio != null
        ? Number(Number(totalSummary.success_ratio).toFixed(1))
        : overall_total > 0
          ? Number(((overall_success / overall_total) * 100).toFixed(1))
          : 0;

    // Note: ecourier column may not exist in DB yet — exclude from upsert if so
    const normalized = {
      phone: cleanPhone,
      overall_total,
      overall_success,
      overall_cancel,
      overall_success_rate,
      pathao: couriers.pathao,
      redx: couriers.redx,
      steadfast: couriers.steadfast,
      paperfly: couriers.paperfly,
      parceldex: couriers.parceldex,
      carrybee: couriers.carrybee,
      raw_response: apiResp,
      risk_level: calcRisk(overall_total, overall_success_rate),
      last_fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + cacheHours * 60 * 60 * 1000).toISOString(),
      fetch_count: 1,
    };

    // 6. Upsert
    await supabase.from("courier_stats_cache").upsert(normalized, { onConflict: "phone" });

    // Update integration sync status
    await supabase
      .from("integrations")
      .update({ last_sync_at: new Date().toISOString(), last_sync_status: "success" })
      .eq("name", "bd_courier");

    return new Response(
      JSON.stringify({ data: normalized, source: "fresh" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
