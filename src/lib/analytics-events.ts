/**
 * GA4-style event tracking, persisted to public.analytics_events.
 *
 * Mirrors the GA4 enhanced ecommerce event names so that funnel reporting,
 * traffic-source attribution, and product analytics line up with what the
 * Meta Pixel and Microsoft Clarity already track on the client.
 *
 * Each event carries a snapshot of the visitor's attribution (UTM, referrer,
 * fbclid, fbp, device) so that source -> conversion reports can join on the
 * event itself without needing a separate session-attribution lookup.
 */

import { supabase } from "@/integrations/supabase/client";
import { getSessionAttribution } from "./session-tracking";

export type AnalyticsEventName =
  | "page_view"
  | "view_item"
  | "view_item_list"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "checkout_progress"
  | "add_payment_info"
  | "add_shipping_info"
  | "purchase";

export type AnalyticsItem = {
  item_id: string;
  item_name?: string | null;
  price?: number | null;
  quantity?: number | null;
  variant?: string | null;
  category?: string | null;
};

export type AnalyticsEventPayload = {
  /** GA4 event name. */
  event: AnalyticsEventName;
  path?: string | null;
  page_type?: string | null;
  /** Primary product id when the event is about one product (view_item, add_to_cart). */
  product_id?: string | null;
  product_name?: string | null;
  /** Monetary value of the event (item_price * qty, or order total). */
  value?: number | null;
  currency?: string | null;
  /** For per-item events. */
  quantity?: number | null;
  /** For purchase / refund-style events. */
  order_id?: string | null;
  /** Full GA4 items array — stored in params.items for itemized analysis. */
  items?: AnalyticsItem[];
  /** Free-form extras, merged into the params jsonb column. */
  extras?: Record<string, unknown>;
};

const SESSION_KEY = "hs_presence_sid";
const DEV =
  typeof import.meta !== "undefined" && (import.meta as { env?: { DEV?: boolean } }).env?.DEV;

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return crypto.randomUUID();
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function asUuid(v: string | null | undefined): string | null {
  return v && UUID_RE.test(v) ? v : null;
}

/**
 * Fire-and-forget. Failures are swallowed so analytics never breaks the UX.
 * Safe to call on the server (it short-circuits when sessionStorage is absent).
 */
export function trackEvent(payload: AnalyticsEventPayload): void {
  if (typeof window === "undefined") return;

  const attr = getSessionAttribution();
  const path =
    payload.path ?? (typeof window !== "undefined" ? window.location.pathname : null);

  const params: Record<string, unknown> = {
    ...(payload.extras ?? {}),
  };
  if (payload.items && payload.items.length > 0) {
    params.items = payload.items;
  }

  const row = {
    event_name: payload.event,
    session_id: getSessionId(),
    path,
    page_type: payload.page_type ?? null,
    product_id: asUuid(payload.product_id ?? null),
    product_name: payload.product_name ?? null,
    currency: payload.currency ?? "BDT",
    value: payload.value ?? null,
    quantity: payload.quantity ?? null,
    order_id: asUuid(payload.order_id ?? null),
    utm_source: attr?.utm_source ?? null,
    utm_medium: attr?.utm_medium ?? null,
    utm_campaign: attr?.utm_campaign ?? null,
    utm_content: attr?.utm_content ?? null,
    utm_term: attr?.utm_term ?? null,
    referrer: attr?.referrer_url ?? document.referrer ?? null,
    fb_click_id: attr?.fb_click_id ?? null,
    fb_browser_pixel: attr?.fb_browser_pixel ?? null,
    device_type: attr?.device_type ?? null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    params,
  };

  void supabase
    .from("analytics_events")
    .insert(row)
    .then(({ error }) => {
      if (error && DEV) {
        // eslint-disable-next-line no-console
        console.warn("[analytics] insert failed", error.message, payload.event);
      }
    });
}

/* ------------------------------ Convenience ------------------------------- */

export function trackPageView(opts: { path: string; page_type: string; product_id?: string | null }) {
  trackEvent({
    event: "page_view",
    path: opts.path,
    page_type: opts.page_type,
    product_id: opts.product_id ?? null,
  });
}

export function trackViewItem(p: {
  id: string;
  title?: string;
  price?: number;
  category?: string | null;
  variant?: string | null;
}) {
  trackEvent({
    event: "view_item",
    page_type: "product",
    product_id: p.id,
    product_name: p.title ?? null,
    value: typeof p.price === "number" ? p.price : null,
    items: [
      {
        item_id: p.id,
        item_name: p.title ?? null,
        price: p.price ?? null,
        quantity: 1,
        variant: p.variant ?? null,
        category: p.category ?? null,
      },
    ],
  });
}

export function trackAddToCart(p: {
  id: string;
  title?: string;
  price?: number;
  quantity: number;
  variant?: string | null;
}) {
  trackEvent({
    event: "add_to_cart",
    product_id: p.id,
    product_name: p.title ?? null,
    quantity: p.quantity,
    value: (p.price ?? 0) * p.quantity,
    items: [
      {
        item_id: p.id,
        item_name: p.title ?? null,
        price: p.price ?? null,
        quantity: p.quantity,
        variant: p.variant ?? null,
      },
    ],
  });
}

export function trackBeginCheckout(opts: {
  value: number;
  items: AnalyticsItem[];
}) {
  trackEvent({
    event: "begin_checkout",
    page_type: "checkout",
    value: opts.value,
    items: opts.items,
  });
}

export function trackCheckoutProgress(opts: {
  step: number;
  step_name: string;
  value?: number;
}) {
  trackEvent({
    event: "checkout_progress",
    page_type: "checkout",
    value: opts.value ?? null,
    extras: { step: opts.step, step_name: opts.step_name },
  });
}

export function trackPurchase(opts: {
  order_id: string;
  value: number;
  shipping?: number;
  tax?: number;
  coupon?: string | null;
  items: AnalyticsItem[];
}) {
  trackEvent({
    event: "purchase",
    page_type: "order-success",
    order_id: opts.order_id,
    value: opts.value,
    items: opts.items,
    extras: {
      shipping: opts.shipping ?? 0,
      tax: opts.tax ?? 0,
      coupon: opts.coupon ?? null,
      transaction_id: opts.order_id,
    },
  });
}
