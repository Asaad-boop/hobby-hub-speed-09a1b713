import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, Btn, Input, Textarea } from "@/components/admin/ui";

type SettingsMap = Record<string, unknown>;

const FIELDS: { key: string; label: string; placeholder?: string; type?: "text" | "textarea" }[] = [
  { key: "site_title", label: "Store name", placeholder: "HobbyShop" },
  { key: "site_tagline", label: "Tagline", placeholder: "Unique gadgets & gifts" },
  { key: "logo_url", label: "Logo URL", placeholder: "https://…/logo.png" },
  { key: "og_image_url", label: "Default OG / share image URL", placeholder: "https://…/og.jpg" },
  { key: "favicon_url", label: "Favicon URL", placeholder: "https://…/favicon.ico" },
  { key: "contact_phone", label: "Contact phone", placeholder: "+8801XXXXXXXXX" },
  { key: "contact_email", label: "Contact email", placeholder: "hello@example.com" },
  { key: "whatsapp_number", label: "WhatsApp number (digits only)", placeholder: "8801865230553" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "social_facebook", label: "Facebook URL" },
  { key: "social_instagram", label: "Instagram URL" },
  { key: "social_tiktok", label: "TikTok URL" },
  { key: "social_youtube", label: "YouTube URL" },
];

export function GeneralTab({ settings }: { settings: SettingsMap }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const f of FIELDS) next[f.key] = String(settings[f.key] ?? "");
    setForm(next);
  }, [settings]);

  async function save() {
    setSaving(true);
    try {
      const rows = FIELDS.map((f) => ({ key: f.key, value: form[f.key] ?? "" }));
      const { error } = await supabase
        .from("site_settings")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(rows as any, { onConflict: "key" });
      if (error) throw error;
      toast.success("General settings saved");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["admin", "settings", "live"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div
        className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5"
        style={{ borderBottomWidth: "0.5px" }}
      >
        <div className="text-sm font-semibold">General store info</div>
        <Btn variant="primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Btn>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
            <div className="mb-1 text-xs font-medium text-gray-600">{f.label}</div>
            {f.type === "textarea" ? (
              <Textarea
                rows={3}
                value={form[f.key] ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
            ) : (
              <Input
                value={form[f.key] ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
