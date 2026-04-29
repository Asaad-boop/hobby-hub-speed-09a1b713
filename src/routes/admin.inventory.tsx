import { createFileRoute } from "@tanstack/react-router";
import { AdminErrorPanel } from "@/components/admin/AdminErrorPanel";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Minus, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import { listProducts, adjustStock } from "@/server/oms.functions";
import { Btn, Card, Loading, MetricCard, PageHeader, Empty } from "@/components/admin/ui";
import { fmtBDT } from "@/lib/oms";

export const Route = createFileRoute("/admin/inventory")({
  component: InventoryPage,
  errorComponent: AdminErrorPanel,
});

function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  const productsQ = useQuery({
    queryKey: ["oms", "products"],
    queryFn: () => listProducts(),
  });

  const adjustMut = useMutation({
    mutationFn: (input: { productId: string; delta: number; reason: string }) =>
      adjustStock({ data: input }),
    onSuccess: () => {
      toast.success("Stock updated");
      qc.invalidateQueries({ queryKey: ["oms", "products"] });
      qc.invalidateQueries({ queryKey: ["oms", "dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const products = useMemo(() => {
    let list = productsQ.data ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q));
    }
    if (filter === "low") list = list.filter((p) => p.stock > 0 && p.stock <= 5);
    if (filter === "out") list = list.filter((p) => p.stock === 0);
    return list;
  }, [productsQ.data, search, filter]);

  const stats = useMemo(() => {
    const list = productsQ.data ?? [];
    return {
      total: list.length,
      out: list.filter((p) => p.stock === 0).length,
      low: list.filter((p) => p.stock > 0 && p.stock <= 5).length,
      value: list.reduce((s, p) => s + Number(p.price) * p.stock, 0),
    };
  }, [productsQ.data]);

  const handleAdjust = (id: string, delta: number) => {
    const reason = delta > 0 ? "restock" : "manual_adjustment";
    adjustMut.mutate({ productId: id, delta, reason });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Inventory" subtitle={`${stats.total} products tracked`} />
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            label="Total Products"
            value={stats.total}
            icon={<Package className="h-4 w-4" />}
          />
          <MetricCard
            label="Out of Stock"
            value={stats.out}
            hint="Need restock"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <MetricCard label="Low Stock" value={stats.low} hint="≤ 5 units" />
          <MetricCard
            label="Stock Value"
            value={fmtBDT(stats.value)}
            accent
            hint="At sell price"
          />
        </div>

        <Card className="mt-6">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="h-8 w-full rounded-md border border-border bg-white pl-8 pr-3 text-sm outline-none focus:border-[#1D9E75]"
              />
            </div>
            {(["all", "low", "out"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-[#1D9E75] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {f === "all" ? "All" : f === "low" ? "Low Stock" : "Out of Stock"}
              </button>
            ))}
          </div>

          {productsQ.isLoading ? (
            <Loading />
          ) : products.length === 0 ? (
            <Empty label="No products found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Product</th>
                    <th className="px-3 py-2.5 text-right">Price</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="px-3 py-2.5 text-center">Stock</th>
                    <th className="px-3 py-2.5 text-right">Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => {
                    const stockColor =
                      p.stock === 0
                        ? "bg-rose-100 text-rose-700"
                        : p.stock <= 5
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700";
                    return (
                      <tr key={p.id} className="hover:bg-muted/40">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {p.image && (
                              <img
                                src={p.image}
                                alt={p.title}
                                className="h-9 w-9 shrink-0 rounded-md object-cover"
                              />
                            )}
                            <span className="font-medium">{p.title}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {fmtBDT(Number(p.price))}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              p.is_active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-zinc-200 text-zinc-700"
                            }`}
                          >
                            {p.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${stockColor}`}
                          >
                            {p.stock}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Btn
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAdjust(p.id, -1)}
                              disabled={p.stock === 0 || adjustMut.isPending}
                            >
                              <Minus className="h-3 w-3" />
                            </Btn>
                            <Btn
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAdjust(p.id, 1)}
                              disabled={adjustMut.isPending}
                            >
                              <Plus className="h-3 w-3" />
                            </Btn>
                            <Btn
                              variant="primary"
                              size="sm"
                              onClick={() => handleAdjust(p.id, 10)}
                              disabled={adjustMut.isPending}
                            >
                              +10
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
