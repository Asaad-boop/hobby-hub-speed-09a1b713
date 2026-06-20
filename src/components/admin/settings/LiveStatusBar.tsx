import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getTrackingStatus } from "@/lib/admin-settings.functions";
import { Card } from "@/components/admin/ui";

type Settings = Record<string, unknown>;

function Pill({
  label,
  state,
  hint,
}: {
  label: string;
  state: "ok" | "warn" | "off";
  hint?: string;
}) {
  const dot =
    state === "ok" ? "bg-emerald-500" : state === "warn" ? "bg-amber-500" : "bg-gray-300";
  const text =
    state === "ok" ? "text-emerald-700" : state === "warn" ? "text-amber-700" : "text-gray-500";
  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs">
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
      <span className="font-medium text-gray-800">{label}</span>
      <span className={text}>{hint ?? (state === "ok" ? "OK" : state === "warn" ? "Check" : "Off")}</span>
    </div>
  );
}

export function LiveStatusBar() {
  const trackingFn = useServerFn(getTrackingStatus);

  const { data: settings } = useQuery({
    queryKey: ["admin", "settings", "live"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key,value");
      const map: Settings = {};
      for (const r of data ?? []) map[(r as { key: string }).key] = (r as { value: unknown }).value;
      return map;
    },
  });

  const { data: tracking } = useQuery({
    queryKey: ["admin", "tracking-status"],
    refetchInterval: 60_000,
    queryFn: () => trackingFn(),
  });

  const { data: pathao } = useQuery({
    queryKey: ["admin", "pathao-status"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("courier_credentials")
        .select("provider")
        .eq("provider", "pathao")
        .maybeSingle();
      return !!data;
    },
  });

  const pixelOn =
    (settings?.["meta_pixel_enabled"] ?? true) !== false &&
    !!(settings?.["meta_pixel_id"] ?? "2024086381823502");
  const ga4On = !!settings?.["ga4_measurement_id"] || true; // hardcoded in __root.tsx today
  const clarityOn = !!settings?.["clarity_project_id"] || true; // hardcoded today
  const capiOn = !!tracking?.capi.tokenConfigured;

  return (
    <Card className="mb-5">
      <div className="border-b border-gray-200 px-4 py-2.5 text-sm font-semibold" style={{ borderBottomWidth: "0.5px" }}>
        Live status
      </div>
      <div className="flex flex-wrap gap-2 p-3">
        <Pill label="Store" state="ok" hint="Online" />
        <Pill label="Meta Pixel" state={pixelOn ? "ok" : "off"} hint={pixelOn ? "Active" : "Disabled"} />
        <Pill
          label="Meta CAPI"
          state={capiOn ? "ok" : "warn"}
          hint={capiOn ? "Connected" : "Not configured"}
        />
        <Pill label="GA4" state={ga4On ? "ok" : "off"} hint={ga4On ? "Tracking" : "Off"} />
        <Pill label="Clarity" state={clarityOn ? "ok" : "off"} hint={clarityOn ? "Active" : "Off"} />
        <Pill label="Pathao" state={pathao ? "ok" : "warn"} hint={pathao ? "Connected" : "Check creds"} />
        <Pill label="Supabase" state="ok" hint="Connected" />
      </div>
    </Card>
  );
}
