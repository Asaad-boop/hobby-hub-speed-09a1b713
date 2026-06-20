import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, Send, ShieldCheck, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Btn, Input, Badge } from "@/components/admin/ui";
import {
  getTrackingStatus,
  getEventCounts24h,
  sendTestCapiEvent,
} from "@/lib/admin-settings.functions";

type SettingsMap = Record<string, unknown>;

async function upsertSettings(rows: { key: string; value: unknown }[]) {
  const { error } = await supabase
    .from("site_settings")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(rows as any, { onConflict: "key" });
  if (error) throw error;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5"
      style={{ borderBottomWidth: "0.5px" }}
    >
      <div className="text-sm font-semibold">{title}</div>
      {right}
    </div>
  );
}

export function TrackingTab({ settings }: { settings: SettingsMap }) {
  const qc = useQueryClient();
  const trackingFn = useServerFn(getTrackingStatus);
  const eventsFn = useServerFn(getEventCounts24h);
  const testCapiFn = useServerFn(sendTestCapiEvent);

  const { data: tracking } = useQuery({
    queryKey: ["admin", "tracking-status"],
    queryFn: () => trackingFn(),
  });

  const { data: events, refetch: refetchEvents } = useQuery({
    queryKey: ["admin", "events-24h"],
    refetchInterval: 60_000,
    queryFn: () => eventsFn(),
  });

  // ---- Pixel card state ----
  const [pixelId, setPixelId] = useState(String(settings.meta_pixel_id ?? "2024086381823502"));
  const [pixelEnabled, setPixelEnabled] = useState(settings.meta_pixel_enabled !== false);
  const [testCode, setTestCode] = useState(String(settings.meta_test_event_code ?? ""));
  const [ga4Id, setGa4Id] = useState(String(settings.ga4_measurement_id ?? "G-Q17CKC2FG1"));
  const [ga4Enabled, setGa4Enabled] = useState(settings.ga4_enabled !== false);
  const [clarityId, setClarityId] = useState(String(settings.clarity_project_id ?? "wh5255b06h"));
  const [clarityEnabled, setClarityEnabled] = useState(settings.clarity_enabled !== false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setPixelId(String(settings.meta_pixel_id ?? "2024086381823502"));
    setPixelEnabled(settings.meta_pixel_enabled !== false);
    setTestCode(String(settings.meta_test_event_code ?? ""));
    setGa4Id(String(settings.ga4_measurement_id ?? "G-Q17CKC2FG1"));
    setGa4Enabled(settings.ga4_enabled !== false);
    setClarityId(String(settings.clarity_project_id ?? "wh5255b06h"));
    setClarityEnabled(settings.clarity_enabled !== false);
  }, [settings]);

  async function save(card: string, rows: { key: string; value: unknown }[]) {
    setSavingKey(card);
    try {
      await upsertSettings(rows);
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["admin", "settings", "live"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingKey(null);
    }
  }

  async function sendTest() {
    setTesting(true);
    try {
      const res = await testCapiFn();
      if (res.ok) toast.success("Test event sent to Meta. Check Events Manager → Test Events.");
      else toast.error(`Test failed: ${("error" in res && res.error) || ("body" in res && res.body) || "unknown"}`);
    } finally {
      setTesting(false);
    }
  }

  const eventCounts = events?.ok ? events.counts : {};
  const eventRows: { label: string; key: string }[] = [
    { label: "Page views", key: "page_view" },
    { label: "View item", key: "view_item" },
    { label: "Add to cart", key: "add_to_cart" },
    { label: "Begin checkout", key: "begin_checkout" },
    { label: "Purchase", key: "purchase" },
  ];

  return (
    <div className="space-y-5">
      {/* Meta Pixel */}
      <Card>
        <SectionHeader
          title="Meta Pixel"
          right={
            <Badge tone={pixelEnabled && pixelId ? "green" : "gray"}>
              {pixelEnabled && pixelId ? "Active" : "Disabled"}
            </Badge>
          }
        />
        <div className="space-y-3 p-4">
          <div>
            <div className="mb-1 text-xs font-medium text-gray-600">Pixel ID</div>
            <Input value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="2024086381823502" />
          </div>
          <Toggle checked={pixelEnabled} onChange={setPixelEnabled} label="Enable Meta Pixel" />
          <div className="flex justify-end">
            <Btn
              variant="primary"
              disabled={savingKey === "pixel"}
              onClick={() =>
                save("pixel", [
                  { key: "meta_pixel_id", value: pixelId.trim() },
                  { key: "meta_pixel_enabled", value: pixelEnabled },
                ])
              }
            >
              {savingKey === "pixel" ? "Saving…" : "Save"}
            </Btn>
          </div>
        </div>
      </Card>

      {/* Meta CAPI */}
      <Card>
        <SectionHeader
          title="Meta Conversions API (server-side)"
          right={
            tracking?.capi.tokenConfigured ? (
              <Badge tone="green">
                <ShieldCheck className="mr-1 inline h-3 w-3" /> Configured
              </Badge>
            ) : (
              <Badge tone="red">
                <ShieldOff className="mr-1 inline h-3 w-3" /> Not configured
              </Badge>
            )
          }
        />
        <div className="space-y-3 p-4 text-sm">
          <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
            CAPI token is a server-only Lovable secret (<code>META_CAPI_TOKEN</code>) — it never reaches the browser.
            {tracking?.capi.tokenPreview && (
              <> Current: <span className="font-mono">{tracking.capi.tokenPreview}</span></>
            )}
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-gray-600">Test Event Code (optional, for debugging)</div>
            <Input
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              placeholder="TEST12345"
            />
            <div className="mt-1 text-xs text-gray-500">
              Note: this is stored in DB. The actual token <code>META_TEST_EVENT_CODE</code> is set as a Lovable secret.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn
              variant="primary"
              disabled={savingKey === "capi"}
              onClick={() => save("capi", [{ key: "meta_test_event_code", value: testCode.trim() }])}
            >
              {savingKey === "capi" ? "Saving…" : "Save"}
            </Btn>
            <Btn onClick={sendTest} disabled={testing || !tracking?.capi.tokenConfigured}>
              <Send className="h-3.5 w-3.5" /> {testing ? "Sending…" : "Send test Purchase event"}
            </Btn>
            <a
              href="https://business.facebook.com/events_manager2/list/pixel"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Open Events Manager <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </Card>

      {/* Live Pixel Stats */}
      <Card>
        <SectionHeader
          title="Live event counts (last 24h)"
          right={
            <Btn onClick={() => refetchEvents()}>Refresh</Btn>
          }
        />
        <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-5">
          {eventRows.map((r) => (
            <div key={r.key} className="bg-white p-3 text-center">
              <div className="text-xs text-gray-500">{r.label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{eventCounts[r.key] ?? 0}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* GA4 */}
      <Card>
        <SectionHeader
          title="Google Analytics 4"
          right={<Badge tone={ga4Enabled && ga4Id ? "green" : "gray"}>{ga4Enabled && ga4Id ? "Active" : "Off"}</Badge>}
        />
        <div className="space-y-3 p-4">
          <div>
            <div className="mb-1 text-xs font-medium text-gray-600">Measurement ID</div>
            <Input value={ga4Id} onChange={(e) => setGa4Id(e.target.value)} placeholder="G-XXXXXXXXXX" />
          </div>
          <Toggle checked={ga4Enabled} onChange={setGa4Enabled} label="Enable GA4 tracking" />
          <div className="flex justify-end">
            <Btn
              variant="primary"
              disabled={savingKey === "ga4"}
              onClick={() =>
                save("ga4", [
                  { key: "ga4_measurement_id", value: ga4Id.trim() },
                  { key: "ga4_enabled", value: ga4Enabled },
                ])
              }
            >
              {savingKey === "ga4" ? "Saving…" : "Save"}
            </Btn>
          </div>
          <div className="text-xs text-gray-500">
            Note: the GA4 script tag is currently hardcoded in the root layout. Saving here updates the
            stored config — wire it into the loader to make it dynamic.
          </div>
        </div>
      </Card>

      {/* Clarity */}
      <Card>
        <SectionHeader
          title="Microsoft Clarity"
          right={
            <Badge tone={clarityEnabled && clarityId ? "green" : "gray"}>
              {clarityEnabled && clarityId ? "Active" : "Off"}
            </Badge>
          }
        />
        <div className="space-y-3 p-4">
          <div>
            <div className="mb-1 text-xs font-medium text-gray-600">Project ID</div>
            <Input value={clarityId} onChange={(e) => setClarityId(e.target.value)} placeholder="wh5255b06h" />
          </div>
          <Toggle checked={clarityEnabled} onChange={setClarityEnabled} label="Enable Clarity session recording" />
          <div className="flex justify-end">
            <Btn
              variant="primary"
              disabled={savingKey === "clarity"}
              onClick={() =>
                save("clarity", [
                  { key: "clarity_project_id", value: clarityId.trim() },
                  { key: "clarity_enabled", value: clarityEnabled },
                ])
              }
            >
              {savingKey === "clarity" ? "Saving…" : "Save"}
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
