// Client-side fetch interceptor that attaches the current Supabase access
// token to every TanStack Start server-function request (`/_serverFn/*`).
// Without this, server functions guarded by `requireSupabaseAuth` always get
// 401 because no Authorization header is sent — surfaced in the UI as a
// blank screen with `[object Response]` in the console.
import { supabase } from "@/integrations/supabase/client";

let installed = false;

export function installServerFnAuth() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input instanceof Request
              ? input.url
              : "";

      if (url.includes("/_serverFn/")) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
          if (!headers.has("authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
          }
          return originalFetch(input, { ...init, headers });
        }
      }
    } catch {
      // fall through to original fetch
    }
    return originalFetch(input, init);
  };
}
