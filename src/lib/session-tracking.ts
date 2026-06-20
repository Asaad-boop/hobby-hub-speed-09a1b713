/**
 * Session/visit-level Facebook & marketing attribution tracking.
 *
 * Captures fbclid, UTM params, Meta ad/adset/campaign ids, referrer, entry
 * URL and device info on first visit. Persists in BOTH localStorage (7-day
 * TTL — matches Meta's default click attribution window) and sessionStorage
 * (for session-scoped consumers), so attribution survives across tabs/days.
 */

const STORAGE_KEY = "hs_attribution_v1";
const FB_ATTRIBUTION_KEY = "fb_attribution";
const TTL_DAYS = 7;

export type FbAttribution = {
  fbclid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fb_campaign_id: string | null;
  fb_adset_id: string | null;
  fb_ad_id: string | null;
  landing_page: string | null;
  captured_at: string;
};

export type SessionAttribution = FbAttribution & {
  entry_url: string | null;
  referrer_url: string | null;
  fb_browser_pixel: string | null;
  device_type: string | null;
  user_agent: string | null;
  session_source: string | null;
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

function isExpired(capturedAt: string): boolean {
  try {
    const captured = new Date(capturedAt).getTime();
    if (!Number.isFinite(captured)) return true;
    const diffDays = (Date.now() - captured) / (1000 * 60 * 60 * 24);
    return diffDays > TTL_DAYS;
  } catch {
    return true;
  }
}

/**
 * Read fb_attribution from localStorage; auto-remove if expired (>7 days).
 */
export function getFbAttribution(): FbAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FB_ATTRIBUTION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as FbAttribution;
    if (!data?.captured_at || isExpired(data.captured_at)) {
      localStorage.removeItem(FB_ATTRIBUTION_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Call on every page load. Captures fbclid + UTM + Meta ad params from URL
 * and persists to localStorage. Overwrites only when new attribution params
 * are present in the URL (so a direct revisit doesn't wipe an existing
 * Facebook attribution).
 */
export function captureSessionOnFirstVisit(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const referrer = document.referrer || "";
    const ua = navigator.userAgent || "";

    const fbclid = params.get("fbclid");
    const utm_source = params.get("utm_source");
    const utm_medium = params.get("utm_medium");
    const utm_campaign = params.get("utm_campaign");
    const utm_content = params.get("utm_content");
    const utm_term = params.get("utm_term");
    const fb_campaign_id =
      params.get("fb_campaign_id") || params.get("campaign_id") || params.get("hsa_cam");
    const fb_adset_id =
      params.get("fb_adset_id") || params.get("adset_id") || params.get("hsa_grp");
    const fb_ad_id = params.get("fb_ad_id") || params.get("ad_id") || params.get("hsa_ad");

    const hasNewAttribution = !!(
      fbclid ||
      utm_source ||
      utm_medium ||
      utm_campaign ||
      utm_content ||
      utm_term ||
      fb_campaign_id ||
      fb_adset_id ||
      fb_ad_id
    );

    const existing = getFbAttribution();

    // ---- localStorage (fb_attribution, 7-day TTL) ----
    if (hasNewAttribution || !existing) {
      const fbData: FbAttribution = {
        fbclid: fbclid ?? existing?.fbclid ?? null,
        utm_source: utm_source ?? existing?.utm_source ?? null,
        utm_medium: utm_medium ?? existing?.utm_medium ?? null,
        utm_campaign: utm_campaign ?? existing?.utm_campaign ?? null,
        utm_content: utm_content ?? existing?.utm_content ?? null,
        utm_term: utm_term ?? existing?.utm_term ?? null,
        fb_campaign_id: fb_campaign_id ?? existing?.fb_campaign_id ?? null,
        fb_adset_id: fb_adset_id ?? existing?.fb_adset_id ?? null,
        fb_ad_id: fb_ad_id ?? existing?.fb_ad_id ?? null,
        landing_page: hasNewAttribution
          ? window.location.href
          : existing?.landing_page ?? window.location.href,
        captured_at: hasNewAttribution
          ? new Date().toISOString()
          : existing?.captured_at ?? new Date().toISOString(),
      };
      try {
        localStorage.setItem(FB_ATTRIBUTION_KEY, JSON.stringify(fbData));
      } catch {
        // ignore quota errors
      }
    }

    // ---- sessionStorage (legacy session payload) ----
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const fbp = readCookie("_fbp");

    const data: SessionAttribution = {
      entry_url: window.location.href,
      referrer_url: referrer || null,
      fbclid: fbclid,
      utm_source: utm_source,
      utm_medium: utm_medium,
      utm_campaign: utm_campaign,
      utm_content: utm_content,
      utm_term: utm_term,
      fb_campaign_id: fb_campaign_id,
      fb_adset_id: fb_adset_id,
      fb_ad_id: fb_ad_id,
      landing_page: window.location.href,
      captured_at: new Date().toISOString(),
      fb_browser_pixel: fbp || null,
      device_type: detectDevice(ua),
      user_agent: ua,
      session_source: inferSource(params, referrer),
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable; ignore
  }
}

/**
 * Returns the captured session attribution, or null. Always refreshes
 * fbp cookie in case the pixel set it after first visit.
 */
export function getSessionAttribution(): SessionAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionAttribution;
    const fbp = readCookie("_fbp");
    if (fbp && !parsed.fb_browser_pixel) parsed.fb_browser_pixel = fbp;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Returns the attribution payload to spread into the `orders` insert.
 * Prefers fresh URL-captured data (localStorage), falls back to session.
 */
export function getOrderAttributionPayload(): Record<string, string | null> {
  const fb = getFbAttribution();
  if (!fb) {
    return {
      fbclid: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
      fb_campaign_id: null,
      fb_adset_id: null,
      fb_ad_id: null,
      attribution_landing_page: null,
    };
  }
  return {
    fbclid: fb.fbclid,
    utm_source: fb.utm_source,
    utm_medium: fb.utm_medium,
    utm_campaign: fb.utm_campaign,
    utm_content: fb.utm_content,
    utm_term: fb.utm_term,
    fb_campaign_id: fb.fb_campaign_id,
    fb_adset_id: fb.fb_adset_id,
    fb_ad_id: fb.fb_ad_id,
    attribution_landing_page: fb.landing_page,
  };
}
