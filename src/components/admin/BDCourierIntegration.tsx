import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, Btn, Input, Loading, Badge } from "@/components/admin/ui";
import { testCourierConnection } from "@/lib/courier.functions";

const DEFAULT_BASE_URL = "https://bdcourier.com/api/courier/check";
const DEFAULT_CACHE_HOURS = 168;

type IntegrationRow = {
  id: string;
  name: string;
  is_enabled: boolean;
  config: {
    api_key?: string;
    base_url?: string;
    cache_hours?: number;
    stale_while_revalidate?: boolean;
  } | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
};

type TestResult =
  | { state: "idle" }
  | { state: "running" }
  | { state: "ok"; message: string; source?: string; sampleTotal?: number }
  | { state: "fail"; message: string; status?: number };

export default function BDCourierIntegration() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [row, setRow] = useState<IntegrationRow | null>(null);

  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [cacheHours, setCacheHours] = useState<number>(DEFAULT_CACHE_HOURS);
  const [swr, setSwr] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [testPhone, setTestPhone] = useState("01700000000");
  const [test, setTest] = useState<TestResult>({ state: "idle" });

  const testFn = useServerFn(testCourierConnection);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("name", "bd_courier")
        .maybeSingle();
      if (data) {
        const r = data as IntegrationRow;
        setRow(r);
        setApiKey(r.config?.api_key ?? "");
        setBaseUrl(r.config?.base_url || DEFAULT_BASE_URL);
        setCacheHours(Number(r.config?.cache_hours) || DEFAULT_CACHE_HOURS);
        setSwr(r.config?.stale_while_revalidate !== false);
        setEnabled(r.is_enabled);
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!apiKey.trim()) {
      toast.error("API key is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: "bd_courier",
      provider: "bdcourier",
      is_enabled: enabled,
      config: {
        api_key: apiKey.trim(),
        base_url: baseUrl.trim() || DEFAULT_BASE_URL,
        cache_hours: Number(cacheHours) || DEFAULT_CACHE_HOURS,
        stale_while_revalidate: swr,
      },
    };
    const res = row
      ? await supabase.from("integrations").update(payload).eq("id", row.id)
      : await supabase.from("integrations").insert(payload);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("BD Courier settings saved");
    const { data } = await supabase
      .from("integrations")
      .select("*")
      .eq("name", "bd_courier")
      .maybeSingle();
    if (data) setRow(data as IntegrationRow);
  }

  async function runTest() {
    if (!apiKey.trim() && !row?.config?.api_key) {
      toast.error("Enter an API key first");
      return;
    }
    setTest({ state: "running" });
    try {
      const result = await testFn({
        data: {
          phone: testPhone || "01700000000",
          // If user has typed a key but not saved yet, test against it directly
          ...(apiKey.trim() && apiKey.trim() !== (row?.config?.api_key ?? "")
            ? { override_api_key: apiKey.trim() }
            : {}),
          ...(baseUrl.trim() && baseUrl.trim() !== (row?.config?.base_url ?? "")
            ? { override_base_url: baseUrl.trim() }
            : {}),
        },
      });
      if (result.ok) {
        setTest({
          state: "ok",
          message: `Connected — ${result.sample_total ?? 0} parcels found for sample phone`,
          source: result.source,
          sampleTotal: result.sample_total,
        });
        // Persist last_sync_status if a row exists
        if (row) {
          await supabase
            .from("integrations")
            .update({ last_sync_status: "success", last_sync_at: new Date().toISOString() })
            .eq("id", row.id);
        }
      } else {
        setTest({
          state: "fail",
          message: result.error || "Connection failed",
          status: result.status,
        });
        if (row) {
          await supabase
            .from("integrations")
            .update({ last_sync_status: "failed", last_sync_at: new Date().toISOString() })
            .eq("id", row.id);
        }
      }
    } catch (e) {
      setTest({ state: "fail", message: (e as Error).message });
    }
  }

  return (
    <Card className="mb-5">
      <div
        className="flex items-center justify-between border-b border-gray-200 px-4 py-3"
        style={{ borderBottomWidth: "0.5px" }}
      >
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">BD Courier integration</div>
          {row && <Badge tone={enabled ? "green" : "gray"}>{enabled ? "Enabled" : "Disabled"}</Badge>}
          {row?.last_sync_status === "success" && <Badge tone="green">last test: ok</Badge>}
          {row?.last_sync_status === "failed" && <Badge tone="red">last test: failed</Badge>}
        </div>
        <a
          href="https://app.bdcourier.com/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          Get API key <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-4 p-4">
          {/* Step 1: API key */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">
                1. API key <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-gray-400">
                from app.bdcourier.com → Settings → API
              </span>
            </div>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Bearer token from app.bdcourier.com"
                className="pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Toggle key visibility"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              Stored encrypted in the integrations table. Used only by server-side code.
            </p>
          </div>

          {/* Step 2: Endpoint */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">2. API endpoint</label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={DEFAULT_BASE_URL}
              className="font-mono text-xs"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Default: <code className="rounded bg-gray-100 px-1 py-0.5">{DEFAULT_BASE_URL}</code>
            </p>
          </div>

          {/* Step 3: Cache + flags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">3. Cache hours</label>
              <Input
                type="number"
                min={1}
                max={720}
                value={cacheHours}
                onChange={(e) => setCacheHours(Number(e.target.value))}
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Re-use cached results for this long (default 168 = 7 days). BD Courier charges per call.
              </p>
            </div>
            <div className="flex flex-col justify-start gap-2 pt-5">
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                Enabled (server will call BD Courier)
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={swr}
                  onChange={(e) => setSwr(e.target.checked)}
                />
                Stale-while-revalidate (serve cached on API failure)
              </label>
            </div>
          </div>

          {/* Step 4: Test */}
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">4. Test connection</label>
              {row?.last_sync_at && (
                <span className="text-[11px] text-gray-400">
                  last: {new Date(row.last_sync_at).toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="font-mono text-xs"
              />
              <Btn onClick={runTest} disabled={test.state === "running" || saving}>
                {test.state === "running" ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Testing…
                  </>
                ) : (
                  "Test now"
                )}
              </Btn>
            </div>
            {test.state === "ok" && (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <div className="font-medium">{test.message}</div>
                  <div className="text-[11px] text-emerald-600/80">
                    Key source: {test.source ?? "unknown"}
                  </div>
                </div>
              </div>
            )}
            {test.state === "fail" && (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <div className="font-medium">{test.message}</div>
                  {test.status !== undefined && (
                    <div className="text-[11px] text-rose-600/80">HTTP {test.status}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <Btn variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : row ? "Update settings" : "Save & enable"}
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}
