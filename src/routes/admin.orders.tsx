import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Search, Filter, ChevronLeft, ChevronRight, MoreHorizontal,
  Phone, MessageCircle, Flag, Loader2, X, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusPill, ORDER_STATUS_LABELS } from "@/components/admin/StatusPill";
import {
  listOrders, getOrderDetail, transitionOrderStatus,
  bulkTransitionStatus, addOrderNote, updateOrder, getOrderCounts,
} from "@/server/orders.functions";

const TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: "all", label: "All", statuses: [] },
  { key: "new", label: "New", statuses: ["new"] },
  { key: "active", label: "Active", statuses: ["confirmed", "packaging", "packed", "ready_to_ship"] },
  { key: "shipped", label: "Shipped", statuses: ["shipped", "in_transit"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered", "partial_delivered"] },
  { key: "returns", label: "Returns", statuses: ["returned", "exchanged", "damaged", "pending_return", "paid_return", "unpaid_return", "partial_return"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled", "fake"] },
  { key: "hold", label: "On Hold", statuses: ["on_hold", "advance_payment_pending", "incomplete"] },
];

const NEXT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "confirmed", label: "Confirm" },
  { value: "packaging", label: "Mark Packaging" },
  { value: "packed", label: "Mark Packed" },
  { value: "ready_to_ship", label: "Ready to Ship" },
  { value: "shipped", label: "Mark Shipped" },
  { value: "delivered", label: "Mark Delivered" },
  { value: "on_hold", label: "Put on Hold" },
  { value: "cancelled", label: "Cancel" },
  { value: "fake", label: "Mark Fake" },
];

const searchSchema = z.object({
  tab: z.string().optional(),
  status: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  orderId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/admin/orders")({
  validateSearch: (s) => searchSchema.parse(s),
  component: OrdersPage,
});

const taka = (n: number) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(n);

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60000))}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function OrdersPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();

  const tab = search.tab ?? "all";
  const q = search.q ?? "";
  const page = search.page ?? 1;
  const drawerOrderId = search.orderId;

  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => setSearchInput(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) {
        navigate({ search: (s) => ({ ...s, q: searchInput || undefined, page: 1 }), replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const activeStatuses = useMemo(() => {
    if (search.status) return [search.status];
    return TABS.find((t) => t.key === tab)?.statuses ?? [];
  }, [tab, search.status]);

  const counts = useQuery({
    queryKey: ["orders", "counts"],
    queryFn: () => getOrderCounts(),
    staleTime: 30_000,
  });

  const orders = useQuery({
    queryKey: ["orders", "list", { tab, statuses: activeStatuses, q, page }],
    queryFn: () =>
      listOrders({
        data: {
          search: q || undefined,
          status: activeStatuses.length ? activeStatuses : undefined,
          page,
          page_size: 25,
          sort_by: "created_at",
          sort_dir: "desc",
        },
      }),
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => setSelected(new Set()), [tab, q, page]);

  const bulkMut = useMutation({
    mutationFn: (newStatus: string) =>
      bulkTransitionStatus({ data: { order_ids: Array.from(selected), new_status: newStatus } }),
    onSuccess: (r) => {
      toast.success(`Updated ${r.ok} orders${r.failed ? `, ${r.failed} failed` : ""}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tabCount = (statuses: string[]) => {
    if (!counts.data) return null;
    if (statuses.length === 0) return counts.data.total;
    return statuses.reduce((s, st) => s + (counts.data!.counts[st] ?? 0), 0);
  };

  const rows = orders.data?.rows ?? [];
  const total = orders.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">Manage all your store orders</p>
        </div>
      </div>

      {/* Tabs */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b border-border bg-muted/30 p-2">
          {TABS.map((t) => {
            const c = tabCount(t.statuses);
            const active = (search.status ? false : tab === t.key);
            return (
              <button
                key={t.key}
                onClick={() => navigate({ search: () => ({ tab: t.key, page: 1 }) })}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50"
                }`}
              >
                {t.label}
                {c !== null && c !== undefined && (
                  <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>{c}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search row */}
        <div className="flex items-center gap-2 border-b border-border bg-background p-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or order ID..."
              className="h-9 pl-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2 h-9">
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
          <div className="ml-auto text-xs text-muted-foreground tabular-nums">
            {orders.isLoading ? "..." : `${total} order${total === 1 ? "" : "s"}`}
          </div>
        </div>

        {/* Bulk toolbar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 border-b border-primary/30 bg-primary/5 px-4 py-2.5">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Separator orientation="vertical" className="h-4" />
            <Select onValueChange={(v) => bulkMut.mutate(v)}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="Change status to..." />
              </SelectTrigger>
              <SelectContent>
                {NEXT_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {bulkMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Button variant="ghost" size="sm" className="ml-auto h-8" onClick={() => setSelected(new Set())}>
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-xs uppercase text-muted-foreground">
                <th className="w-10 px-4 py-2.5">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                </th>
                <th className="px-2 py-2.5 text-left font-medium">Order</th>
                <th className="px-2 py-2.5 text-left font-medium">Customer</th>
                <th className="px-2 py-2.5 text-left font-medium">Items</th>
                <th className="px-2 py-2.5 text-right font-medium">Total</th>
                <th className="px-2 py-2.5 text-left font-medium">Status</th>
                <th className="px-2 py-2.5 text-left font-medium">Age</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {orders.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={8} className="px-4 py-2.5"><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    No orders found
                  </td>
                </tr>
              ) : (
                rows.map((o) => {
                  const checked = selected.has(o.id);
                  const itemCount = (o.order_items as { id: string }[] | null)?.length ?? 0;
                  return (
                    <tr
                      key={o.id}
                      className="border-b border-border hover:bg-muted/40 cursor-pointer transition"
                      onClick={() => navigate({ search: (s) => ({ ...s, orderId: o.id }) })}
                    >
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const next = new Set(selected);
                            if (v) next.add(o.id);
                            else next.delete(o.id);
                            setSelected(next);
                          }}
                        />
                      </td>
                      <td className="px-2 py-2.5 font-mono text-xs tabular-nums">#{o.id.slice(0, 8)}</td>
                      <td className="px-2 py-2.5">
                        <div className="font-medium">{o.shipping_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{o.shipping_phone ?? ""}</div>
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">{itemCount}</td>
                      <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{taka(Number(o.total ?? 0))}</td>
                      <td className="px-2 py-2.5"><StatusPill status={o.status} /></td>
                      <td className="px-2 py-2.5 text-xs text-muted-foreground tabular-nums">{timeAgo(o.created_at)}</td>
                      <td className="px-2 py-2.5"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5">
          <div className="text-xs text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page <= 1}
              onClick={() => navigate({ search: (s) => ({ ...s, page: page - 1 }) })}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page >= totalPages}
              onClick={() => navigate({ search: (s) => ({ ...s, page: page + 1 }) })}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      <OrderDrawer
        orderId={drawerOrderId}
        onClose={() => navigate({ search: (s) => ({ ...s, orderId: undefined }) })}
      />
    </div>
  );
}

function OrderDrawer({ orderId, onClose }: { orderId?: string; onClose: () => void }) {
  const open = !!orderId;
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const detail = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrderDetail({ data: { id: orderId! } }),
    enabled: open,
  });

  const transition = useMutation({
    mutationFn: (newStatus: string) =>
      transitionOrderStatus({ data: { order_id: orderId!, new_status: newStatus } }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const noteMut = useMutation({
    mutationFn: () => addOrderNote({ data: { order_id: orderId!, body: note, is_internal: true } }),
    onSuccess: () => {
      toast.success("Note added");
      setNote("");
      qc.invalidateQueries({ queryKey: ["order", orderId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const priorityMut = useMutation({
    mutationFn: (priority: string) =>
      updateOrder({ data: { id: orderId!, priority: priority as "low" | "normal" | "high" | "urgent" } }),
    onSuccess: () => {
      toast.success("Priority updated");
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const o = detail.data?.order;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 overflow-y-auto">
        {detail.isLoading || !o ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur p-5">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <SheetTitle className="font-mono text-base">#{o.id.slice(0, 8)}</SheetTitle>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()}
                  </div>
                </div>
                <StatusPill status={o.status} />
              </div>
            </SheetHeader>

            <div className="p-5 space-y-5">
              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <Select onValueChange={(v) => transition.mutate(v)}>
                  <SelectTrigger className="h-8 flex-1 min-w-[180px] text-xs">
                    <SelectValue placeholder="Change status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {NEXT_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={o.priority ?? "normal"} onValueChange={(v) => priorityMut.mutate(v)}>
                  <SelectTrigger className="h-8 w-[120px] text-xs">
                    <Flag className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low" className="text-xs">Low</SelectItem>
                    <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                    <SelectItem value="high" className="text-xs">High</SelectItem>
                    <SelectItem value="urgent" className="text-xs">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs">
                    Timeline ({detail.data?.history.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs">
                    Notes ({detail.data?.notes.length ?? 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Customer */}
                  <Card className="p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Customer
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="font-medium">{o.shipping_name ?? "—"}</div>
                      <div className="flex flex-wrap gap-2">
                        {o.shipping_phone && (
                          <>
                            <Button asChild variant="outline" size="sm" className="h-7 gap-1 text-xs">
                              <a href={`tel:${o.shipping_phone}`}>
                                <Phone className="h-3 w-3" /> {o.shipping_phone}
                              </a>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="h-7 gap-1 text-xs">
                              <a href={`https://wa.me/${o.shipping_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                                <MessageCircle className="h-3 w-3" /> WhatsApp
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground pt-2">
                        {o.shipping_address}<br />
                        {[o.shipping_thana, o.shipping_city, o.shipping_district].filter(Boolean).join(", ")}
                      </div>
                    </div>
                  </Card>

                  {/* Items */}
                  <Card className="p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Items ({detail.data?.items.length ?? 0})
                    </div>
                    <div className="divide-y divide-border">
                      {detail.data?.items.map((it) => (
                        <div key={it.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                          {it.image && (
                            <img src={it.image} alt="" className="h-10 w-10 rounded-md object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{it.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {it.variant_label && <span>{it.variant_label} · </span>}
                              Qty {it.quantity} × {taka(Number(it.unit_price ?? it.price ?? 0))}
                            </div>
                          </div>
                          <div className="text-sm font-semibold tabular-nums">
                            {taka(Number(it.line_total ?? Number(it.price) * it.quantity))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-3" />
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{taka(Number(o.subtotal ?? 0))}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span className="tabular-nums">{taka(Number(o.shipping_fee ?? 0))}</span></div>
                      {Number(o.discount_amount ?? 0) > 0 && (
                        <div className="flex justify-between text-success"><span>Discount</span><span className="tabular-nums">−{taka(Number(o.discount_amount))}</span></div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-base"><span>Total</span><span className="tabular-nums">{taka(Number(o.total ?? 0))}</span></div>
                    </div>
                  </Card>

                  {/* Payment */}
                  <Card className="p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Payment & Shipping
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Method</div>
                        <div className="font-medium">{o.payment_method ?? "COD"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Status</div>
                        <div className="font-medium capitalize">{o.payment_status}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Courier</div>
                        <div className="font-medium">{o.courier_name ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Tracking</div>
                        <div className="font-medium font-mono text-xs">{o.tracking_number ?? "—"}</div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  <Card className="p-4">
                    {(detail.data?.history.length ?? 0) === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">No status changes yet</div>
                    ) : (
                      <div className="space-y-3">
                        {detail.data?.history.map((h) => (
                          <div key={h.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                              <div className="w-px flex-1 bg-border" />
                            </div>
                            <div className="flex-1 pb-3">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">
                                  {h.from_status ? ORDER_STATUS_LABELS[h.from_status] ?? h.from_status : "—"}
                                </span>
                                <span>→</span>
                                <StatusPill status={h.to_status} />
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(h.created_at).toLocaleString()}
                              </div>
                              {h.note && <div className="text-xs mt-1.5 p-2 rounded bg-muted">{h.note}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </TabsContent>

                <TabsContent value="notes" className="mt-4 space-y-4">
                  <Card className="p-4">
                    <Textarea
                      placeholder="Add an internal note..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="resize-none text-sm"
                      rows={3}
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        disabled={!note.trim() || noteMut.isPending}
                        onClick={() => noteMut.mutate()}
                      >
                        {noteMut.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        Add Note
                      </Button>
                    </div>
                  </Card>

                  <div className="space-y-2">
                    {(detail.data?.notes.length ?? 0) === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">No notes yet</div>
                    ) : (
                      detail.data?.notes.map((n) => (
                        <Card key={n.id} className="p-3">
                          <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                          <div className="text-[10px] text-muted-foreground mt-1.5">
                            {new Date(n.created_at).toLocaleString()}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
