import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Loading, Empty, Btn, Input, Modal } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesPage,
});

type Category = { id: string; name: string; slug: string; description: string | null; image_url: string | null; is_active: boolean; display_order: number };

function CategoriesPage() {
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("display_order").order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  async function remove(id: string) {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); refetch();
  }

  async function toggle(c: Category) {
    await supabase.from("categories").update({ is_active: !c.is_active }).eq("id", c.id);
    refetch();
  }

  return (
    <div>
      <PageHeader title="Categories" description={`${data?.length ?? 0} categories`}
        actions={<Btn variant="primary" onClick={() => setEditing({ is_active: true, display_order: 0 })}><Plus className="h-3.5 w-3.5" /> New</Btn>} />
      <Card>
        {isLoading ? <Loading /> : data?.length === 0 ? <Empty title="No categories yet" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Order</th>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Slug</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500">{c.display_order}</td>
                    <td className="px-4 py-2.5 font-medium">{c.name}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">/{c.slug}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => toggle(c)} className={`text-xs font-medium ${c.is_active ? "text-green-700" : "text-gray-400"}`}>
                        {c.is_active ? "Active" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Btn onClick={() => setEditing(c)}><Pencil className="h-3 w-3" /></Btn>
                        <Btn variant="danger" onClick={() => remove(c.id)}><Trash2 className="h-3 w-3" /></Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editing && <CatModal cat={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refetch(); }} />}
    </div>
  );
}

function CatModal({ cat, onClose, onSaved }: { cat: Partial<Category>; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Category>>(cat);
  const [saving, setSaving] = useState(false);
  const isNew = !cat.id;

  async function save() {
    if (!form.name || !form.slug) return toast.error("Name and slug required");
    setSaving(true);
    const payload: any = {
      name: form.name, slug: form.slug, description: form.description ?? null,
      image_url: form.image_url ?? null, is_active: form.is_active ?? true,
      display_order: Number(form.display_order) || 0,
    };
    const res = isNew
      ? await supabase.from("categories").insert(payload)
      : await supabase.from("categories").update(payload).eq("id", cat.id!);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved"); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={isNew ? "New category" : "Edit category"}>
      <div className="space-y-3">
        <div><div className="mb-1 text-xs font-medium text-gray-600">Name</div><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} /></div>
        <div><div className="mb-1 text-xs font-medium text-gray-600">Slug</div><Input value={form.slug ?? ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
        <div><div className="mb-1 text-xs font-medium text-gray-600">Image URL</div><Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
        <div><div className="mb-1 text-xs font-medium text-gray-600">Display order</div><Input type="number" value={form.display_order ?? 0} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
      </div>
    </Modal>
  );
}
