/**
 * Session-level attribution tracking (storefront-only, sessionStorage).
 *
 * NOTE: ERP attribution columns on the `orders` table were removed.
 * This module now only captures attribution in sessionStorage so that
 * other client code (e.g. analytics pixels) can still read it. It does
 * NOT push anything into the database anymore.
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

/** Call once per page load early in the app lifecycle. Idempotent. */
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

export function getSessionAttribution(): SessionAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionAttribution;

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
 * Returns a payload safe to spread into supabase.from('orders').insert(...).
 * The orders table no longer stores any attribution columns, so this returns
 * an empty object. Kept for backwards compatibility with checkout code.
 */
export function getOrderAttributionPayload(): Record<string, never> {
  return {};
}
