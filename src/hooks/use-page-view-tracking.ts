import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { trackPageView } from "@/lib/analytics-events";

function classifyPage(pathname: string): { page_type: string; product_id: string | null } {
  if (pathname.startsWith("/admin")) return { page_type: "admin", product_id: null };
  if (pathname.startsWith("/checkout")) return { page_type: "checkout", product_id: null };
  if (pathname.startsWith("/order-success")) return { page_type: "order-success", product_id: null };
  if (pathname.startsWith("/product/")) {
    const id = pathname.split("/")[2] ?? null;
    return { page_type: "product", product_id: id };
  }
  if (pathname.startsWith("/lp/")) return { page_type: "landing-page", product_id: null };
  if (pathname.startsWith("/category/")) return { page_type: "category", product_id: null };
  if (pathname === "/") return { page_type: "home", product_id: null };
  return { page_type: "other", product_id: null };
}

/**
 * Logs every SPA route change as a GA4-style `page_view` event.
 * Skips admin routes — staff browsing the back office shouldn't pollute
 * customer behavioral analytics.
 */
/** Suppress duplicate page_view for the same path within this window (ms).
 *  Guards against React StrictMode double effects, fast nav loops, refresh
 *  storms, and accidental re-mounts polluting funnel/visitor counts. */
const DEDUPE_WINDOW_MS = 30_000;
const DEDUPE_KEY = "hs_pv_dedupe";

function shouldTrack(path: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(DEDUPE_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    // GC stale entries
    for (const k of Object.keys(map)) {
      if (now - map[k] > DEDUPE_WINDOW_MS * 4) delete map[k];
    }
    if (map[path] && now - map[path] < DEDUPE_WINDOW_MS) return false;
    map[path] = now;
    sessionStorage.setItem(DEDUPE_KEY, JSON.stringify(map));
    return true;
  } catch {
    return true;
  }
}

export function usePageViewTracking() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/admin")) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (!shouldTrack(pathname)) return;

    const { page_type, product_id } = classifyPage(pathname);
    trackPageView({ path: pathname, page_type, product_id });
  }, [pathname]);
}
