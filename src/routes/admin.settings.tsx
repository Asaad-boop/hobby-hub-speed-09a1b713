import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Loading, Btn, Input, Textarea, Modal, Empty, Badge } from "@/components/admin/ui";
import BDCourierIntegration from "@/components/admin/BDCourierIntegration";

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

