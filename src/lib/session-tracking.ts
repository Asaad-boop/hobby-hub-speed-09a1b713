/**
 * Session-level attribution tracking.
 * Captures UTM, referrer, fbclid, fbp, fbc, entry URL and device info
 * on first visit, then exposes it for order submissions.
 *
 * Stored in sessionStorage so it persists for the visit but doesn't
 * leak across browser sessions.
 *
 * Note: order attribution payload currently disabled — orders table
 * does not have tracking columns yet.
 */

const STORAGE_KEY = "hs_attribution_v1";

export type SessionAttribution = {
  entry_url: string | null;
  referrer_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fb_click_id: string | null;
  fb_browser_pixel: string | null;
  meta_ad_id: string | null;
  meta_ad_set_id: string | null;
  meta_campaign_id: string | null;
  meta_ad_account_id: string | null;
  device_type: string | null;
  user_agent: string | null;
  session_source: string | null;
  captured_at: string;
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function detectDevice(ua: string): string {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

function inferSource(params: URLSearchParams, referrer: string): string {
  const utm = params.get("utm_source");
  if (utm) return utm.toLowerCase();
  if (params.get("fbclid")) return "facebook";
  if (params.get("gclid")) return "google";
  if (referrer) {
    try {
      const host = new URL(referrer).hostname;
      if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
      if (host.includes("instagram")) return "instagram";
      if (host.includes("google")) return "google";
      if (host.includes("tiktok")) return "tiktok";
      return host.replace(/^www\./, "");
    } catch {
      // ignore
    }
  }
  return "direct";
}

/**
 * Call once per page load early in the app lifecycle.
 * Idempotent — only writes on the first visit of a session.
 */
export function captureSessionOnFirstVisit(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const url = new URL(window.location.href);
    const params = url.searchParams;
    const referrer = document.referrer || "";
    const ua = navigator.userAgent || "";

    const fbc = readCookie("_fbc");
    const fbp = readCookie("_fbp");
    const fbclid = params.get("fbclid");

    const data: SessionAttribution = {
      entry_url: window.location.href,
      referrer_url: referrer || null,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
      fb_click_id: fbclid || fbc || null,
      fb_browser_pixel: fbp || null,
      meta_ad_id: params.get("ad_id") || params.get("hsa_ad") || null,
      meta_ad_set_id: params.get("adset_id") || params.get("hsa_grp") || null,
      meta_campaign_id:
        params.get("campaign_id") ||
        params.get("hsa_cam") ||
        params.get("utm_campaign"),
      meta_ad_account_id: params.get("hsa_acc") || null,
      device_type: detectDevice(ua),
      user_agent: ua,
      session_source: inferSource(params, referrer),
      captured_at: new Date().toISOString(),
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage might be unavailable (privacy mode); ignore.
  }
}

/**
 * Returns the captured attribution data for the current session,
 * or null if none was stored. Always re-reads the latest fbp/fbc
 * cookies in case Pixel set them after first visit.
 */
export function getSessionAttribution(): SessionAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionAttribution;

    // Refresh fb cookies if newer values are available now.
    const fbp = readCookie("_fbp");
    const fbc = readCookie("_fbc");
    if (fbp && !parsed.fb_browser_pixel) parsed.fb_browser_pixel = fbp;
    if (fbc && !parsed.fb_click_id) parsed.fb_click_id = fbc;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Returns a partial orders-table payload for attribution columns.
 * Safe to spread directly into supabase.from('orders').insert(...).
 */
export function getOrderAttributionPayload(): Record<string, string | null> {
  // Attribution columns are not present on the `orders` table yet.
  // Returning an empty payload avoids PGRST204 "column not found" errors
  // when inserting orders. Re-enable individual fields here once the
  // matching columns are added to the database.
  return {};
}
