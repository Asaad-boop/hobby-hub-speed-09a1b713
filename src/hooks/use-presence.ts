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
 * Records the visitor once per app load for the live dashboard.
 */
let presenceRecorded = false;

export function usePresenceHeartbeat() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (presenceRecorded) return;
    presenceRecorded = true;

    const sid = getSessionId();
    let cancelled = false;

    const ping = async () => {
      if (cancelled) return;
      try {
        const payload = {
          session_id: sid,
          path: window.location.pathname,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
          last_seen_at: new Date().toISOString(),
        };
        await supabase
          .from("active_sessions")
          .upsert(payload, { onConflict: "session_id" });
      } catch {
        // silent fail — presence is non-critical
      }
    };

    ping();

    return () => {
      cancelled = true;
    };
  }, []);
}
