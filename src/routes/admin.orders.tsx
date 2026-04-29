import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listOrders,
  getOrderDetail,
  transitionOrderStatus,
  bulkTransitionStatus,
  updateOrder,
  addOrderNote,
  getOrderCounts,
} from "@/server/orders.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
  Package,
  Clock,
  AlertCircle,
  Trash2,
  StickyNote,
} from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
});

const STATUS_TABS = [
  { value: "all", label: "All", statuses: [] as string[] },
  { value: "new", label: "New", statuses: ["new"] },
  { value: "active", label: "Active", statuses: ["confirmed", "packaging", "packed", "ready_to_ship"] },
  { value: "shipped", label: "Shipped", statuses: ["shipped", "in_transit"] },
  { value: "delivered", label: "Delivered", statuses: ["delivered", "partial_delivered"] },
  { value: "issues", label: "Issues", statuses: ["on_hold", "returned", "damaged", "cancelled", "fake"] },
];

const ALL_STATUSES = [
  "new", "confirmed", "packaging", "packed", "ready_to_ship",
  "shipped", "in_transit", "delivered", "partial_delivered",
  "returned", "exchanged", "damaged", "cancelled", "fake",
  "on_hold",
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  confirmed: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  packaging: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  packed: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  ready_to_ship: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  shipped: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  in_transit: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  delivered: "bg-green-500/10 text-green-700 border-green-500/20",
  partial_delivered: "bg-green-500/10 text-green-700 border-green-500/20",
  returned: "bg-red-500/10 text-red-700 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-700 border-gray-500/20",
  fake: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-500/10 text-gray-600",
  normal: "bg-blue-500/10 text-blue-600",
  high: "bg-orange-500/10 text-orange-600",
  urgent: "bg-red-500/10 text-red-600",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function OrdersPage() {
  const qc = useQueryClient();
  const list = useServerFn(listOrders);
  const counts = useServerFn(getOrderCounts);

  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const activeStatuses = useMemo(
    () => STATUS_TABS.find((t) => t.value === tab)?.statuses ?? [],
    [tab],
  );

  const { data: countsData } = useQuery({
    queryKey: ["admin-order-counts"],
    queryFn: () => counts(),
    staleTime: 30_000,
  });

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["admin-orders", { tab, search, page, pageSize }],
    queryFn: () =>
      list({
        data: {
          search: search || undefined,
          status: activeStatuses.length ? activeStatuses : undefined,
          page,
          page_size: pageSize,
          sort_by: "created_at",
          sort_dir: "desc",
        },
      }),
    placeholderData: (prev) => prev,
  });

  const tabCounts = useMemo(() => {
    const m = countsData?.counts ?? {};
    const totalAll = countsData?.total ?? 0;
    return {
      all: totalAll,
      new: m.new ?? 0,
      active: ["confirmed", "packaging", "packed", "ready_to_ship"].reduce((s, k) => s + (m[k] ?? 0), 0),
      shipped: ["shipped", "in_transit"].reduce((s, k) => s + (m[k] ?? 0), 0),
      delivered: ["delivered", "partial_delivered"].reduce((s, k) => s + (m[k] ?? 0), 0),
      issues: ["on_hold", "returned", "damaged", "cancelled", "fake"].reduce((s, k) => s + (m[k] ?? 0), 0),
    } as Record<string, number>;
  }, [countsData]);

  const rows = ordersData?.rows ?? [];
  const total = ordersData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const bulkFn = useServerFn(bulkTransitionStatus);
  const bulkMutation = useMutation({
    mutationFn: async (newStatus: string) =>
      bulkFn({ data: { order_ids: Array.from(selected), new_status: newStatus } }),
    onSuccess: (res) => {
      toast.success(`Updated ${res.ok} orders${res.failed ? `, ${res.failed} failed` : ""}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-order-counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} total {selected.size > 0 && ` · ${selected.size} selected`}
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); setSelected(new Set()); }}>
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full sm:w-auto">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs">
              {t.label}
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {tabCounts[t.value] ?? 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={onSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, phone, or order ID…"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
          {search && (
            <Button type="button" variant="ghost" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
              Clear
            </Button>
          )}
        </form>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          <Select onValueChange={(v) => bulkMutation.mutate(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Change status to…" />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" onClick={() => setSelected(new Set())}>Cancel</Button>
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && rows.length === 0 ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              rows.map((o) => {
                const itemCount = (o.order_items ?? []).reduce((s, it) => s + (it.quantity ?? 0), 0);
                return (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setOpenOrderId(o.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(o.id)}
                        onCheckedChange={() => toggleOne(o.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">#{o.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(o.created_at), "MMM d, HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{o.shipping_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {o.shipping_phone ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        {itemCount}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">৳{Number(o.total).toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_COLORS[o.priority ?? "normal"]}`}>
                        {o.priority ?? "normal"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {Math.floor((Date.now() - new Date(o.created_at).getTime()) / 3600000)}h
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <OrderDetailDrawer
        orderId={openOrderId}
        onClose={() => setOpenOrderId(null)}
        onChanged={() => {
          qc.invalidateQueries({ queryKey: ["admin-orders"] });
          qc.invalidateQueries({ queryKey: ["admin-order-counts"] });
        }}
      />
    </div>
  );
}

// ============================================================
// Order Detail Drawer
// ============================================================

function OrderDetailDrawer({
  orderId,
  onClose,
  onChanged,
}: {
  orderId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const detail = useServerFn(getOrderDetail);
  const transition = useServerFn(transitionOrderStatus);
  const update = useServerFn(updateOrder);
  const noteFn = useServerFn(addOrderNote);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-order-detail", orderId],
    queryFn: () => detail({ data: { id: orderId! } }),
    enabled: !!orderId,
  });

  const [note, setNote] = useState("");

  const transitionMut = useMutation({
    mutationFn: async (newStatus: string) =>
      transition({ data: { order_id: orderId!, new_status: newStatus } }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async (patch: { id: string; priority?: "low" | "normal" | "high" | "urgent"; payment_status?: "unpaid" | "partial" | "paid" | "refunded" }) =>
      update({ data: patch }),
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const noteMut = useMutation({
    mutationFn: async () =>
      noteFn({ data: { order_id: orderId!, body: note.trim(), is_internal: true } }),
    onSuccess: () => {
      toast.success("Note added");
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const order = data?.order;
  const items = data?.items ?? [];
  const history = data?.history ?? [];
  const notes = data?.notes ?? [];

  return (
    <Sheet open={!!orderId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Order #{orderId?.slice(0, 8)}
            {order && <StatusBadge status={order.status} />}
          </SheetTitle>
        </SheetHeader>

        {isLoading || !order ? (
          <div className="space-y-3 mt-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Quick actions */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <Select onValueChange={(v) => transitionMut.mutate(v)}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Change status…" /></SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={order.priority ?? "normal"}
                  onValueChange={(v) => updateMut.mutate({ id: order.id, priority: v as "low" | "normal" | "high" | "urgent" })}
                >
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "normal", "high", "urgent"].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={order.payment_status ?? "unpaid"}
                  onValueChange={(v) => updateMut.mutate({ id: order.id, payment_status: v as "unpaid" | "partial" | "paid" | "refunded" })}
                >
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["unpaid", "partial", "paid", "refunded"].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            {/* Customer */}
            <section className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Phone className="h-4 w-4" /> Customer
              </h3>
              <div className="text-sm space-y-1">
                <div><span className="text-muted-foreground">Name:</span> {order.shipping_name ?? "—"}</div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>{" "}
                  <a href={`tel:${order.shipping_phone}`} className="text-primary hover:underline">{order.shipping_phone}</a>
                  {" · "}
                  <a
                    href={`https://wa.me/${(order.shipping_phone ?? "").replace(/\D/g, "")}`}
                    target="_blank" rel="noreferrer"
                    className="text-green-600 hover:underline"
                  >WhatsApp</a>
                </div>
                {order.alternate_phone && <div><span className="text-muted-foreground">Alt:</span> {order.alternate_phone}</div>}
                {order.guest_email && <div><span className="text-muted-foreground">Email:</span> {order.guest_email}</div>}
              </div>
            </section>

            {/* Shipping */}
            <section className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Shipping
              </h3>
              <div className="text-sm space-y-1">
                <div>{order.shipping_address}</div>
                <div className="text-muted-foreground">
                  {[order.shipping_thana, order.shipping_district, order.shipping_city].filter(Boolean).join(", ")}
                </div>
              </div>
            </section>

            {/* Items */}
            <section className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Package className="h-4 w-4" /> Items ({items.length})
              </h3>
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 text-sm">
                    {it.image && <img src={it.image} alt="" className="w-10 h-10 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{it.name}</div>
                      {it.variant_label && <div className="text-xs text-muted-foreground">{it.variant_label}</div>}
                    </div>
                    <div className="text-muted-foreground">×{it.quantity}</div>
                    <div className="font-medium">৳{Number(it.line_total ?? it.price ?? 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 mt-2 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>৳{Number(order.subtotal ?? 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>৳{Number(order.shipping_fee ?? 0).toLocaleString()}</span></div>
                {Number(order.discount_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600"><span>Discount</span><span>-৳{Number(order.discount_amount).toLocaleString()}</span></div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t"><span>Total</span><span>৳{Number(order.total).toLocaleString()}</span></div>
              </div>
            </section>

            {/* Status timeline */}
            <section className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" /> Status timeline
              </h3>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground">No history yet</p>
              ) : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div key={h.id} className="text-xs flex gap-2">
                      <div className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(h.created_at), "MMM d HH:mm")}
                      </div>
                      <div>
                        {h.from_status && <><span className="line-through text-muted-foreground">{h.from_status}</span> → </>}
                        <span className="font-medium">{h.to_status}</span>
                        {h.note && <div className="text-muted-foreground">{h.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Notes */}
            <section className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <StickyNote className="h-4 w-4" /> Notes ({notes.length})
              </h3>
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="text-sm rounded bg-muted/50 p-2">
                    <div className="text-xs text-muted-foreground mb-1">
                      {format(new Date(n.created_at), "MMM d HH:mm")}
                      {n.is_internal && <Badge variant="secondary" className="ml-2 text-[10px] h-4">internal</Badge>}
                    </div>
                    <div>{n.body}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add an internal note…"
                  rows={2}
                />
                <Button
                  size="sm"
                  disabled={!note.trim() || noteMut.isPending}
                  onClick={() => noteMut.mutate()}
                >
                  Add note
                </Button>
              </div>
            </section>

            {order.risk_flag && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm flex gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>This order is flagged as risky.</div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
