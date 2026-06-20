import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Settings as SettingsIcon, Sliders, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/ui";
import { LiveStatusBar } from "@/components/admin/settings/LiveStatusBar";
import { TrackingTab } from "@/components/admin/settings/TrackingTab";
import { GeneralTab } from "@/components/admin/settings/GeneralTab";
import { AdvancedTab } from "@/components/admin/settings/AdvancedTab";
import { StaffTab } from "@/components/admin/settings/StaffTab";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

type TabKey = "tracking" | "general" | "advanced" | "staff";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "tracking", label: "Tracking", icon: Activity },
  { key: "general", label: "General", icon: SettingsIcon },
  { key: "advanced", label: "Advanced", icon: Sliders },
  { key: "staff", label: "Staff", icon: Users },
];

function SettingsPage() {
  const [tab, setTab] = useState<TabKey>("tracking");

  // Shared map of all settings, used by Tracking + General tabs.
  const { data: settings } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key,value");
      if (error) throw error;
      const map: Record<string, unknown> = {};
      for (const r of data ?? []) map[(r as { key: string }).key] = (r as { value: unknown }).value;
      return map;
    },
  });

  return (
    <div>
      <PageHeader title="Settings" description="Site configuration, tracking & staff roles" />

      <LiveStatusBar />

      <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Left nav */}
        <nav className="flex flex-row gap-1 overflow-x-auto rounded-md border border-gray-200 bg-white p-1 text-sm lg:flex-col lg:overflow-visible">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded px-3 py-2 text-left text-sm transition ${
                  active
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Right pane */}
        <div className="min-w-0">
          {tab === "tracking" && <TrackingTab settings={settings ?? {}} />}
          {tab === "general" && <GeneralTab settings={settings ?? {}} />}
          {tab === "advanced" && <AdvancedTab />}
          {tab === "staff" && <StaffTab />}
        </div>
      </div>
    </div>
  );
}
