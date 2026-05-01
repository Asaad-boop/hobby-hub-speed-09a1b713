import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getSessionAttribution } from "@/lib/session-tracking";

const SESSION_KEY = "hs_presence_sid";

function getSessionId(): string {
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
 * Logs every SPA route change into public.page_views so the admin live
 * analytics dashboard can compute funnel + top pages. Skips admin routes.
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
    // Only attempt UUID insert when product id is a valid uuid.
    const isUuid = product_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product_id);
    const attr = getSessionAttribution();

    void supabase.from("page_views").insert({
      session_id: getSessionId(),
      path: pathname,
      page_type,
      product_id: isUuid ? product_id : null,
      referrer: attr?.referrer_url ?? document.referrer ?? null,
      utm_source: attr?.utm_source ?? null,
      device_type: attr?.device_type ?? null,
    });
  }, [pathname]);
}
