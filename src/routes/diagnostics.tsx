import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Server, Globe, Route as RouteIcon, Zap } from "lucide-react";

const getServerInfo = createServerFn({ method: "GET" }).handler(async () => {
  return {
    timestamp: new Date().toISOString(),
    runtime: typeof (globalThis as any).navigator?.userAgent === "string" && (globalThis as any).navigator.userAgent.includes("Cloudflare")
      ? "Cloudflare Workers"
      : typeof process !== "undefined" && process.versions?.node
        ? `Node.js ${process.versions.node}`
        : "Unknown / Edge",
    hasProcess: typeof process !== "undefined",
    serverFunctionReachable: true,
  };
});

export const Route = createFileRoute("/diagnostics")({
  head: () => ({
    meta: [
      { title: "Deployment Diagnostics" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async () => {
    try {
      const info = await getServerInfo();
      return { serverInfo: info, serverError: null as string | null };
    } catch (e) {
      return { serverInfo: null, serverError: e instanceof Error ? e.message : String(e) };
    }
  },
  component: DiagnosticsPage,
});

type Status = "ok" | "warn" | "fail" | "info";

function StatusIcon({ status }: { status: Status }) {
  if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (status === "fail") return <XCircle className="h-5 w-5 text-destructive" />;
  if (status === "warn") return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
}

function Row({ label, value, status }: { label: string; value: React.ReactNode; status: Status }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <div className="flex items-center gap-2">
        <StatusIcon status={status} />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className="text-right text-sm text-muted-foreground break-all max-w-[60%]">{value}</div>
    </div>
  );
}

function detectHost(host: string): { platform: string; status: Status; note: string } {
  if (host.includes("lovable.app")) {
    return { platform: "Lovable (Cloudflare Workers)", status: "ok", note: "SPA fallback + SSR built-in. No vercel.json needed." };
  }
  if (host.includes("vercel.app") || host.endsWith(".vercel.sh")) {
    return { platform: "Vercel", status: "warn", note: "TanStack Start needs the official Vercel adapter — not a static SPA config." };
  }
  if (host.includes("netlify.app")) {
    return { platform: "Netlify", status: "warn", note: "Requires Netlify adapter for SSR." };
  }
  if (host === "localhost" || host.startsWith("127.") || host.startsWith("192.168.")) {
    return { platform: "Local Dev", status: "info", note: "Vite dev server" };
  }
  return { platform: `Custom domain (${host})`, status: "info", note: "Custom domain — check DNS routing to Lovable hosting." };
}

function DiagnosticsPage() {
  const { serverInfo, serverError } = Route.useLoaderData();
  const [client, setClient] = useState<{
    host: string;
    href: string;
    userAgent: string;
    deepLinkOk: boolean | null;
  }>({ host: "", href: "", userAgent: "", deepLinkOk: null });

  useEffect(() => {
    setClient({
      host: window.location.host,
      href: window.location.href,
      userAgent: navigator.userAgent,
      deepLinkOk: true, // if this component renders at /diagnostics, deep-link routing works
    });
  }, []);

  const hostInfo = client.host ? detectHost(client.host) : { platform: "Detecting...", status: "info" as Status, note: "" };

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Deployment Diagnostics</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Check where this app is hosted and verify routing works correctly.
          </p>
        </div>

        {/* Hosting Platform */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Hosting Platform</h2>
          </div>
          <Row label="Detected platform" value={hostInfo.platform} status={hostInfo.status} />
          <Row label="Current host" value={client.host || "—"} status="info" />
          <Row label="Full URL" value={client.href || "—"} status="info" />
          {hostInfo.note && (
            <p className="mt-3 rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <strong>Note:</strong> {hostInfo.note}
            </p>
          )}
        </div>

        {/* Route Handling */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <RouteIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Route Handling</h2>
          </div>
          <Row
            label="Deep link rendering (/diagnostics)"
            value={client.deepLinkOk ? "Working" : "Checking..."}
            status={client.deepLinkOk ? "ok" : "info"}
          />
          <Row label="Client-side routing" value="TanStack Router (file-based)" status="ok" />
          <p className="mt-3 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <strong>Test:</strong> Refresh this page (Ctrl/Cmd+R). If it still loads, SPA fallback works. If you get
            a 404 on refresh, your hosting platform isn't serving <code>index.html</code> for unknown paths.
          </p>
        </div>

        {/* Server Runtime */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Server Runtime</h2>
          </div>
          {serverError ? (
            <Row label="Server function" value={serverError} status="fail" />
          ) : serverInfo ? (
            <>
              <Row label="Server function reachable" value="Yes" status="ok" />
              <Row label="Runtime" value={serverInfo.runtime} status="info" />
              <Row label="Server timestamp" value={serverInfo.timestamp} status="info" />
            </>
          ) : (
            <Row label="Server function" value="No data" status="warn" />
          )}
        </div>

        {/* 404 Troubleshooting */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Getting 404s? Check these</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary">•</span> <span><strong>Lovable hosting:</strong> SPA fallback is automatic. No <code>vercel.json</code> / <code>_redirects</code> needed. Just click <strong>Publish</strong>.</span></li>
            <li className="flex gap-2"><span className="text-primary">•</span> <span><strong>Vercel:</strong> This template targets Cloudflare Workers (<code>wrangler.jsonc</code>). Vercel needs a different adapter — a static SPA config will break SSR routes.</span></li>
            <li className="flex gap-2"><span className="text-primary">•</span> <span><strong>Custom domain:</strong> Verify DNS points to Lovable. Project Settings → Domains.</span></li>
            <li className="flex gap-2"><span className="text-primary">•</span> <span><strong>Route doesn't exist:</strong> Check <code>src/routes/</code> — the file must exist for the URL.</span></li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Go Home
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Refresh (test SPA fallback)
          </button>
        </div>
      </div>
    </div>
  );
}
