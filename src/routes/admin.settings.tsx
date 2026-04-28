import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Loading, Btn, Input, Textarea, Modal, Empty } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

type Setting = { key: string; value: any; description: string | null };
type RoleRow = { id: string; user_id: string; role: string; created_at: string };

function SettingsPage() {
  const [editing, setEditing] = useState<Partial<Setting> | null>(null);

  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").order("key");
      if (error) throw error;
      return data as Setting[];
    },
  });

  const { data: roles, refetch: refetchRoles } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
      return (data ?? []) as RoleRow[];
    },
  });

  async function deleteSetting(key: string) {
    if (!confirm(`Delete setting "${key}"?`)) return;
    const { error } = await supabase.from("site_settings").delete().eq("key", key);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); refetch();
  }

  async function deleteRole(id: string) {
    if (!confirm("Remove role?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed"); refetchRoles();
  }

  return (
    <div>
      <PageHeader title="Settings" description="Site configuration and staff roles" />

      <BDCourierIntegration />

      <Card className="mb-5">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3" style={{ borderBottomWidth: "0.5px" }}>
          <div className="text-sm font-semibold">Site settings</div>
          <Btn variant="primary" onClick={() => setEditing({ key: "", value: "", description: "" })}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Btn>
        </div>
        {isLoading ? <Loading /> : settings?.length === 0 ? <Empty title="No settings yet" /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Key</th>
                <th className="px-4 py-2 text-left font-medium">Value</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {settings?.map((s) => (
                <tr key={s.key} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs">{s.key}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 max-w-md truncate">{JSON.stringify(s.value)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Btn onClick={() => setEditing(s)}>Edit</Btn>
                      <Btn variant="danger" onClick={() => deleteSetting(s.key)}><Trash2 className="h-3 w-3" /></Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3" style={{ borderBottomWidth: "0.5px" }}>
          <div className="text-sm font-semibold">Staff roles</div>
        </div>
        {!roles ? <Loading /> : roles.length === 0 ? <Empty title="No staff roles configured" /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left font-medium">User ID</th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{r.user_id}</td>
                  <td className="px-4 py-2.5"><Badge tone={r.role === "admin" ? "purple" : "blue"}>{r.role}</Badge></td>
                  <td className="px-4 py-2.5 text-right">
                    <Btn variant="danger" onClick={() => deleteRole(r.id)}><Trash2 className="h-3 w-3" /></Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {editing && <SettingModal s={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refetch(); }} />}
    </div>
  );
}

function SettingModal({ s, onClose, onSaved }: { s: Partial<Setting>; onClose: () => void; onSaved: () => void }) {
  const [key, setKey] = useState(s.key ?? "");
  const [value, setValue] = useState(typeof s.value === "string" ? s.value : JSON.stringify(s.value ?? "", null, 2));
  const [description, setDescription] = useState(s.description ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!key) return toast.error("Key required");
    let parsed: any = value;
    try { parsed = JSON.parse(value); } catch { /* keep as string */ }
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert({ key, value: parsed, description } as any, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved"); onSaved();
  }

  return (
    <Modal open onClose={onClose} title="Setting">
      <div className="space-y-3">
        <div><div className="mb-1 text-xs font-medium text-gray-600">Key</div><Input value={key} onChange={(e) => setKey(e.target.value)} disabled={!!s.key} /></div>
        <div><div className="mb-1 text-xs font-medium text-gray-600">Value (JSON or string)</div><Textarea rows={6} value={value} onChange={(e) => setValue(e.target.value)} /></div>
        <div><div className="mb-1 text-xs font-medium text-gray-600">Description</div><Input value={description ?? ""} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
      </div>
    </Modal>
  );
}

type IntegrationRow = {
  id: string;
  name: string;
  is_enabled: boolean;
  config: { api_key?: string; cache_hours?: number; stale_while_revalidate?: boolean } | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
};

function BDCourierIntegration() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [row, setRow] = useState<IntegrationRow | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [cacheHours, setCacheHours] = useState<number>(168);
  const [swr, setSwr] = useState(true);
  const [enabled, setEnabled] = useState(true);

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
        setCacheHours(Number(r.config?.cache_hours ?? 168));
        setSwr(r.config?.stale_while_revalidate !== false);
        setEnabled(r.is_enabled);
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    const payload = {
      name: "bd_courier",
      provider: "bdcourier",
      is_enabled: enabled,
      config: {
        api_key: apiKey.trim(),
        cache_hours: Number(cacheHours) || 168,
        stale_while_revalidate: swr,
      },
    };
    const { error } = row
      ? await supabase.from("integrations").update(payload).eq("id", row.id)
      : await supabase.from("integrations").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("BD Courier settings saved");
    const { data } = await supabase.from("integrations").select("*").eq("name", "bd_courier").maybeSingle();
    if (data) setRow(data as IntegrationRow);
  }

  async function test() {
    if (!apiKey.trim()) return toast.error("Enter an API key first");
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-courier-stats", {
        body: { phone: "01700000000", force_refresh: true },
      });
      if (error) throw error;
      if (data?.error) toast.error(`API error: ${data.error}`);
      else toast.success("BD Courier API connected ✓");
    } catch (e: any) {
      toast.error(e.message ?? "Test failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card className="mb-5">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3" style={{ borderBottomWidth: "0.5px" }}>
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">BD Courier integration</div>
          {row && <Badge tone={enabled ? "green" : "gray"}>{enabled ? "Enabled" : "Disabled"}</Badge>}
          {row?.last_sync_status && <Badge tone={row.last_sync_status === "success" ? "green" : "red"}>last: {row.last_sync_status}</Badge>}
        </div>
        <a href="https://bdcourier.com" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Get API key →</a>
      </div>
      {loading ? <Loading /> : (
        <div className="space-y-3 p-4">
          <div>
            <div className="mb-1 text-xs font-medium text-gray-600">API key</div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Bearer token from bdcourier.com"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">Stored securely in the database. Used by the courier-stats edge function.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs font-medium text-gray-600">Cache hours</div>
              <Input type="number" min={1} value={cacheHours} onChange={(e) => setCacheHours(Number(e.target.value))} />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={swr} onChange={(e) => setSwr(e.target.checked)} />
                Stale-while-revalidate
              </label>
            </div>
          </div>

          {row?.last_sync_at && (
            <p className="text-[11px] text-gray-500">Last synced: {new Date(row.last_sync_at).toLocaleString()}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Btn onClick={test} disabled={testing || saving}>
              {testing ? <><Loader2 className="h-3 w-3 animate-spin" /> Testing…</> : "Test connection"}
            </Btn>
            <Btn variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}
