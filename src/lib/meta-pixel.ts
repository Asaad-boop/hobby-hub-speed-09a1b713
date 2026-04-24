/**
 * Meta (Facebook) Pixel helpers.
 *
 * The base `fbq` snippet is injected from `__root.tsx` via TanStack head scripts.
 * This module provides typed helpers for standard events and an event-id
 * generator so the same events can be deduplicated against a future
 * Conversions API (CAPI) server-side implementation.
 */

export const META_PIXEL_ID = "2024086381823502";
export const META_CURRENCY = "BDT";

type FbqFn = (
  command: "init" | "track" | "trackCustom" | "consent",
  ...args: unknown[]
) => void;

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

const DEV = typeof import.meta !== "undefined" && (import.meta as any).env?.DEV;

/** Fire a Meta standard event. Returns the eventID (use it for CAPI dedupe). */
export function fbTrack(
  event:
    | "PageView"
    | "ViewContent"
    | "AddToCart"
    | "InitiateCheckout"
    | "Purchase"
    | "Lead"
    | "CompleteRegistration"
    | "Search",
  params?: Record<string, unknown>,
): string | null {
  if (!isBrowser()) return null;
  const eventID = uuid();
  try {
    window.fbq!("track", event, params ?? {}, { eventID });
    if (DEV) {
      // eslint-disable-next-line no-console
      console.log(`[MetaPixel] ${event}`, { ...params, eventID });
    }
  } catch (err) {
    if (DEV) console.warn("[MetaPixel] track failed", err);
  }
  return eventID;
}
