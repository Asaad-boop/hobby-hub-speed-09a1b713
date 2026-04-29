import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

/**
 * Sends a heartbeat every 20s so the live dashboard can count active visitors.
 * Considered "active" if last_seen_at within the last 60s.
 */
export function usePresenceHeartbeat() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sid = getSessionId();
    let cancelled = false;

    const ping = async () => {
      if (cancelled) return;
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) await supabase.auth.signOut().catch(() => undefined);
        if (sessionError || !sessionData.session?.access_token) return;
        await supabase
          .from("active_sessions")
          .upsert(
            {
              session_id: sid,
              path: window.location.pathname,
              user_agent: navigator.userAgent,
              referrer: document.referrer || null,
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "session_id" },
          )
          .setHeader("x-session-id", sid);
      } catch {
        // ignore
      }
    };

    ping();
    const interval = setInterval(ping, 10_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
