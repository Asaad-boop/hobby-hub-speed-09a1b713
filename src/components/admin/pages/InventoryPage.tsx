import { useState } from "react";
import { Plus, Pencil, Sliders } from "lucide-react";
import { useOpsStore } from "@/lib/ops-store";
import { formatBDT, stockStatus, type Product, type ProductCategory } from "@/lib/mock-data";
import { Btn, Input, Modal, PageHeader, Select, Textarea } from "@/components/admin/ui";

const CATEGORIES: ProductCategory[] = ["Jewelry", "Gift", "Perfume", "Lamp", "Selfcare"];

export default function InventoryPage() {
  const products = useOpsStore((s) => s.products);
  const addProduct = useOpsStore((s) => s.addProduct);
  const updateProduct = useOpsStore((s) => s.updateProduct);
  const adjustStock = useOpsStore((s) => s.adjustStock);

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adjust, setAdjust] = useState<Product | null>(null);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Inventory" subtitle={`${products.length} SKUs`} actions={
        <Btn variant="primary" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" />Add Product</Btn>
      } />
      <div className="flex-1 overflow-auto bg-gray-50 px-6 py-5">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left">SKU</th>
                <th className="px-4 py-2.5 text-left">Product</th>
                <th className="px-4 py-2.5 text-left">Category</th>
                <th className="px-4 py-2.5 text-right">Stock</th>
                <th className="px-4 py-2.5 text-left">Stock Bar</th>
                <th className="px-4 py-2.5 text-right">Price</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => {
                const st = stockStatus(p.stock, p.initialStock);
                return (
                  <tr key={p.sku} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{p.stock}</td>
                    <td className="px-4 py-2.5">
                      <div className="h-2 w-32 rounded-full bg-gray-100">
                        <div className={`h-full rounded-full ${st.barColor}`} style={{ width: `${st.pct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">{formatBDT(p.price)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${st.tone}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <Btn size="sm" onClick={() => setEditing(p)}><Pencil className="h-3.5 w-3.5" />Edit</Btn>
                        <Btn size="sm" onClick={() => setAdjust(p)}><Sliders className="h-3.5 w-3.5" />Adjust Stock</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <ProductModal title="Add Product" onClose={() => setShowAdd(false)} onSave={(p) => { addProduct(p); setShowAdd(false); }} />}
      {editing && <ProductModal title="Edit Product" initial={editing} onClose={() => setEditing(null)} onSave={(p) => { updateProduct(editing.sku, p); setEditing(null); }} />}
      {adjust && <AdjustStockModal product={adjust} onClose={() => setAdjust(null)} onAdjust={(d) => { adjustStock(adjust.sku, d); setAdjust(null); }} />}
    </div>
  );
}

function ProductModal({ title, initial, onClose, onSave }: { title: string; initial?: Product; onClose: () => void; onSave: (p: Product) => void }) {
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<ProductCategory>(initial?.category ?? "Jewelry");
  const [stock, setStock] = useState<number>(initial?.stock ?? 0);
  const [price, setPrice] = useState<number>(initial?.price ?? 0);
  const [description, setDescription] = useState(initial?.description ?? "");

  const submit = () => onSave({
    sku, name, category, stock, price, description,
    initialStock: initial?.initialStock ?? Math.max(stock, 1),
  });

  return (
    <Modal open onClose={onClose} title={title}
      footer={<div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit} disabled={!sku || !name}>Save</Btn></div>}>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">SKU</span><Input value={sku} onChange={(e) => setSku(e.target.value)} disabled={!!initial} /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">Name</span><Input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">Category</span>
          <Select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{initial ? "Stock" : "Initial Stock"}</span><Input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value) || 0)} /></label>
        <label className="block col-span-2"><span className="mb-1 block text-xs font-medium text-muted-foreground">Price (৳)</span><Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} /></label>
        <label className="block col-span-2"><span className="mb-1 block text-xs font-medium text-muted-foreground">Description</span><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      </div>
    </Modal>
  );
}

function AdjustStockModal({ product, onClose, onAdjust }: { product: Product; onClose: () => void; onAdjust: (delta: number) => void }) {
  const [delta, setDelta] = useState(0);
  return (
    <Modal open onClose={onClose} title={`Adjust Stock · ${product.name}`}
      footer={<div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={() => onAdjust(delta)}>Apply</Btn></div>}>
      <div className="space-y-3">
        <div className="text-sm">Current stock: <span className="font-semibold">{product.stock}</span></div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Adjustment (+ / −)</span>
          <Input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value) || 0)} />
        </label>
        <div className="text-sm text-muted-foreground">New stock: <span className="font-semibold text-foreground">{Math.max(0, product.stock + delta)}</span></div>
      </div>
    </Modal>
  );
}
