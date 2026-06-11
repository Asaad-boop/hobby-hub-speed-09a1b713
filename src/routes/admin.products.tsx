import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil, Upload, X, ArrowLeft, ArrowRight, Loader2, ImageIcon, Tag, DollarSign, Eye, FileText, Star, Sparkles, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PageHeader, Card, Loading, Empty, Badge, Btn, Input, Textarea, Select,
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
  const [form, setForm] = useState<Partial<Product>>({ ...product, gallery: product.gallery ?? [] });
  const [saving, setSaving] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const mainRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const isNew = !product.id;

  async function uploadFiles(files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}: not an image`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: must be under 5MB`);
        continue;
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) {
        toast.error(`${file.name}: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handleMainUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingMain(true);
    const urls = await uploadFiles([files[0]]);
    if (urls[0]) setForm((f) => ({ ...f, image: urls[0] }));
    setUploadingMain(false);
  }

  async function handleGalleryUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    const urls = await uploadFiles(Array.from(files));
    if (urls.length > 0) setForm((f) => ({ ...f, gallery: [...(f.gallery ?? []), ...urls] }));
    setUploadingGallery(false);
  }

  function removeGallery(i: number) {
    setForm((f) => ({ ...f, gallery: (f.gallery ?? []).filter((_, j) => j !== i) }));
  }

  function moveGallery(i: number, dir: -1 | 1) {
    setForm((f) => {
      const arr = [...(f.gallery ?? [])];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...f, gallery: arr };
    });
  }

  function setAsMain(i: number) {
    setForm((f) => {
      const arr = [...(f.gallery ?? [])];
      const oldMain = f.image;
      const newMain = arr[i];
      arr.splice(i, 1);
      if (oldMain) arr.unshift(oldMain);
      return { ...f, image: newMain, gallery: arr };
    });
  }

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
      gallery: form.gallery ?? [],
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

  const gallery = form.gallery ?? [];
  const [tab, setTab] = useState<"basic" | "media" | "pricing" | "visibility">("basic");
  const tabs = [
    { key: "basic" as const, label: "Basic info", icon: FileText },
    { key: "media" as const, label: "Media", icon: ImageIcon, count: (form.image ? 1 : 0) + gallery.length },
    { key: "pricing" as const, label: "Pricing & Stock", icon: DollarSign },
    { key: "visibility" as const, label: "Visibility", icon: Eye },
  ];

  const discount = form.old_price && form.price && form.old_price > form.price
    ? Math.round(((form.old_price - form.price) / form.old_price) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-5xl flex-col bg-gray-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{isNew ? "New product" : "Edit product"}</h3>
              {!isNew && form.title && (
                <p className="text-[11px] text-gray-500">{form.title}</p>
              )}
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Badge tone={form.is_active ? "green" : "gray"}>{form.is_active ? "Active" : "Hidden"}</Badge>
            {form.is_featured && <Badge tone="purple">Featured</Badge>}
            {form.is_new_arrival && <Badge tone="blue">New</Badge>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 bg-white px-5 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap " +
                  (active
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-800")
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {"count" in t && t.count !== undefined && t.count > 0 && (
                  <span className={"ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold " + (active ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-700")}>{t.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mx-auto max-w-3xl space-y-5">
            {tab === "basic" && (
              <Section title="Product details" icon={FileText} description="Title, URL slug, category, and description">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Title" required full>
                    <Input
                      value={form.title ?? ""}
                      placeholder="e.g. Aurora Lamp"
                      onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })}
                    />
                  </Field>
                  <Field label="URL slug" required hint="Used in the product URL">
                    <Input value={form.slug ?? ""} placeholder="aurora-lamp" onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                  </Field>
                  <Field label="Category">
                    <Select value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}>
                      <option value="">— none —</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Description" full hint={`${(form.description ?? "").length} characters`}>
                    <Textarea rows={6} value={form.description ?? ""} placeholder="Describe the product, its benefits and key features…" onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </Field>
                </div>
              </Section>
            )}

            {tab === "media" && (
              <>
                <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-900">
                  <strong>Recommended:</strong> Paste an external image URL (Cloudinary, Cloudflare R2, ImgBB, imgur, etc.) instead of uploading to Supabase. This avoids Supabase Storage egress limits. Uploaded images are still cached on a free image CDN, but external hosts are preferred for new products.
                </div>
                <Section title="Main image" icon={ImageIcon} description="The primary image shown on listings and the product page">
                  <div className="flex flex-col items-start gap-4 sm:flex-row">
                    <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                      {form.image ? (
                        <img src={form.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center text-gray-400">
                          <ImageIcon className="h-7 w-7" />
                          <span className="mt-1 text-[10px]">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input placeholder="https://… or upload from computer" value={form.image ?? ""} onChange={(e) => setForm({ ...form, image: e.target.value })} />
                      <div className="flex flex-wrap gap-2">
                        <Btn variant="primary" onClick={() => mainRef.current?.click()} disabled={uploadingMain}>
                          {uploadingMain ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          {uploadingMain ? "Uploading…" : "Upload image"}
                        </Btn>
                        {form.image && <Btn variant="danger" onClick={() => setForm({ ...form, image: "" })}><X className="h-3 w-3" /> Clear</Btn>}
                      </div>
                      <p className="text-[11px] text-gray-500">JPG, PNG or WEBP. Max 5MB. Square images work best.</p>
                      <input ref={mainRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handleMainUpload(e.target.files); e.target.value = ""; }} />
                    </div>
                  </div>
                </Section>

                <Section
                  title={`Gallery (${gallery.length})`}
                  icon={ImageIcon}
                  description="Additional images shown on the product page"
                  action={
                    <Btn variant="primary" onClick={() => galleryRef.current?.click()} disabled={uploadingGallery}>
                      {uploadingGallery ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      {uploadingGallery ? "Uploading…" : "Add images"}
                    </Btn>
                  }
                >
                  {gallery.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                      {gallery.map((src, i) => (
                        <div key={`${src}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          <img src={src} alt="" className="h-full w-full object-cover" />
                          <span className="absolute left-1.5 top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/60 px-1 text-[10px] font-bold text-white">{i + 1}</span>
                          <div className="absolute inset-0 flex flex-col justify-between bg-black/0 p-1.5 opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
                            <div className="flex justify-end">
                              <button type="button" onClick={() => removeGallery(i)} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow" title="Remove">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <button type="button" onClick={() => moveGallery(i, -1)} disabled={i === 0} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-gray-800 shadow disabled:opacity-40" title="Move left">
                                <ArrowLeft className="h-3 w-3" />
                              </button>
                              <button type="button" onClick={() => setAsMain(i)} className="rounded-full bg-white/95 px-1.5 py-0.5 text-[9px] font-bold text-gray-800 shadow" title="Set as main">
                                ★ Main
                              </button>
                              <button type="button" onClick={() => moveGallery(i, 1)} disabled={i === gallery.length - 1} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-gray-800 shadow disabled:opacity-40" title="Move right">
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => galleryRef.current?.click()}
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 transition hover:border-gray-900 hover:text-gray-900"
                      >
                        <Plus className="h-5 w-5" />
                        <span className="text-[10px] font-medium">Add</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => galleryRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-10 text-gray-500 transition hover:border-gray-900 hover:text-gray-900"
                    >
                      <Upload className="h-6 w-6" />
                      <span className="text-sm font-medium">Click to upload gallery images</span>
                      <span className="text-[11px]">JPG, PNG or WEBP · max 5MB each</span>
                    </button>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="Or paste image URL and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const v = (e.target as HTMLInputElement).value.trim();
                          if (v) {
                            setForm((f) => ({ ...f, gallery: [...(f.gallery ?? []), v] }));
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                      className="flex-1 min-w-[220px]"
                    />
                  </div>
                  <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleGalleryUpload(e.target.files); e.target.value = ""; }} />
                </Section>
              </>
            )}

            {tab === "pricing" && (
              <Section title="Pricing & Stock" icon={DollarSign} description="Set selling price, optional compare-at price, and stock count">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Selling price (৳)" required>
                    <Input type="number" min={0} value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                  </Field>
                  <Field label="Compare-at price (৳)" hint="Shown crossed-out">
                    <Input type="number" min={0} value={form.old_price ?? ""} placeholder="—" onChange={(e) => setForm({ ...form, old_price: e.target.value ? Number(e.target.value) : null })} />
                  </Field>
                  <Field label="Stock quantity" required>
                    <Input type="number" min={0} value={form.stock ?? 0} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
                  </Field>
                </div>
                {discount > 0 && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                    <Tag className="h-3.5 w-3.5" /> Customers will see a {discount}% discount
                  </div>
                )}
              </Section>
            )}

            {tab === "visibility" && (
              <Section title="Visibility & Highlights" icon={Eye} description="Control where this product appears">
                <div className="space-y-2">
                  <Toggle
                    icon={Package}
                    label="Active"
                    description="Show this product on the storefront and allow purchases"
                    checked={!!form.is_active}
                    onChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  <Toggle
                    icon={Star}
                    label="Featured"
                    description="Highlight in featured collections on the homepage"
                    checked={!!form.is_featured}
                    onChange={(v) => setForm({ ...form, is_featured: v })}
                  />
                  <Toggle
                    icon={Sparkles}
                    label="New arrival"
                    description="Show a 'New' badge and include in new arrivals row"
                    checked={!!form.is_new_arrival}
                    onChange={(v) => setForm({ ...form, is_new_arrival: v })}
                  />
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-5 py-3">
          <div className="text-[11px] text-gray-500">
            {form.title ? <>Saving as <span className="font-semibold text-gray-700">{form.title}</span></> : "Fill in title and slug to save"}
          </div>
          <div className="flex gap-2">
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" size="md" onClick={save} disabled={saving || !form.title || !form.slug}>
              {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : isNew ? "Create product" : "Save changes"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, description, action, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-gray-700">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
            {description && <p className="mt-0.5 text-[11px] text-gray-500">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Toggle({ icon: Icon, label, description, checked, onChange }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition hover:bg-gray-50">
      <div className={"mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md " + (checked ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500")}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-[11px] text-gray-500">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition " + (checked ? "bg-gray-900" : "bg-gray-300")}
      >
        <span className="inline-block h-4 w-4 rounded-full bg-white shadow transition" style={{ transform: `translateX(${checked ? 18 : 2}px)` }} />
      </button>
    </label>
  );
}

function Field({ label, children, full, required, hint }: { label: string; children: React.ReactNode; full?: boolean; required?: boolean; hint?: string }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
