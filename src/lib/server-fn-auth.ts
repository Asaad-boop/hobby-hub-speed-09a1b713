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

type ServerFnOptions = { headers?: HeadersInit; [key: string]: unknown };

async function normalizeServerFnError(error: unknown): Promise<Error> {
  if (error instanceof Response) {
    const message = await error.text().catch(() => "");
    return new Error(message || `Request failed with ${error.status}`);
  }
  if (error instanceof Error) {
    if (error.message === "[object Response]") {
      return new Error("Your session expired. Please sign in again.");
    }
    return error;
  }
  return new Error(String(error || "Request failed"));
}

export async function callWithSupabaseAuth<TResult>(
  serverFn: (options?: ServerFnOptions) => Promise<TResult>,
): Promise<TResult>;
export async function callWithSupabaseAuth<TOptions extends ServerFnOptions, TResult>(
  serverFn: (options: TOptions) => Promise<TResult>,
  options: TOptions,
): Promise<TResult>;
export async function callWithSupabaseAuth<TOptions extends ServerFnOptions, TResult>(
  serverFn: ((options?: TOptions) => Promise<TResult>) | ((options: TOptions) => Promise<TResult>),
  options?: TOptions,
): Promise<TResult> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) {
    await supabase.auth.signOut().catch(() => undefined);
    throw new Error("Your session expired. Please sign in again.");
  }

  const headers = new Headers(options?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  try {
    return await serverFn({ ...(options ?? {} as TOptions), headers } as TOptions);
  } catch (err) {
    throw await normalizeServerFnError(err);
  }
}
