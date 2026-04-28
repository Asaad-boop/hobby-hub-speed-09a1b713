// BD Courier API integration — fetches customer courier success history
// v3: aggressive cache-first + stale-while-revalidate + 7-day default
// Note: BD Courier API (`courierData`) returns only pathao/redx/steadfast/paperfly/parceldex.
// Carrybee/Ecourier may be missing even when shown on the dashboard — this is an upstream limitation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type EdgeSupabaseClient = ReturnType<typeof createClient<any>>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface CourierSummary {
  total?: number;
  success?: number;
  cancel?: number;
  total_parcel?: number;
  success_parcel?: number;
  cancelled_parcel?: number;
  success_ratio?: number;
}

const DEFAULT_CACHE_HOURS = 24 * 7; // 7 days — courier history rarely changes

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

function ageHours(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
}

function hasCachedApiError(cached: Record<string, unknown> | null | undefined): boolean {
  const raw = cached?.raw_response as { error?: unknown } | null | undefined;
  return typeof raw?.error === "string" && raw.error.trim().length > 0;
}

const COURIER_WARNING =
  "BD Courier API may omit some couriers (e.g. Carrybee, eCourier). Numbers reflect what the upstream API returns.";

async function fetchAndCache(
  supabase: EdgeSupabaseClient,
  cleanPhone: string,
  apiKey: string,
  cacheHours: number,
) {
  const start = Date.now();
  let apiResp: Record<string, unknown> | null = null;
  let statusCode = 0;
  let errorMsg: string | null = null;

  // Hard timeout — never let upstream hang the worker
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 20_000); // 20s max
  try {
    const r = await fetch("https://bdcourier.com/api/courier-check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ phone: cleanPhone }),
      signal: ac.signal,
    });
    statusCode = r.status;
    apiResp = await r.json();
  } catch (e) {
    errorMsg = (e as Error).name === "AbortError" ? "Upstream timeout (>20s)" : (e as Error).message;
  } finally {
    clearTimeout(timer);
  }

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
    return { ok: false as const, error: errorMsg ?? "BD Courier API failed" };
  }
  // Upstream returned an error envelope (e.g. quota exceeded, invalid key)
  if (statusCode >= 400 || (apiResp as { error?: string })?.error) {
    return {
      ok: false as const,
      error: (apiResp as { error?: string })?.error ?? `BD Courier API error (${statusCode})`,
    };
  }

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

  const sumTotal = Object.values(couriers).reduce((s, c) => s + c.total, 0);
  const sumSuccess = Object.values(couriers).reduce((s, c) => s + c.success, 0);
  const sumCancel = Object.values(couriers).reduce((s, c) => s + c.cancel, 0);

  const overall_total = Number(totalSummary.total ?? totalSummary.total_parcel ?? sumTotal);
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

  await supabase.from("courier_stats_cache").upsert(normalized, { onConflict: "phone" });

  await supabase
    .from("integrations")
    .update({ last_sync_at: new Date().toISOString(), last_sync_status: "success" })
    .eq("name", "bd_courier");

  return { ok: true as const, data: normalized };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, force_refresh = false } = await req.json();
    const cleanPhone = String(phone || "").replace(/[^0-9]/g, "").slice(-11);

    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      return jsonResponse({ error: "Invalid BD phone number", data: null, source: "error" });
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

    const cfg = (integration?.config ?? {}) as {
      cache_hours?: number;
      stale_while_revalidate?: boolean;
    };
    const cacheHours = Number(cfg.cache_hours ?? DEFAULT_CACHE_HOURS);
    const swr = cfg.stale_while_revalidate !== false; // default ON

    // 2. Always look up cache first
    const { data: cached } = await supabase
      .from("courier_stats_cache")
      .select("*")
      .eq("phone", cleanPhone)
      .maybeSingle();
    const validCached = cached && !hasCachedApiError(cached) ? cached : null;

    const apiKey = Deno.env.get("BD_COURIER_API_KEY");
    console.log(
      "BD_COURIER_API_KEY present:",
      !!apiKey,
      "integration row:",
      !!integration,
      "is_enabled:",
      integration?.is_enabled,
      "cache_hours:",
      cacheHours,
    );

    // Auto-create integration row if missing
    if (apiKey && !integration) {
      await supabase.from("integrations").insert({
        name: "bd_courier",
        provider: "bdcourier",
        is_enabled: true,
        config: { cache_hours: DEFAULT_CACHE_HOURS, stale_while_revalidate: true },
      });
    }

    // 3. Fresh cache hit (and not forced) → return immediately
    if (!force_refresh && validCached && new Date(validCached.expires_at) > new Date()) {
      return jsonResponse(
        {
          data: validCached,
          source: "cache",
          cache_hit: true,
          age_hours: ageHours(validCached.last_fetched_at),
          warning: COURIER_WARNING,
        },
      );
    }

    // No API key configured
    if (!apiKey) {
      if (validCached) {
        return jsonResponse(
          {
            data: validCached,
            source: "stale_cache",
            cache_hit: true,
            age_hours: ageHours(validCached.last_fetched_at),
            warning: "API not configured — showing cached data",
          },
        );
      }
      return jsonResponse(
        {
          error: "BD Courier API not configured. Add API key in Settings → Integrations.",
          data: null,
          source: "error",
        },
      );
    }

    // 4. Stale-while-revalidate: stale cache + not forced → return stale, refresh in background
    if (!force_refresh && validCached && swr) {
      // Background refresh — use EdgeRuntime.waitUntil so the worker can be released
      // immediately after the response is sent (otherwise the unawaited promise keeps
      // the isolate alive until the 150s idle timeout).
      const bg = fetchAndCache(supabase, cleanPhone, apiKey, cacheHours).catch((e) =>
        console.error("[BD Courier] background refresh failed:", e),
      );
      // deno-lint-ignore no-explicit-any
      const er = (globalThis as any).EdgeRuntime;
      if (er?.waitUntil) er.waitUntil(bg);
      return new Response(
        JSON.stringify({
          data: validCached,
          source: "stale_cache",
          cache_hit: true,
          age_hours: ageHours(validCached.last_fetched_at),
          message: "Showing cached data, refreshing in background",
          warning: COURIER_WARNING,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Live fetch (forced, no cache, or SWR off + stale)
    const result = await fetchAndCache(supabase, cleanPhone, apiKey, cacheHours);
    if (!result.ok) {
      if (validCached) {
        return new Response(
          JSON.stringify({
            data: validCached,
            source: "stale_cache",
            cache_hit: true,
            age_hours: ageHours(validCached.last_fetched_at),
            warning: "API unavailable — showing cached data",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: result.error, data: null, source: "error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        data: result.data,
        source: "fresh",
        cache_hit: false,
        age_hours: 0,
        warning: COURIER_WARNING,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
