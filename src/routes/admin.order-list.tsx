import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Printer,
  FileText,
  Truck,
  Search,
  Loader2,
  CheckCircle2,
  ClipboardList,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { sendOrderToPathao, syncPathaoStatuses } from "@/lib/pathao.functions";
import { PageHeader, Card, Loading, Empty, Btn, Input } from "@/components/admin/ui";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generatePickingListPDF } from "@/lib/pdf/picking-list";
import { generatePackingListPDF } from "@/lib/pdf/packing-list";
import { InvoicePreviewDialog } from "@/components/admin/InvoicePreviewDialog";

export const Route = createFileRoute("/admin/order-list")({
  component: OrderListPage,
});

// Pipeline statuses (confirmed -> delivered/returned)
const PIPELINE_STATUSES = [
  { value: "confirmed", label: "Pending", tone: "amber" },
  { value: "ready_to_pack", label: "Ready to pack", tone: "blue" },
  { value: "packaging", label: "Packing", tone: "blue" },
  { value: "packed", label: "Packed", tone: "indigo" },
  { value: "ready_to_ship", label: "Ready to ship", tone: "violet" },
  { value: "shipped", label: "Shipped", tone: "purple" },
  { value: "in_transit", label: "In transit", tone: "purple" },
  { value: "delivered", label: "Delivered", tone: "emerald" },
  { value: "returned", label: "Returned", tone: "rose" },
] as const;

type StatusValue = (typeof PIPELINE_STATUSES)[number]["value"];
const ALL_PIPELINE_VALUES = PIPELINE_STATUSES.map((s) => s.value);

type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_city: string | null;
  shipping_district: string | null;
  total: number;
  payment_method: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  delivery_method: string | null;
  order_items: { id: string; name: string; quantity: number }[] | null;
};

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function fmtBDT(n: number | null | undefined) {
  return "৳" + Number(n ?? 0).toLocaleString("en-BD");
}

function fmtDate(s: string) {
  return new Date(s).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const def = PIPELINE_STATUSES.find((s) => s.value === status);
  const label = def?.label ?? status.replace(/_/g, " ");
  const toneMap: Record<string, string> = {
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
    violet: "bg-violet-100 text-violet-800 border-violet-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rose: "bg-rose-100 text-rose-800 border-rose-200",
  };
  const cls = toneMap[def?.tone ?? "blue"] ?? toneMap.blue;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function OrderListPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusValue | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);
  const sendToPathaoFn = useServerFn(sendOrderToPathao);
  const syncPathaoFn = useServerFn(syncPathaoStatuses);
  const [syncing, setSyncing] = useState(false);

  async function runSyncPathao() {
    setSyncing(true);
    const t = toast.loading("Syncing Pathao statuses…");
    try {
      const res = await syncPathaoFn({});
      toast.success(`Synced ${res.updated}/${res.checked} shipments`, { id: t });
      qc.invalidateQueries({ queryKey: ["order-list-confirmed"] });
    } catch (e) {
      toast.error("Sync failed: " + (e as Error).message, { id: t });
    } finally {
      setSyncing(false);
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["order-list-confirmed"],
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `id, created_at, status, shipping_name, shipping_phone, shipping_city, shipping_district,
           total, payment_method, courier_name, tracking_number, delivery_method,
           order_items(id, name, quantity)`,
        )
        .in("status", ALL_PIPELINE_VALUES)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as OrderRow[];
    },
    staleTime: 30 * 1000,
  });

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (filter !== "all") rows = rows.filter((r) => r.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          (r.shipping_name ?? "").toLowerCase().includes(q) ||
          (r.shipping_phone ?? "").toLowerCase().includes(q) ||
          (r.tracking_number ?? "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [data, filter, search]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: 0 };
    for (const s of ALL_PIPELINE_VALUES) map[s] = 0;
    for (const o of data ?? []) {
      map.all++;
      if (map[o.status] !== undefined) map[o.status]++;
    }
    return map;
  }, [data]);

  async function changeStatus(id: string, newStatus: StatusValue) {
    setBusyId(id);
    try {
      const patch: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === "shipped") patch.shipped_at = new Date().toISOString();
      if (newStatus === "delivered") patch.delivered_at = new Date().toISOString();
      const { error } = await supabase
        .from("orders")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["order-list-confirmed"] });
    } catch (e) {
      toast.error("Failed: " + (e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function sendToPathao(id: string) {
    setBusyId(id);
    const t = toast.loading("Sending to Pathao…");
    try {
      const res = await sendToPathaoFn({ data: { order_id: id } });
      toast.success(`Pathao booked: ${res.consignment_id}`, { id: t });
      qc.invalidateQueries({ queryKey: ["order-list-confirmed"] });
    } catch (e) {
      toast.error("Pathao failed: " + (e as Error).message, { id: t });
    } finally {
      setBusyId(null);
    }
  }

  async function sendBulkToPathao(ids: string[]) {
    if (!ids.length) return;
    const t = toast.loading(`Sending ${ids.length} order(s) to Pathao…`);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await sendToPathaoFn({ data: { order_id: id } });
        ok++;
      } catch {
        fail++;
      }
    }
    toast.success(`Pathao: ${ok} booked, ${fail} failed`, { id: t });
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["order-list-confirmed"] });
  }

  function openInvoice(id: string) {
    setInvoiceOrderId(id);
  }

  async function printPicking(ids: string[]) {
    if (!ids.length) {
      toast.error("Select at least one order");
      return;
    }
    try {
      await generatePickingListPDF(ids);
    } catch (e) {
      toast.error("Picking list failed: " + (e as Error).message);
    }
  }

  async function printPacking(id: string) {
    try {
      setBusyId(id);
      await generatePackingListPDF(id);
    } catch (e) {
      toast.error("Packing list failed: " + (e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function toggleSel(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  }

  async function hardDelete(ids: string[]) {
    if (!ids.length) return;
    const ok = window.confirm(
      `Hard delete ${ids.length} order(s)? This cannot be undone.`,
    );
    if (!ok) return;
    const t = toast.loading(`Deleting ${ids.length} order(s)…`);
    try {
      for (const id of ids) {
        const { error } = await supabase.rpc("hard_delete_order", { _order_id: id });
        if (error) throw error;
      }
      toast.success("Deleted", { id: t });
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["order-list-confirmed"] });
    } catch (e) {
      toast.error("Delete failed: " + (e as Error).message, { id: t });
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Order List"
        description="Confirmed orders — fulfillment pipeline & courier"
        actions={
          <>
            <Btn
              variant="default"
              onClick={() => printPicking([...selected])}
              disabled={selected.size === 0}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Picking list ({selected.size})
            </Btn>
            {selected.size > 0 && (
              <>
                <Btn
                  variant="default"
                  onClick={() => sendBulkToPathao([...selected])}
                >
                  <Truck className="h-3.5 w-3.5" />
                  Send to Pathao ({selected.size})
                </Btn>
                <Btn
                  variant="default"
                  onClick={() => hardDelete([...selected])}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete ({selected.size})
                </Btn>
              </>
            )}
          </>
        }
      />

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            filter === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:bg-accent"
          }`}
        >
          All ({counts.all ?? 0})
        </button>
        {PIPELINE_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setFilter(s.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === s.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-accent"
            }`}
          >
            {s.label} ({counts[s.value] ?? 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search id, name, phone, tracking…"
          className="pl-8"
        />
      </div>

      <Card>
        {isLoading ? (
          <Loading label="Loading orders…" />
        ) : filtered.length === 0 ? (
          <Empty title="No orders" description="No confirmed orders match your filter." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <input
                      type="checkbox"
                      checked={selected.size > 0 && selected.size === filtered.length}
                      onChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Courier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => {
                  const itemCount = (o.order_items ?? []).reduce(
                    (s, it) => s + (it.quantity || 0),
                    0,
                  );
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(o.id)}
                          onChange={() => toggleSel(o.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs font-semibold">{shortId(o.id)}</div>
                        <div className="text-[11px] text-muted-foreground">{fmtDate(o.created_at)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{o.shipping_name ?? "—"}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {o.shipping_phone ?? "—"} · {o.shipping_city ?? o.shipping_district ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <UIBadge variant="secondary">{itemCount} pcs</UIBadge>
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">{fmtBDT(o.total)}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {o.courier_name || o.delivery_method || "—"}
                        </div>
                        {o.tracking_number && (
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {o.tracking_number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={o.status}
                          onValueChange={(v) => changeStatus(o.id, v as StatusValue)}
                          disabled={busyId === o.id}
                        >
                          <SelectTrigger className="h-8 w-[150px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => sendToPathao(o.id)}
                            disabled={busyId === o.id || !!o.tracking_number}
                            title={
                              o.tracking_number
                                ? `Already booked: ${o.tracking_number}`
                                : "Send to Pathao courier"
                            }
                          >
                            <Truck className="h-3 w-3" />
                            {o.tracking_number ? "Booked" : "Pathao"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => openInvoice(o.id)}
                            disabled={busyId === o.id}
                          >
                            <FileText className="h-3 w-3" />
                            Invoice
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => printPacking(o.id)}
                            disabled={busyId === o.id}
                          >
                            <Package className="h-3 w-3" />
                            Packing
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => printPicking([o.id])}
                            disabled={busyId === o.id}
                          >
                            <Printer className="h-3 w-3" />
                            Picking
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                            onClick={() => hardDelete([o.id])}
                            disabled={busyId === o.id}
                            title="Hard delete order"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      <InvoicePreviewDialog
        orderId={invoiceOrderId}
        open={!!invoiceOrderId}
        onClose={() => setInvoiceOrderId(null)}
      />
    </div>
  );
}
