import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil, Upload, X, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PageHeader, Card, Loading, Empty, Badge, Btn, Input, Modal, Textarea, Select,
  fmtBDT,
} from "@/components/admin/ui";

export const Route = createFileRoute("/admin/products")({
  component: ProductsPage,
});

type Product = {
  id: string;
  title: string;
  slug: string;
  price: number;
  old_price: number | null;
  stock: number;
  image: string;
  gallery: string[];
  description: string;
  is_active: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  category_id: string | null;
};

function ProductsPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: cats } = useQuery({
    queryKey: ["admin", "categories", "all"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name").order("name");
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase())
  );

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); refetch();
  }

  async function toggleActive(p: Product) {
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    refetch();
  }

  return (
    <div>
      <PageHeader title="Products" description={`${data?.length ?? 0} total`}
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-7 w-64" />
            </div>
            <Btn variant="primary" onClick={() => setEditing({ is_active: true, stock: 0, price: 0, title: "", slug: "", description: "", image: "", gallery: [] })}>
              <Plus className="h-3.5 w-3.5" /> New product
            </Btn>
          </>
        }
      />

      <Card>
        {isLoading ? <Loading /> : filtered.length === 0 ? <Empty title="No products" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Product</th>
                  <th className="px-4 py-2 text-left font-medium">Price</th>
                  <th className="px-4 py-2 text-left font-medium">Stock</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {p.image && <img src={p.image} alt="" className="h-9 w-9 rounded object-cover" />}
                        <div>
                          <div className="font-medium">{p.title}</div>
                          <div className="text-[11px] text-gray-400">/{p.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div>{fmtBDT(p.price)}</div>
                      {p.old_price && <div className="text-[11px] text-gray-400 line-through">{fmtBDT(p.old_price)}</div>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={p.stock > 0 ? "green" : "red"}>{p.stock}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => toggleActive(p)} className={`text-xs font-medium ${p.is_active ? "text-green-700" : "text-gray-400"}`}>
                        {p.is_active ? "Active" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Btn onClick={() => setEditing(p)}><Pencil className="h-3 w-3" /></Btn>
                        <Btn variant="danger" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3" /></Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <ProductEditor
          product={editing}
          categories={cats ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(); }}
        />
      )}
    </div>
  );
}

function ProductEditor({ product, categories, onClose, onSaved }: {
  product: Partial<Product>;
  categories: { id: string; name: string }[];
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Product>>(product);
  const [saving, setSaving] = useState(false);
  const isNew = !product.id;

  async function save() {
    if (!form.title || !form.slug) return toast.error("Title and slug required");
    setSaving(true);
    const payload: any = {
      title: form.title,
      slug: form.slug,
      description: form.description ?? "",
      price: Number(form.price) || 0,
      old_price: form.old_price ? Number(form.old_price) : null,
      stock: Number(form.stock) || 0,
      image: form.image ?? "",
      category_id: form.category_id || null,
      is_active: form.is_active ?? true,
      is_featured: form.is_featured ?? false,
      is_new_arrival: form.is_new_arrival ?? false,
    };
    const res = isNew
      ? await supabase.from("products").insert(payload)
      : await supabase.from("products").update(payload).eq("id", product.id!);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved"); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={isNew ? "New product" : "Edit product"} width="max-w-2xl">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" full><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} /></Field>
        <Field label="Slug"><Input value={form.slug ?? ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
        <Field label="Category">
          <Select value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}>
            <option value="">— none —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Price"><Input type="number" value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
        <Field label="Old price"><Input type="number" value={form.old_price ?? ""} onChange={(e) => setForm({ ...form, old_price: e.target.value ? Number(e.target.value) : null })} /></Field>
        <Field label="Stock"><Input type="number" value={form.stock ?? 0} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></Field>
        <Field label="Image URL"><Input value={form.image ?? ""} onChange={(e) => setForm({ ...form, image: e.target.value })} /></Field>
        <Field label="Description" full><Textarea rows={4} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="flex flex-wrap gap-4 sm:col-span-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Featured</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.is_new_arrival} onChange={(e) => setForm({ ...form, is_new_arrival: e.target.checked })} /> New arrival</label>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
      </div>
    </Modal>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>
      {children}
    </div>
  );
}
