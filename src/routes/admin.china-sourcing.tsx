import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Package, Ship, RefreshCw, Boxes } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_LABEL,
  STATUS_TONE,
  addShipmentItem,
  bdt,
  createChinaShipment,
  deleteChinaShipment,
  deleteShipmentItem,
  getChinaShipment,
  listChinaShipments,
  updateChinaShipment,
  type ChinaShipmentStatus,
} from "@/lib/china-shipments";

export const Route = createFileRoute("/admin/china-sourcing")({
  head: () => ({
    meta: [
      { title: "China Sourcing — HobbyShop ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ChinaSourcingPage,
});

function ChinaSourcingPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const shipmentsQ = useQuery({
    queryKey: ["china_shipments"],
    queryFn: listChinaShipments,
  });

  const stats = useMemo(() => {
    const list = shipmentsQ.data ?? [];
    const inTransit = list.filter((s) =>
      ["ordered", "in_transit", "customs"].includes(s.status),
    );
    const totalLanded = list.reduce((a, s) => a + Number(s.total_landed_cost || 0), 0);
    const totalUnits = list.reduce((a, s) => a + Number(s.total_quantity || 0), 0);
    return {
      shipments: list.length,
      inTransit: inTransit.length,
      totalLanded,
      totalUnits,
    };
  }, [shipmentsQ.data]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["china_shipments"] });
    if (activeId) qc.invalidateQueries({ queryKey: ["china_shipment", activeId] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">China Sourcing</h1>
          <p className="text-sm text-muted-foreground">
            Track CNY → BDT landed cost (shipping, customs, transport) for every batch.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New shipment
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Package className="h-4 w-4" />}
          label="Shipments"
          value={stats.shipments.toString()}
        />
        <StatCard
          icon={<Ship className="h-4 w-4" />}
          label="In transit"
          value={stats.inTransit.toString()}
          accent="from-amber-500/10 to-amber-500/0"
        />
        <StatCard
          icon={<Boxes className="h-4 w-4" />}
          label="Units sourced"
          value={stats.totalUnits.toLocaleString()}
          accent="from-blue-500/10 to-blue-500/0"
        />
        <StatCard
          icon={<Package className="h-4 w-4" />}
          label="Total landed"
          value={bdt(stats.totalLanded)}
          accent="from-emerald-500/10 to-emerald-500/0"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shipments</CardTitle>
          <CardDescription>Click a row to open and add items.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order date</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead className="text-right">CNY</TableHead>
                  <TableHead className="text-right">Landed (BDT)</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Per unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipmentsQ.isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!shipmentsQ.isLoading && (shipmentsQ.data?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                      No shipments yet. Create your first batch to start tracking landed cost.
                    </TableCell>
                  </TableRow>
                )}
                {shipmentsQ.data?.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => setActiveId(s.id)}
                  >
                    <TableCell className="font-mono text-xs">{s.reference_no}</TableCell>
                    <TableCell>{s.supplier_name ?? "—"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[s.status]}`}
                      >
                        {STATUS_LABEL[s.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{s.order_date ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.arrival_date ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      ¥{Number(s.cny_amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {bdt(Number(s.total_landed_cost))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.total_quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {bdt(Number(s.per_unit_landed_cost))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateShipmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["china_shipments"] });
        }}
      />

      <ShipmentDetailDrawer
        shipmentId={activeId}
        onClose={() => setActiveId(null)}
        onChanged={refresh}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = "from-primary/10 to-primary/0",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card className={`bg-gradient-to-br ${accent}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
          {icon}
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Create dialog
// ---------------------------------------------------------------------
function CreateShipmentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    reference_no: "",
    supplier_name: "",
    cny_amount: 0,
    exchange_rate: 14,
    international_shipping: 0,
    customs_duty: 0,
    local_transport: 0,
    other_costs: 0,
    order_date: new Date().toISOString().slice(0, 10),
    arrival_date: "",
    notes: "",
  });

  const m = useMutation({
    mutationFn: () =>
      createChinaShipment({
        reference_no: form.reference_no.trim(),
        supplier_name: form.supplier_name || null,
        cny_amount: Number(form.cny_amount) || 0,
        exchange_rate: Number(form.exchange_rate) || 0,
        international_shipping: Number(form.international_shipping) || 0,
        customs_duty: Number(form.customs_duty) || 0,
        local_transport: Number(form.local_transport) || 0,
        other_costs: Number(form.other_costs) || 0,
        order_date: form.order_date || null,
        arrival_date: form.arrival_date || null,
        notes: form.notes || null,
      }),
    onSuccess: () => {
      toast.success("Shipment created");
      onCreated();
      onOpenChange(false);
      setForm({
        reference_no: "",
        supplier_name: "",
        cny_amount: 0,
        exchange_rate: 14,
        international_shipping: 0,
        customs_duty: 0,
        local_transport: 0,
        other_costs: 0,
        order_date: new Date().toISOString().slice(0, 10),
        arrival_date: "",
        notes: "",
      });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create"),
  });

  const previewLanded =
    Number(form.cny_amount) * Number(form.exchange_rate) +
    Number(form.international_shipping) +
    Number(form.customs_duty) +
    Number(form.local_transport) +
    Number(form.other_costs);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New China shipment</DialogTitle>
          <DialogDescription>
            Costs are entered in BDT (except CNY amount + exchange rate). Items can be added after creating the shipment.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Reference no *">
            <Input
              value={form.reference_no}
              onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
              placeholder="e.g. CN-2026-001"
            />
          </Field>
          <Field label="Supplier">
            <Input
              value={form.supplier_name}
              onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
              placeholder="Supplier name"
            />
          </Field>
          <Field label="CNY amount (¥)">
            <Input
              type="number"
              value={form.cny_amount}
              onChange={(e) => setForm({ ...form, cny_amount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Exchange rate (1 CNY = ? BDT)">
            <Input
              type="number"
              step="0.01"
              value={form.exchange_rate}
              onChange={(e) => setForm({ ...form, exchange_rate: Number(e.target.value) })}
            />
          </Field>
          <Field label="International shipping (BDT)">
            <Input
              type="number"
              value={form.international_shipping}
              onChange={(e) =>
                setForm({ ...form, international_shipping: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Customs / duty (BDT)">
            <Input
              type="number"
              value={form.customs_duty}
              onChange={(e) => setForm({ ...form, customs_duty: Number(e.target.value) })}
            />
          </Field>
          <Field label="Local transport (BDT)">
            <Input
              type="number"
              value={form.local_transport}
              onChange={(e) =>
                setForm({ ...form, local_transport: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Other costs (BDT)">
            <Input
              type="number"
              value={form.other_costs}
              onChange={(e) => setForm({ ...form, other_costs: Number(e.target.value) })}
            />
          </Field>
          <Field label="Order date">
            <Input
              type="date"
              value={form.order_date}
              onChange={(e) => setForm({ ...form, order_date: e.target.value })}
            />
          </Field>
          <Field label="Expected arrival">
            <Input
              type="date"
              value={form.arrival_date}
              onChange={(e) => setForm({ ...form, arrival_date: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </Field>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total landed cost (preview)</span>
            <span className="text-lg font-bold tabular-nums">{bdt(previewLanded)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => m.mutate()}
            disabled={!form.reference_no.trim() || m.isPending}
          >
            {m.isPending ? "Creating…" : "Create shipment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------
// Detail drawer
// ---------------------------------------------------------------------
function ShipmentDetailDrawer({
  shipmentId,
  onClose,
  onChanged,
}: {
  shipmentId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const open = !!shipmentId;
  const detailQ = useQuery({
    queryKey: ["china_shipment", shipmentId],
    queryFn: () => getChinaShipment(shipmentId!),
    enabled: !!shipmentId,
  });

  const productsQ = useQuery({
    queryKey: ["china_sourcing_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title")
        .order("title")
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const [productId, setProductId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [cnyPrice, setCnyPrice] = useState<number>(0);

  const addItemM = useMutation({
    mutationFn: async () => {
      if (!shipmentId) return;
      const product = productsQ.data?.find((p) => p.id === productId);
      await addShipmentItem({
        shipment_id: shipmentId,
        product_id: productId || null,
        product_name_snapshot: product?.title ?? "Custom item",
        quantity: qty,
        cny_unit_price: cnyPrice,
      });
    },
    onSuccess: () => {
      setProductId("");
      setQty(1);
      setCnyPrice(0);
      onChanged();
      toast.success("Item added");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const removeItemM = useMutation({
    mutationFn: (id: string) => deleteShipmentItem(id),
    onSuccess: () => {
      onChanged();
      toast.success("Item removed");
    },
  });

  const statusM = useMutation({
    mutationFn: (status: ChinaShipmentStatus) =>
      updateChinaShipment(shipmentId!, { status }),
    onSuccess: () => {
      onChanged();
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const deleteM = useMutation({
    mutationFn: () => deleteChinaShipment(shipmentId!),
    onSuccess: () => {
      onChanged();
      onClose();
      toast.success("Shipment deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const header = detailQ.data?.header;
  const items = detailQ.data?.items ?? [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{header?.reference_no ?? "Loading…"}</SheetTitle>
          <SheetDescription>
            {header?.supplier_name ?? "—"} · {header && STATUS_LABEL[header.status]}
          </SheetDescription>
        </SheetHeader>

        {header && (
          <div className="mt-4 space-y-5">
            {/* Status + actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={header.status}
                onValueChange={(v) => statusM.mutate(v as ChinaShipmentStatus)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as ChinaShipmentStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm("Delete this shipment? This cannot be undone.")) {
                    deleteM.mutate();
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>

            {/* Cost summary */}
            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-3 text-sm sm:grid-cols-3">
              <Stat label="CNY" value={`¥${Number(header.cny_amount).toLocaleString()}`} />
              <Stat label="FX rate" value={Number(header.exchange_rate).toFixed(2)} />
              <Stat label="Product (BDT)" value={bdt(header.product_cost_bdt)} />
              <Stat label="Shipping" value={bdt(header.international_shipping)} />
              <Stat label="Customs" value={bdt(header.customs_duty)} />
              <Stat label="Local + Other" value={bdt(header.local_transport + header.other_costs)} />
              <Stat label="Total qty" value={header.total_quantity.toString()} />
              <Stat label="Per unit" value={bdt(header.per_unit_landed_cost)} />
              <Stat
                label="Total landed"
                value={bdt(header.total_landed_cost)}
                strong
              />
            </div>

            {/* Items */}
            <div>
              <h3 className="mb-2 text-sm font-semibold">Items</h3>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">CNY/unit</TableHead>
                      <TableHead className="text-right">Landed/unit</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">
                          No items yet
                        </TableCell>
                      </TableRow>
                    )}
                    {items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="text-sm">{it.product_name_snapshot}</TableCell>
                        <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          ¥{Number(it.cny_unit_price).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {bdt(Number(it.per_unit_landed_cost))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItemM.mutate(it.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Add item */}
            {header.status !== "received" && header.status !== "cancelled" && (
              <div className="rounded-lg border p-3">
                <h4 className="mb-2 text-sm font-semibold">Add item</h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <Select value={productId} onValueChange={setProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {productsQ.data?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    placeholder="Qty"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={cnyPrice}
                    onChange={(e) => setCnyPrice(Number(e.target.value))}
                    placeholder="¥/unit"
                  />
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => addItemM.mutate()}
                    disabled={!productId || qty < 1 || addItemM.isPending}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
              </div>
            )}

            {header.status === "received" && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-400">
                ✓ Stock and per-unit cost have been applied to linked products.
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`tabular-nums ${strong ? "text-base font-bold" : "text-sm font-medium"}`}>
        {value}
      </div>
    </div>
  );
}
