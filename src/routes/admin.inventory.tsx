import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Loading, Empty, Badge, Btn, Input, Modal, Textarea, Select } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/inventory")({
  component: InventoryPage,
});

type Product = { id: string; title: string; image: string; stock: number; is_active: boolean };

function InventoryPage() {
  const [search, setSearch] = useState("");
  const [adjust, setAdjust] = useState<Product | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,title,image,stock,is_active").order("stock");
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = (data ?? []).filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()));
  const lowStock = (data ?? []).filter((p) => p.stock <= 5 && p.is_active).length;

  return (
    <div>
      <PageHeader title="Inventory" description={`${data?.length ?? 0} products · ${lowStock} low stock`}
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-7 w-64" />
          </div>
        }
      />
      <Card>
        {isLoading ? <Loading /> : filtered.length === 0 ? <Empty title="No products" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Product</th>
                  <th className="px-4 py-2 text-left font-medium">Stock</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {p.image && <img src={p.image} alt="" className="h-9 w-9 rounded object-cover" />}
                        <div className="font-medium">{p.title}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={p.stock === 0 ? "red" : p.stock <= 5 ? "yellow" : "green"}>{p.stock}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Btn variant="primary" onClick={() => setAdjust(p)}>Adjust</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {adjust && <AdjustModal product={adjust} onClose={() => setAdjust(null)} onSaved={() => { setAdjust(null); refetch(); }} />}
    </div>
  );
}

function AdjustModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("restock");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!delta) return toast.error("Enter a non-zero amount");
    setSaving(true);
    const newStock = Math.max(0, product.stock + delta);
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (!userId) { setSaving(false); return toast.error("Not authenticated"); }

    const upd = await supabase.from("products").update({ stock: newStock }).eq("id", product.id);
    if (upd.error) { setSaving(false); return toast.error(upd.error.message); }

    await supabase.from("stock_movements").insert({
      product_id: product.id, user_id: userId,
      stock_before: product.stock, stock_after: newStock, delta,
      reason, note: note || null,
    } as any);

    setSaving(false); toast.success("Stock updated"); onSaved();
  }

  return (
    <Modal open onClose={onClose} title={`Adjust stock · ${product.title}`}>
      <div className="space-y-3">
        <div className="text-sm">Current stock: <strong>{product.stock}</strong></div>
        <div className="flex items-center gap-2">
          <Btn onClick={() => setDelta((d) => d - 1)}><Minus className="h-3 w-3" /></Btn>
          <Input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
          <Btn onClick={() => setDelta((d) => d + 1)}><Plus className="h-3 w-3" /></Btn>
        </div>
        <div className="text-xs text-gray-500">New stock will be: {Math.max(0, product.stock + delta)}</div>
        <div>
          <div className="mb-1 text-xs font-medium text-gray-600">Reason</div>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="restock">Restock</option>
            <option value="manual_adjust">Manual adjustment</option>
            <option value="damaged">Damaged</option>
            <option value="lost">Lost</option>
            <option value="returned">Returned</option>
          </Select>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-gray-600">Note</div>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
      </div>
    </Modal>
  );
}
