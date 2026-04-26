import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, Eye, Package, Truck, CheckCircle2, XCircle, Clock, RefreshCw, Sparkles, PackageCheck, MapPin, AlertTriangle, RotateCcw, Repeat, FileText, ClipboardList, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { generateInvoicePDF } from "@/lib/pdf/invoice";
import { generatePackingListPDF } from "@/lib/pdf/packing-list";
import { generatePickingListPDF } from "@/lib/pdf/picking-list";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { AdminTableSkeleton } from "@/components/admin/TableSkeleton";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrdersPage,
});

// Operations workspace covers everything from confirmed onwards.
// New, cancelled, and fake live in /admin/web-orders and /admin/cancelled-orders.
const STATUS_OPTIONS: OrderStatus[] = [
  "confirmed",
  "packaging",
  "packed",
  "ready_to_ship",
  "shipped",
  "in_transit",
  "delivered",
  "partial_delivered",
  "returned",
  "exchanged",
  "damaged",
];

const statusMeta: Record<OrderStatus, { label: string; className: string; icon: typeof Clock }> = {
  new: { label: "New", className: "bg-amber-500/10 text-amber-700 border-amber-500/30", icon: Sparkles },
  confirmed: { label: "Confirmed", className: "bg-sky-500/10 text-sky-700 border-sky-500/30", icon: CheckCircle2 },
  packaging: { label: "Packaging", className: "bg-blue-500/10 text-blue-700 border-blue-500/30", icon: Package },
  packed: { label: "Packed", className: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30", icon: PackageCheck },
  ready_to_ship: { label: "Ready to Ship", className: "bg-violet-500/10 text-violet-700 border-violet-500/30", icon: Truck },
  shipped: { label: "Shipped", className: "bg-purple-500/10 text-purple-700 border-purple-500/30", icon: Truck },
  in_transit: { label: "In Transit", className: "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/30", icon: MapPin },
  delivered: { label: "Delivered", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", icon: CheckCircle2 },
  partial_delivered: { label: "Partial Delivered", className: "bg-amber-500/10 text-amber-700 border-amber-500/30", icon: AlertTriangle },
  returned: { label: "Returned", className: "bg-orange-500/10 text-orange-700 border-orange-500/30", icon: RotateCcw },
  exchanged: { label: "Exchanged", className: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30", icon: Repeat },
  damaged: { label: "Damaged", className: "bg-rose-500/10 text-rose-700 border-rose-500/30", icon: AlertTriangle },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
  fake: { label: "Fake", className: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
  on_hold: { label: "On Hold", className: "bg-muted text-muted-foreground border-border", icon: Clock },
  advance_payment_pending: { label: "Advance Pending", className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30", icon: Clock },
  incomplete: { label: "Incomplete", className: "bg-muted text-muted-foreground border-border", icon: AlertTriangle },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("status", STATUS_OPTIONS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        (o.shipping_name ?? "").toLowerCase().includes(q) ||
        (o.shipping_phone ?? "").toLowerCase().includes(q) ||
        (o.shipping_city ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<OrderStatus | "all", number> = {
      all: orders.length,
      new: 0,
      confirmed: 0,
      packaging: 0,
      packed: 0,
      ready_to_ship: 0,
      shipped: 0,
      in_transit: 0,
      delivered: 0,
      partial_delivered: 0,
      returned: 0,
      exchanged: 0,
      damaged: 0,
      cancelled: 0,
      fake: 0,
      on_hold: 0,
      advance_payment_pending: 0,
      incomplete: 0,
    };
    for (const o of orders) c[o.status]++;
    return c;
  }, [orders]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order status updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Customer orders manage koro — status update, details dekho.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              generatePickingListPDF(filtered.map((o) => o.id)).catch((e) => toast.error(e.message))
            }
            disabled={filtered.length === 0}
          >
            <ClipboardList className="h-4 w-4" /> Picking list
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {(["all", ...STATUS_OPTIONS] as const).map((s) => {
          const active = statusFilter === s;
          const label = s === "all" ? "All" : statusMeta[s].label;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {label} <span className="ml-1 opacity-70">({counts[s]})</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order ID, name, phone, city…"
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-background">
        {isLoading ? (
          <AdminTableSkeleton rows={6} columns={6} />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {orders.length === 0 ? "Kono order nei ekhono." : "Ei filter e match nei."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">#{o.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{o.shipping_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{o.shipping_phone ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(o.created_at)}</TableCell>
                  <TableCell className="font-semibold">৳{Number(o.total).toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Select
                        value={o.status}
                        onValueChange={(v) =>
                          updateStatus.mutate({ id: o.id, status: v as OrderStatus })
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {statusMeta[s].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => setOpenOrderId(o.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Print invoice"
                        onClick={() =>
                          generateInvoicePDF(o.id).catch((e) => toast.error(e.message))
                        }
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Print packing list"
                        onClick={() =>
                          generatePackingListPDF(o.id).catch((e) => toast.error(e.message))
                        }
                      >
                        <ClipboardList className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <OrderDetailsDialog
        orderId={openOrderId}
        onClose={() => setOpenOrderId(null)}
        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
      />
    </div>
  );
}

function OrderDetailsDialog({
  orderId,
  onClose,
  onStatusChange,
}: {
  orderId: string | null;
  onClose: () => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "order", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).single(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
      ]);
      if (orderRes.error) throw orderRes.error;
      if (itemsRes.error) throw itemsRes.error;
      return {
        order: orderRes.data as Order,
        items: (itemsRes.data ?? []) as OrderItem[],
      };
    },
    enabled: !!orderId,
  });

  return (
    <Dialog open={!!orderId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order details</DialogTitle>
          <DialogDescription>
            {orderId ? <span className="font-mono text-xs">#{orderId}</span> : null}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge status={data.order.status} />
              <Select
                value={data.order.status}
                onValueChange={(v) => onStatusChange(data.order.id, v as OrderStatus)}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusMeta[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <section>
              <h3 className="mb-2 text-sm font-semibold">Customer & shipping</h3>
              <div className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> {data.order.shipping_name ?? "—"}</div>
                <div><span className="text-muted-foreground">Phone:</span> {data.order.shipping_phone ?? "—"}</div>
                <div><span className="text-muted-foreground">Address:</span> {data.order.shipping_address ?? "—"}</div>
                <div>
                  <span className="text-muted-foreground">City / District:</span>{" "}
                  {data.order.shipping_city ?? "—"}
                  {data.order.shipping_district ? `, ${data.order.shipping_district}` : ""}
                </div>
                <div><span className="text-muted-foreground">Payment:</span> {data.order.payment_method ?? "—"}</div>
                {data.order.notes && (
                  <div><span className="text-muted-foreground">Notes:</span> {data.order.notes}</div>
                )}
                <div className="text-xs text-muted-foreground">Placed: {formatDate(data.order.created_at)}</div>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Items ({data.items.length})</h3>
              <div className="space-y-2">
                {data.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background p-2"
                  >
                    {it.image ? (
                      <img src={it.image} alt={it.name} className="h-12 w-12 rounded object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{it.name}</div>
                      <div className="text-xs text-muted-foreground">
                        ৳{Number(it.price).toLocaleString()} × {it.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">
                      ৳{(Number(it.price) * it.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            <section className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>৳{Number(data.order.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>৳{Number(data.order.shipping_fee).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>৳{Number(data.order.total).toLocaleString()}</span>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
