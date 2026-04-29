import { useState } from "react";
import { Save, KeyRound, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  loadPathaoSettings, savePathaoSettings, isPathaoConfigured,
  type PathaoSettings,
} from "@/lib/pathao-settings";
import { Btn, Input, PageHeader, Select } from "@/components/admin/ui";

export default function SettingsPage() {
  const [s, setS] = useState<PathaoSettings>(() => loadPathaoSettings());
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const configured = isPathaoConfigured(s);

  const update = <K extends keyof PathaoSettings>(k: K, v: PathaoSettings[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  const save = () => {
    savePathaoSettings(s);
    setSavedAt(Date.now());
    toast.success("Pathao settings saved");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title="Settings"
        subtitle="Courier API credentials & sender defaults"
        actions={<Btn variant="primary" onClick={save}><Save className="h-4 w-4" />Save Settings</Btn>}
      />

      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Status banner */}
          <div className={`flex items-start gap-3 rounded-lg border p-4 ${
            configured
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}>
            {configured
              ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
            <div className="text-sm">
              <div className="font-semibold">
                {configured ? "Pathao API ready" : "Pathao API not configured"}
              </div>
              <div className="text-xs opacity-80">
                {configured
                  ? "1-Click Courier Entry will create real Pathao consignments when Pathao is selected."
                  : "Add your Pathao merchant credentials below to enable real consignment creation."}
              </div>
            </div>
          </div>

          {/* Pathao card */}
          <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <header className="flex items-center gap-2 border-b border-gray-200 px-5 py-3">
              <KeyRound className="h-4 w-4 text-[#1D9E75]" />
              <h2 className="text-sm font-semibold">Pathao Courier API</h2>
            </header>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Environment">
                <Select
                  value={s.baseUrl}
                  onChange={(e) => update("baseUrl", e.target.value)}
                >
                  <option value="https://courier-api-sandbox.pathao.com">Sandbox</option>
                  <option value="https://api-hermes.pathao.com">Production</option>
                </Select>
              </Field>
              <Field label="Store ID">
                <Input value={s.storeId} onChange={(e) => update("storeId", e.target.value)} placeholder="148381" />
              </Field>

              <Field label="Client ID">
                <Input value={s.clientId} onChange={(e) => update("clientId", e.target.value)} />
              </Field>
              <Field label="Client Secret">
                <Input type="password" value={s.clientSecret} onChange={(e) => update("clientSecret", e.target.value)} />
              </Field>

              <Field label="Username (merchant email)">
                <Input value={s.username} onChange={(e) => update("username", e.target.value)} />
              </Field>
              <Field label="Password">
                <Input type="password" value={s.password} onChange={(e) => update("password", e.target.value)} />
              </Field>
            </div>

            <header className="border-t border-gray-200 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sender & default delivery zone
            </header>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Sender name">
                <Input value={s.senderName} onChange={(e) => update("senderName", e.target.value)} />
              </Field>
              <Field label="Sender phone">
                <Input value={s.senderPhone} onChange={(e) => update("senderPhone", e.target.value)} />
              </Field>
              <Field label="Default recipient city ID">
                <Input value={s.recipientCityId} onChange={(e) => update("recipientCityId", e.target.value)} placeholder="1 = Dhaka" />
              </Field>
              <Field label="Default recipient zone ID">
                <Input value={s.recipientZoneId} onChange={(e) => update("recipientZoneId", e.target.value)} placeholder="e.g. 298" />
              </Field>
            </div>

            <footer className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-3 text-xs text-muted-foreground">
              <span>
                {savedAt
                  ? `Saved ${new Date(savedAt).toLocaleTimeString()}`
                  : "Stored locally in your browser. Never sent except to the Pathao API."}
              </span>
              <Btn variant="primary" onClick={save}><Save className="h-4 w-4" />Save</Btn>
            </footer>
          </section>

          <p className="text-xs text-muted-foreground">
            Get city / zone IDs from{" "}
            <code className="rounded bg-gray-100 px-1">/aladdin/api/v1/city-list</code> and{" "}
            <code className="rounded bg-gray-100 px-1">/cities/&#123;cityId&#125;/zone-list</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
