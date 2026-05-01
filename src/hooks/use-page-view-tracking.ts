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
export function usePageViewTracking() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/admin")) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    const { page_type, product_id } = classifyPage(pathname);
    trackPageView({ path: pathname, page_type, product_id });
  }, [pathname]);
}
