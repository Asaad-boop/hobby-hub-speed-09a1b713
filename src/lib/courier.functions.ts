import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * BD Courier integration (https://app.bdcourier.com)
 * Server-side only — never call BD Courier directly from the browser.
 *
 * Flow:
 *  1. Look up active config in `integrations` table (name = 'bd_courier').
 *     Falls back to BD_COURIER_API_KEY env secret.
 *  2. Cache-first: check `courier_stats_cache` (default 7 days).
 *  3. Stale-while-revalidate: serve cached, refresh in background if expired.
 *  4. On miss / force refresh: POST to BD Courier API, persist to cache.
 */

const DEFAULT_BASE_URL = "https://bdcourier.com/api/courier/check";
const DEFAULT_CACHE_HOURS = 168; // 7 days
const FETCH_TIMEOUT_MS = 20_000;

// SSRF guard — only allow calls to known BD Courier hosts.
const ALLOWED_HOSTS = new Set<string>(["bdcourier.com", "www.bdcourier.com", "app.bdcourier.com"]);

function isAllowedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

async function assertStaff(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error("Authorization check failed");
  const roles = (data ?? []).map((r) => r.role as string);
  const ok = roles.some((r) => r === "admin" || r === "operations" || r === "customer_service");
  if (!ok) throw new Error("Forbidden: staff role required");
}

type IntegrationConfig = {
  api_key?: string;
  base_url?: string;
  cache_hours?: number;
  stale_while_revalidate?: boolean;
};

type IntegrationRow = {
  id: string;
  is_enabled: boolean;
  config: IntegrationConfig | null;
};

async function loadIntegration(): Promise<{
  apiKey: string | null;
  baseUrl: string;
  cacheHours: number;
  swr: boolean;
  enabled: boolean;
  source: "db" | "env" | "none";
}> {
  const { data } = await supabaseAdmin
    .from("integrations")
    .select("id, is_enabled, config")
    .eq("name", "bd_courier")
    .maybeSingle();

  const row = data as IntegrationRow | null;
  const cfg = row?.config ?? {};
  const dbKey = (cfg.api_key ?? "").trim();
  const envKey = (process.env.BD_COURIER_API_KEY ?? "").trim();
  const apiKey = dbKey || envKey || null;
  const source: "db" | "env" | "none" = dbKey ? "db" : envKey ? "env" : "none";

  return {
    apiKey,
    baseUrl: (cfg.base_url ?? "").trim() || DEFAULT_BASE_URL,
    cacheHours: Number(cfg.cache_hours) > 0 ? Number(cfg.cache_hours) : DEFAULT_CACHE_HOURS,
    swr: cfg.stale_while_revalidate !== false,
    enabled: row?.is_enabled !== false, // default true if no row yet
    source,
  };
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "").slice(-11);
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
}

type BdCourierApiResponse = {
  courierData?: {
    summary?: {
      total_parcel?: number;
      success_parcel?: number;
      cancelled_parcel?: number;
      success_ratio?: number;
    };
    pathao?: unknown;
    steadfast?: unknown;
    redx?: unknown;
    paperfly?: unknown;
    parceldex?: unknown;
    carrybee?: unknown;
  };
  message?: string;
  error?: string;
};

async function callBdCourier(
  phone: string,
  apiKey: string,
  baseUrl: string,
): Promise<{ ok: true; data: BdCourierApiResponse } | { ok: false; error: string; status?: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ phone }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json: BdCourierApiResponse = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      return { ok: false, error: `Invalid response from BD Courier (${res.status})`, status: res.status };
    }
    if (!res.ok) {
      const msg =
        json.error ||
        json.message ||
        (res.status === 401 || res.status === 403
          ? "Invalid BD Courier API key"
          : res.status === 429
            ? "BD Courier rate limit reached"
            : `BD Courier returned ${res.status}`);
      return { ok: false, error: msg, status: res.status };
    }
    return { ok: true, data: json };
  } catch (e) {
    const msg = (e as Error).name === "AbortError" ? "BD Courier request timed out" : (e as Error).message;
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

function summaryFromResponse(json: BdCourierApiResponse) {
  const s = json.courierData?.summary ?? {};
  const total = Number(s.total_parcel ?? 0) || 0;
  const success = Number(s.success_parcel ?? 0) || 0;
  const cancel = Number(s.cancelled_parcel ?? 0) || 0;
  const rate = Number(s.success_ratio ?? (total > 0 ? (success / total) * 100 : 0)) || 0;
  return { total, success, cancel, rate };
}

async function persistCache(phone: string, json: BdCourierApiResponse, cacheHours: number) {
  const sum = summaryFromResponse(json);
  const cd = json.courierData ?? {};
  const expires = new Date(Date.now() + cacheHours * 3600 * 1000).toISOString();

  // Upsert (PK is phone)
  const { data: existing } = await supabaseAdmin
    .from("courier_stats_cache")
    .select("fetch_count")
    .eq("phone", phone)
    .maybeSingle();

  await supabaseAdmin.from("courier_stats_cache").upsert({
    phone,
    overall_total: sum.total,
    overall_success: sum.success,
    overall_cancel: sum.cancel,
    overall_success_rate: sum.rate,
    pathao: (cd.pathao ?? null) as never,
    steadfast: (cd.steadfast ?? null) as never,
    redx: (cd.redx ?? null) as never,
    paperfly: (cd.paperfly ?? null) as never,
    parceldex: (cd.parceldex ?? null) as never,
    carrybee: (cd.carrybee ?? null) as never,
    raw_response: json as never,
    fetch_count: ((existing as { fetch_count?: number } | null)?.fetch_count ?? 0) + 1,
    last_fetched_at: new Date().toISOString(),
    expires_at: expires,
  });
}

export type CourierStatsResult = {
  ok: boolean;
  cached: boolean;
  stale: boolean;
  source: "cache" | "api" | "error";
  data?: {
    overall_total: number;
    overall_success: number;
    overall_cancel: number;
    overall_success_rate: number;
    last_fetched_at: string;
  };
  error?: string;
};

export const fetchCourierStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      phone: z.string().min(6).max(20),
      force_refresh: z.boolean().optional(),
    }).parse,
  )
  .handler(async ({ data, context }): Promise<CourierStatsResult> => {
    await assertStaff((context as { userId: string }).userId);
    const phone = normalizePhone(data.phone);
    if (!phone) return { ok: false, cached: false, stale: false, source: "error", error: "Invalid BD phone number" };

    const { apiKey, baseUrl, cacheHours, swr, enabled } = await loadIntegration();
    if (!isAllowedUrl(baseUrl)) {
      return { ok: false, cached: false, stale: false, source: "error", error: "BD Courier base URL not allowed" };
    }

    if (!enabled) return { ok: false, cached: false, stale: false, source: "error", error: "BD Courier integration is disabled" };

    // Cache lookup (always)
    const { data: cached } = await supabaseAdmin
      .from("courier_stats_cache")
      .select("overall_total, overall_success, overall_cancel, overall_success_rate, last_fetched_at, expires_at")
      .eq("phone", phone)
      .maybeSingle();

    const isFresh = cached && new Date(cached.expires_at).getTime() > Date.now();

    if (cached && isFresh && !data.force_refresh) {
      return {
        ok: true,
        cached: true,
        stale: false,
        source: "cache",
        data: {
          overall_total: cached.overall_total,
          overall_success: cached.overall_success,
          overall_cancel: cached.overall_cancel,
          overall_success_rate: Number(cached.overall_success_rate),
          last_fetched_at: cached.last_fetched_at,
        },
      };
    }

    // Need API call
    if (!apiKey) {
      // Serve stale if SWR & we have it
      if (cached && swr) {
        return {
          ok: true,
          cached: true,
          stale: true,
          source: "cache",
          data: {
            overall_total: cached.overall_total,
            overall_success: cached.overall_success,
            overall_cancel: cached.overall_cancel,
            overall_success_rate: Number(cached.overall_success_rate),
            last_fetched_at: cached.last_fetched_at,
          },
          error: "BD Courier API key not configured",
        };
      }
      return { ok: false, cached: false, stale: false, source: "error", error: "BD Courier API key not configured" };
    }

    const apiRes = await callBdCourier(phone, apiKey, baseUrl);

    if (!apiRes.ok) {
      // SWR fallback: serve cached even if expired
      if (cached && swr) {
        return {
          ok: true,
          cached: true,
          stale: true,
          source: "cache",
          data: {
            overall_total: cached.overall_total,
            overall_success: cached.overall_success,
            overall_cancel: cached.overall_cancel,
            overall_success_rate: Number(cached.overall_success_rate),
            last_fetched_at: cached.last_fetched_at,
          },
          error: apiRes.error,
        };
      }
      return { ok: false, cached: false, stale: false, source: "error", error: apiRes.error };
    }

    await persistCache(phone, apiRes.data, cacheHours);
    const sum = summaryFromResponse(apiRes.data);
    return {
      ok: true,
      cached: false,
      stale: false,
      source: "api",
      data: {
        overall_total: sum.total,
        overall_success: sum.success,
        overall_cancel: sum.cancel,
        overall_success_rate: sum.rate,
        last_fetched_at: new Date().toISOString(),
      },
    };
  });

export type CourierConnectionTest = {
  ok: boolean;
  source: "db" | "env" | "none";
  status?: number;
  error?: string;
  sample_total?: number;
};

/**
 * Test connection without persisting — uses a sample phone number.
 * Helpful as a "Test connection" button in the Settings UI.
 */
export const testCourierConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      phone: z.string().min(6).max(20).optional(),
      override_api_key: z.string().min(8).max(512).optional(),
      override_base_url: z
        .string()
        .url()
        .refine(isAllowedUrl, { message: "URL host not allowed" })
        .optional(),
    }).parse,
  )
  .handler(async ({ data, context }): Promise<CourierConnectionTest> => {
    await assertStaff((context as { userId: string }).userId);
    const cfg = await loadIntegration();
    const apiKey = (data.override_api_key?.trim() || cfg.apiKey || "").trim();
    const baseUrl = data.override_base_url?.trim() || cfg.baseUrl;

    if (!apiKey) return { ok: false, source: cfg.source, error: "No API key configured" };
    if (!isAllowedUrl(baseUrl)) {
      return { ok: false, source: cfg.source, error: "Base URL host not allowed" };
    }

    const phone = normalizePhone(data.phone || "01700000000") || "01700000000";
    const res = await callBdCourier(phone, apiKey, baseUrl);
    if (!res.ok) {
      return { ok: false, source: data.override_api_key ? "db" : cfg.source, status: res.status, error: res.error };
    }
    const sum = summaryFromResponse(res.data);
    return { ok: true, source: data.override_api_key ? "db" : cfg.source, sample_total: sum.total };
  });
