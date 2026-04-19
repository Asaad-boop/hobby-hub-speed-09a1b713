import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Search,
  Download,
  AlertTriangle,
  Package,
  History,
  Plus,
  Minus,
  Save,
  RotateCcw,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/admin/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Admin" }] }),
  component: InventoryPage,
});

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  image: string;
  stock: number;
  price: number;
  is_active: boolean;
  category_id: string | null;
};

type CategoryRow = { id: string; name: string };

type Movement = {
  id: string;
  product_id: string;
  delta: number;
  stock_before: number;
  stock_after: number;
  reason: string;
  note: string | null;
  created_at: string;
};

const LOW_STOCK_THRESHOLD = 5;

function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out" | "active">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<ProductRow | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("restock");
  const [adjustNote, setAdjustNote] = useState<string>("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin_inventory_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,title,slug,image,stock,price,is_active,category_id")
        .order("stock", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
    staleTime: 30_000,
  });

  const { data: categories } = useQuery({
    queryKey: ["admin_inventory_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
    staleTime: 5 * 60_000,
  });

  const { data: movements } = useQuery({
    queryKey: ["admin_stock_movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id,product_id,delta,stock_before,stock_after,reason,note,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Movement[];
    },
    staleTime: 30_000,
  });

  const productMap = useMemo(() => {
    const m = new Map<string, ProductRow>();
    (products ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products ?? []).filter((p) => {
      if (q && !p.title.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;
      if (filter === "low" && p.stock > LOW_STOCK_THRESHOLD) return false;
      if (filter === "out" && p.stock !== 0) return false;
      if (filter === "active" && !p.is_active) return false;
      return true;
    });
  }, [products, search, categoryFilter, filter]);

  const stats = useMemo(() => {
    const list = products ?? [];
    return {
      total: list.length,
      low: list.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length,
      out: list.filter((p) => p.stock === 0).length,
      units: list.reduce((sum, p) => sum + p.stock, 0),
      value: list.reduce((sum, p) => sum + p.stock * Number(p.price), 0),
    };
  }, [products]);

  const dirtyCount = Object.keys(drafts).length;

  const setDraft = (id: string, value: number) => {
    setDrafts((d) => ({ ...d, [id]: Math.max(0, Math.floor(value)) }));
  };

  const clearDrafts = () => setDrafts({});

  const saveBulk = useMutation({
    mutationFn: async () => {
      const auth = await supabase.auth.getUser();
      const uid = auth.data.user?.id;
      if (!uid) throw new Error("Not signed in");

      const entries = Object.entries(drafts);
      const movementsToLog: {
        product_id: string;
        user_id: string;
        delta: number;
        stock_before: number;
        stock_after: number;
        reason: string;
        note: string | null;
      }[] = [];

      for (const [id, newStock] of entries) {
        const product = productMap.get(id);
        if (!product) continue;
        if (product.stock === newStock) continue;
        const { error } = await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", id);
        if (error) throw error;
        movementsToLog.push({
          product_id: id,
          user_id: uid,
          delta: newStock - product.stock,
          stock_before: product.stock,
          stock_after: newStock,
          reason: "bulk_edit",
          note: null,
        });
      }
      if (movementsToLog.length > 0) {
        const { error: logErr } = await supabase
          .from("stock_movements")
          .insert(movementsToLog);
        if (logErr) throw logErr;
      }
      return movementsToLog.length;
    },
    onSuccess: (count) => {
      toast.success(`Updated ${count} product${count === 1 ? "" : "s"}`);
      clearDrafts();
      qc.invalidateQueries({ queryKey: ["admin_inventory_products"] });
      qc.invalidateQueries({ queryKey: ["admin_stock_movements"] });
      qc.invalidateQueries({ queryKey: ["admin_dashboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const adjust = useMutation({
    mutationFn: async () => {
      if (!adjustProduct) throw new Error("No product");
      const delta = Number(adjustDelta);
      if (!Number.isFinite(delta) || delta === 0) throw new Error("Enter a non-zero amount");
      const newStock = Math.max(0, adjustProduct.stock + delta);
      const auth = await supabase.auth.getUser();
      const uid = auth.data.user?.id;
      if (!uid) throw new Error("Not signed in");

      const { error: upErr } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", adjustProduct.id);
      if (upErr) throw upErr;

      const { error: logErr } = await supabase.from("stock_movements").insert({
        product_id: adjustProduct.id,
        user_id: uid,
        delta: newStock - adjustProduct.stock,
        stock_before: adjustProduct.stock,
        stock_after: newStock,
        reason: adjustReason,
        note: adjustNote.trim() || null,
      });
      if (logErr) throw logErr;
    },
    onSuccess: () => {
      toast.success("Stock adjusted");
      setAdjustOpen(false);
      setAdjustDelta("");
      setAdjustNote("");
      setAdjustReason("restock");
      qc.invalidateQueries({ queryKey: ["admin_inventory_products"] });
      qc.invalidateQueries({ queryKey: ["admin_stock_movements"] });
      qc.invalidateQueries({ queryKey: ["admin_dashboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openAdjust = (p: ProductRow) => {
    setAdjustProduct(p);
    setAdjustDelta("");
    setAdjustNote("");
    setAdjustReason("restock");
    setAdjustOpen(true);
  };

  const exportCsv = () => {
    const header = ["id", "title", "slug", "stock", "price", "stock_value", "is_active"];
    const rows = (products ?? []).map((p) => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      p.slug,
      p.stock,
      Number(p.price).toFixed(2),
      (p.stock * Number(p.price)).toFixed(2),
      p.is_active ? "yes" : "no",
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Boxes className="h-6 w-6 text-primary" /> Inventory
          </h1>
          <p className="text-sm text-muted-foreground">Manage stock levels, log restocks, and export inventory.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirtyCount > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={clearDrafts}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> Discard ({dirtyCount})
              </Button>
              <Button size="sm" onClick={() => saveBulk.mutate()} disabled={saveBulk.isPending}>
                {saveBulk.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save {dirtyCount} change{dirtyCount === 1 ? "" : "s"}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Products" value={stats.total.toLocaleString()} />
        <KpiCard label="Total units" value={stats.units.toLocaleString()} />
        <KpiCard label="Stock value" value={`৳${Math.round(stats.value).toLocaleString()}`} />
        <KpiCard label="Low stock" value={stats.low.toLocaleString()} accent={stats.low > 0 ? "warn" : undefined} />
        <KpiCard label="Out of stock" value={stats.out.toLocaleString()} accent={stats.out > 0 ? "danger" : undefined} />
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">
            <Package className="mr-1.5 h-4 w-4" /> Stock
          </TabsTrigger>
          <TabsTrigger value="log">
            <History className="mr-1.5 h-4 w-4" /> Restock log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-3">
          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                <SelectItem value="low">Low stock (≤{LOW_STOCK_THRESHOLD})</SelectItem>
                <SelectItem value="out">Out of stock</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">No products match.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[120px] text-right">Price</TableHead>
                    <TableHead className="w-[180px]">New stock</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const draft = drafts[p.id];
                    const value = draft ?? p.stock;
                    const dirty = draft !== undefined && draft !== p.stock;
                    const status =
                      p.stock === 0
                        ? { label: "Out", variant: "destructive" as const }
                        : p.stock <= LOW_STOCK_THRESHOLD
                          ? { label: "Low", variant: "secondary" as const, className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" }
                          : { label: "OK", variant: "outline" as const };
                    return (
                      <TableRow key={p.id} className={dirty ? "bg-primary/5" : undefined}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                              {p.image ? (
                                <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{p.title}</div>
                              <div className="truncate text-xs text-muted-foreground">{p.slug}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className={"className" in status ? status.className : undefined}>
                            {status.label}
                          </Badge>
                          {!p.is_active && (
                            <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Inactive</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">৳{Number(p.price).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => setDraft(p.id, value - 1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <Input
                              type="number"
                              min={0}
                              value={value}
                              onChange={(e) => setDraft(p.id, Number(e.target.value))}
                              className="h-8 w-20 text-center tabular-nums"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => setDraft(p.id, value + 1)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                            {dirty && (
                              <span className="ml-1 text-[10px] font-semibold text-primary">
                                {value > p.stock ? "+" : ""}
                                {value - p.stock}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => openAdjust(p)}>
                            Adjust + log
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="log">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {!movements ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : movements.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No stock movements yet. Adjust stock or use bulk save to start logging.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Delta</TableHead>
                    <TableHead className="text-right">Before → After</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => {
                    const product = productMap.get(m.product_id);
                    const positive = m.delta > 0;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(m.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {product?.title ?? <span className="text-muted-foreground">Deleted product</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {m.reason.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums font-semibold ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                        >
                          {positive ? "+" : ""}
                          {m.delta}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {m.stock_before} → <span className="text-foreground">{m.stock_after}</span>
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                          {m.note ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>{adjustProduct?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted px-3 py-2 text-sm">
              Current stock: <span className="font-semibold">{adjustProduct?.stock ?? 0}</span>
            </div>
            <div>
              <Label>Change amount (use negative to reduce)</Label>
              <Input
                type="number"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                placeholder="e.g. 10 or -2"
                autoFocus
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={adjustReason} onValueChange={setAdjustReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restock">Restock</SelectItem>
                  <SelectItem value="correction">Correction</SelectItem>
                  <SelectItem value="damage">Damage / loss</SelectItem>
                  <SelectItem value="return">Customer return</SelectItem>
                  <SelectItem value="manual">Manual adjust</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Textarea
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                rows={2}
                placeholder="Supplier name, invoice ref, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => adjust.mutate()} disabled={adjust.isPending}>
              {adjust.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Save & log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "warn" | "danger";
}) {
  const accentClass =
    accent === "danger"
      ? "text-rose-600 dark:text-rose-400"
      : accent === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "";
  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          {accent ? <AlertTriangle className="h-3 w-3" /> : null}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-xl font-bold tabular-nums ${accentClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
