import { createFileRoute } from "@tanstack/react-router";
import { AdminErrorPanel } from "@/components/admin/AdminErrorPanel";
import { useEffect, useState } from "react";
import { Save, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Btn, Card, PageHeader } from "@/components/admin/ui";
import {
  loadPathaoCreds,
  savePathaoCreds,
  isPathaoConfigured,
  type PathaoCreds,
} from "@/lib/pathao-settings";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
  errorComponent: AdminErrorPanel,
});

function SettingsPage() {
  const [creds, setCreds] = useState<PathaoCreds>(loadPathaoCreds());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCreds(loadPathaoCreds());
  }, []);

  const handleSave = () => {
    savePathaoCreds(creds);
    setSaved(true);
    toast.success("Pathao settings saved");
    setTimeout(() => setSaved(false), 2000);
  };

  const set = <K extends keyof PathaoCreds>(k: K, v: PathaoCreds[K]) =>
    setCreds((p) => ({ ...p, [k]: v }));

  const configured = isPathaoConfigured(creds);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Settings" subtitle="Pathao courier API & store info" />
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Pathao Courier API</div>
                <div className="text-xs text-muted-foreground">
                  Credentials stored locally on this device
                </div>
              </div>
              {configured ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Configured
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  Not configured
                </span>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Environment">
                <select
                  value={creds.environment}
                  onChange={(e) => set("environment", e.target.value as "sandbox" | "production")}
                  className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm outline-none focus:border-[#1D9E75]"
                >
                  <option value="sandbox">Sandbox (testing)</option>
                  <option value="production">Production (live)</option>
                </select>
              </Field>
              <Field label="Store ID">
                <Input value={creds.storeId} onChange={(v) => set("storeId", v)} />
              </Field>
              <Field label="Client ID">
                <Input value={creds.clientId} onChange={(v) => set("clientId", v)} />
              </Field>
              <Field label="Client Secret">
                <Input
                  value={creds.clientSecret}
                  onChange={(v) => set("clientSecret", v)}
                  type="password"
                />
              </Field>
              <Field label="Username (email)">
                <Input value={creds.username} onChange={(v) => set("username", v)} />
              </Field>
              <Field label="Password">
                <Input
                  value={creds.password}
                  onChange={(v) => set("password", v)}
                  type="password"
                />
              </Field>
              <Field label="Sender Name">
                <Input value={creds.senderName} onChange={(v) => set("senderName", v)} />
              </Field>
              <Field label="Sender Phone">
                <Input value={creds.senderPhone} onChange={(v) => set("senderPhone", v)} />
              </Field>
              <Field label="Default Recipient City ID">
                <Input
                  value={creds.recipientCityId}
                  onChange={(v) => set("recipientCityId", v)}
                />
              </Field>
              <Field label="Default Recipient Zone ID">
                <Input
                  value={creds.recipientZoneId}
                  onChange={(v) => set("recipientZoneId", v)}
                />
              </Field>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Btn variant="primary" onClick={handleSave}>
                <Save className="h-4 w-4" /> {saved ? "Saved!" : "Save settings"}
              </Btn>
              <a
                href="https://merchant.pathao.com/courier/user/api-management"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#1D9E75] hover:underline"
              >
                Get Pathao API keys <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-2 text-sm font-semibold">How to get Pathao credentials</div>
            <ol className="ml-4 list-decimal space-y-1 text-xs text-muted-foreground">
              <li>
                Pathao Merchant portal e login koro:{" "}
                <a
                  href="https://merchant.pathao.com/"
                  className="text-[#1D9E75] hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  merchant.pathao.com
                </a>
              </li>
              <li>Settings → API Management e jao</li>
              <li>"Generate API Key" e click koro</li>
              <li>Client ID, Client Secret, username (email), password copy koro</li>
              <li>Store ID tomar store list theke pabe</li>
              <li>Eikhane paste koro ar Save click koro</li>
            </ol>
          </Card>
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

function Input({
  value,
  onChange,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-border bg-white px-2.5 text-sm outline-none focus:border-[#1D9E75]"
    />
  );
}
