/**
 * Microsoft Clarity helpers.
 *
 * The base loader is injected from `__root.tsx`. This module provides typed
 * helpers for custom tags (segmentation), identification, custom events, and
 * priority session upgrades — used to make Clarity recordings actually useful
 * (filter by route, by funnel step, by purchase value, etc.).
 *
 * Docs: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api
 */

export const CLARITY_PROJECT_ID = "wh5255b06h";

type ClarityFn = (action: string, ...args: unknown[]) => void;

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

function isReady(): boolean {
  return typeof window !== "undefined" && typeof window.clarity === "function";
}

/** Tag the current session with a key/value (or array of values) for filtering. */
export function clarityTag(key: string, value: string | string[]): void {
  if (!isReady()) return;
  try {
    window.clarity!("set", key, value);
  } catch {
    /* ignore */
  }
}

/** Fire a named custom event in the recording timeline. */
export function clarityEvent(name: string): void {
  if (!isReady()) return;
  try {
    window.clarity!("event", name);
  } catch {
    /* ignore */
  }
}

/** Identify the current visitor (hashed/anonymous IDs only — never raw email/phone). */
export function clarityIdentify(
  customId: string,
  customSessionId?: string,
  customPageId?: string,
  friendlyName?: string,
): void {
  if (!isReady()) return;
  try {
    window.clarity!("identify", customId, customSessionId, customPageId, friendlyName);
  } catch {
    /* ignore */
  }
}

/** Mark this session as high priority so it is more likely to be retained. */
export function clarityUpgrade(reason: string): void {
  if (!isReady()) return;
  try {
    window.clarity!("upgrade", reason);
  } catch {
    /* ignore */
  }
}

/** Consent — call after user accepts cookies if you gate Clarity behind a CMP. */
export function clarityConsent(granted = true): void {
  if (!isReady()) return;
  try {
    window.clarity!("consent", granted);
  } catch {
    /* ignore */
  }
}
