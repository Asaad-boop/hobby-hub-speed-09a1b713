import { useEffect, useState } from "react";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { getAdminEnvDiagnostics } from "@/lib/admin-diagnostics.functions";

type EnvDiag = Awaited<ReturnType<typeof getAdminEnvDiagnostics>>;

/**
 * Heuristic: classify a thrown error and surface likely missing env vars
 * + actionable next steps. Used as `errorComponent` on admin routes.
 */
function classify(message: string): {
  category: string;
  hints: string[];
  envSuspects: string[];
} {
  const m = message.toLowerCase();
  if (m.includes("missing supabase server")) {
    return {
      category: "Server Supabase env vars missing",
      hints: [
        "Server functions need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ADMIN_SERVICE_ROLE_KEY) on Vercel.",
        "Add them in Vercel → Settings → Environment Variables (Production), then Redeploy.",
      ],
      envSuspects: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    };
  }
  if (m.includes("missing supabase environment")) {
    return {
      category: "Auth middleware env vars missing",
      hints: [
        "Server auth needs SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.",
        "Add to Vercel Production env vars and Redeploy.",
      ],
      envSuspects: ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"],
    };
  }
  if (m.includes("unauthorized") || m.includes("401")) {
    return {
      category: "Unauthorized",
      hints: [
        "Session token missing or expired. Sign out and sign in again.",
        "Confirm your account has the admin role in user_roles.",
      ],
      envSuspects: [],
    };
  }
  if (m.includes("forbidden") || m.includes("403")) {
    return {
      category: "Forbidden",
      hints: ["Your account does not have admin role."],
      envSuspects: [],
    };
  }
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed")) {
    return {
      category: "Network / server function unreachable",
      hints: [
        "The server function endpoint is not responding.",
        "Check Vercel deployment status and recent logs.",
      ],
      envSuspects: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    };
  }
  if (m.includes("rls") || m.includes("permission denied") || m.includes("policy")) {
    return {
      category: "Database permission / RLS",
      hints: [
        "Row-Level Security blocked this query.",
        "Verify policies on the affected table allow admin reads.",
      ],
      envSuspects: [],
    };
  }
  if (m.includes("500") || m.includes("internal server error")) {
    return {
      category: "Server error",
      hints: ["Check server function logs for the underlying exception."],
      envSuspects: ["SUPABASE_SERVICE_ROLE_KEY"],
    };
  }
  return {
    category: "Unhandled error",
    hints: ["Check the stack trace below and recent server logs."],
    envSuspects: [],
  };
}

export function AdminErrorPanel({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const location = useLocation();
  const [diag, setDiag] = useState<EnvDiag | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [showStack, setShowStack] = useState(false);
  const [copied, setCopied] = useState(false);

  const message = error?.message || String(error);
  const cls = classify(message);

  const runDiagnostics = async () => {
    setDiagLoading(true);
    setDiagError(null);
    try {
      const res = await getAdminEnvDiagnostics();
      setDiag(res);
    } catch (e: any) {
      setDiagError(e?.message || "Diagnostics failed");
    } finally {
      setDiagLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyReport = async () => {
    const report = [
      `Route: ${location.pathname}`,
      `Time: ${new Date().toISOString()}`,
      `Category: ${cls.category}`,
      `Error: ${message}`,
      `Stack:\n${error?.stack || "(none)"}`,
      `Env: ${diag?.ok ? JSON.stringify(diag.env, null, 2) : "(unavailable)"}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full w-full overflow-y-auto bg-gray-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="rounded-xl border border-destructive/20 bg-white shadow-sm">
          <div className="flex items-start gap-4 border-b border-border p-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-foreground">Admin page crashed</h1>
              <p className="mt-1 text-sm text-muted-foreground">{cls.category}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => {
                  router.invalidate();
                  reset();
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
              <Link
                to="/admin/settings"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
              >
                <Home className="h-3.5 w-3.5" /> Settings
              </Link>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {/* Route + error */}
            <section>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Failing route
              </div>
              <div className="rounded-md bg-gray-50 px-3 py-2 font-mono text-sm">
                {location.pathname}
              </div>
            </section>

            <section>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Error message
              </div>
              <pre className="whitespace-pre-wrap break-words rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-destructive">
                {message}
              </pre>
            </section>

            {/* Hints */}
            {cls.hints.length > 0 && (
              <section>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Likely cause & fix
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                  {cls.hints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Env diagnostics */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Server env vars (Vercel)
                </div>
                <button
                  onClick={runDiagnostics}
                  disabled={diagLoading}
                  className="inline-flex items-center gap-1 rounded text-xs text-primary hover:underline disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${diagLoading ? "animate-spin" : ""}`} />
                  Re-check
                </button>
              </div>
              {diagError ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Diagnostics call failed: {diagError}
                  <div className="mt-1 text-amber-700">
                    This usually means the server function endpoint itself is broken — check Vercel
                    deployment.
                  </div>
                </div>
              ) : diag?.ok ? (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {Object.entries(diag.env).map(([k, present]) => {
                    const suspect = cls.envSuspects.includes(k);
                    return (
                      <div
                        key={k}
                        className={`flex items-center justify-between rounded-md border px-3 py-1.5 text-xs ${
                          present
                            ? "border-emerald-200 bg-emerald-50"
                            : suspect
                              ? "border-destructive/40 bg-destructive/5"
                              : "border-border bg-gray-50"
                        }`}
                      >
                        <span className="font-mono">{k}</span>
                        <span
                          className={`font-semibold ${
                            present
                              ? "text-emerald-700"
                              : suspect
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {present ? "set" : "missing"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : diag && !diag.ok ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {diag.error}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Checking…</div>
              )}
            </section>

            {/* Stack */}
            <section>
              <button
                onClick={() => setShowStack((s) => !s)}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                {showStack ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Stack trace
              </button>
              {showStack && (
                <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-gray-900 p-3 font-mono text-[11px] leading-relaxed text-gray-100">
                  {error?.stack || "(no stack available)"}
                </pre>
              )}
            </section>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <button
                onClick={copyReport}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy debug report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
