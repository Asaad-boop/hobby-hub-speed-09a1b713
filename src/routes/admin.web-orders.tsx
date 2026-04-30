import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Phone,
  MessageCircle,
  Plus,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Star,
  Globe,
  Loader2,
  RefreshCw,
  X,
  MapPin,
  CreditCard,
  Package,
  User,
  Calendar,
  FileText,
  Tag,
  Search,
  Trash2,
  Minus,
  Hash,
  Truck,
  StickyNote,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { fetchCourierStats } from "@/lib/courier.functions";

export const Route = createFileRoute("/admin/web-orders")({
  component: WebOrdersPage,
});

type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string;
  auto_call_enabled: boolean | null;
  call_status: string | null;
  call_attempt_count?: number | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_district?: string | null;
  shipping_thana?: string | null;
  alternate_phone?: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email?: string | null;
  is_guest_order?: boolean | null;
  latest_note: string | null;
  admin_notes: string | null;
  customer_note?: string | null;
  internal_note?: string | null;
  tags: string[] | null;
  order_tags: string[] | null;
  source_website: string | null;
  source?: string | null;
  total: number;
  subtotal?: number | null;
  shipping_fee?: number | null;
  discount_amount?: number | null;
  advance_amount?: number | null;
  coupon_code?: string | null;
  payment_method?: string | null;
  delivery_method?: string | null;
  courier_name?: string | null;
  tracking_number?: string | null;
  status: string;
  confirmation_status?: string | null;
  web_status?: string | null;
  order_items: {
    id?: string;
    name: string;
    image: string | null;
    quantity: number;
    product_id: string;
    price?: number;
    unit_price?: number | null;
    variant_label?: string | null;
    line_total?: number | null;
  }[];
};


type CourierStat = {
  total: number;
  success: number;
  rate: number;
  loading: boolean;
  error?: string;
  stale?: boolean;
};

function cleanPhone(p: string | null | undefined): string | null {
  if (!p) return null;
  const digits = p.replace(/[^0-9]/g, "").slice(-11);
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
}

function CircularProgress({ percent }: { percent: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, percent)) / 100) * c;
  const color =
    percent >= 80 ? "text-emerald-500" : percent >= 60 ? "text-amber-500" : "text-rose-500";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
      <circle cx="20" cy="20" r={r} strokeWidth="3" className="stroke-muted" fill="none" />
      <circle
        cx="20"
        cy="20"
        r={r}
        strokeWidth="3"
        strokeLinecap="round"
        className={`${color} transition-all`}
        stroke="currentColor"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function AutoCallBadge({ enabled, status }: { enabled: boolean | null; status: string | null }) {
  if (!enabled) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
        Off
      </span>
    );
  }
  const map: Record<string, { label: string; cls: string }> = {
    not_called: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    called: { label: "Called", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    no_answer: { label: "No Answer", cls: "bg-rose-50 text-rose-700 border-rose-200" },
    busy: { label: "Busy", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  };
  const m = map[status || "not_called"] ?? map.not_called;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

type TabKey =
  | "processing"
  | "incomplete"
  | "good_no_response"
  | "no_response"
  | "advance_payment"
  | "on_hold"
  | "complete"
  | "cancel"
  | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "processing", label: "Processing" },
  { key: "incomplete", label: "Incomplete" },
  { key: "good_no_response", label: "Good But No Response" },
  { key: "no_response", label: "No Response" },
  { key: "advance_payment", label: "Advance Payment" },
  { key: "on_hold", label: "On Hold" },
  { key: "complete", label: "Complete" },
  { key: "cancel", label: "Cancel" },
  { key: "all", label: "All" },
];

const PROCESSING_STATUSES = new Set([
  "new",
]);

function matchesTab(o: OrderRow, tab: TabKey): boolean {
  const s = o.status;
  const cs = o.call_status;
  switch (tab) {
    case "all":
      return true;
    case "processing":
      return PROCESSING_STATUSES.has(s);
    case "incomplete":
      return s === "incomplete";
    case "advance_payment":
      return s === "advance_payment_pending";
    case "on_hold":
      return s === "on_hold";
    case "complete":
      return s === "delivered" || s === "partial_delivered";
    case "cancel":
      return s === "cancelled" || s === "fake";
    case "good_no_response":
      // Reached customer but no confirmation yet (e.g. busy line, asked to call back)
      return PROCESSING_STATUSES.has(s) && cs === "busy";
    case "no_response":
      // Tried calling but customer didn't pick up
      return PROCESSING_STATUSES.has(s) && cs === "no_answer";
    default:
      return true;
  }
}

type AbandonedCart = {
  id: string;
  created_at: string;
  updated_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_district: string | null;
  subtotal: number;
  cart_items: Array<{
    product_id?: string;
    name: string;
    image?: string | null;
    price?: number;
    qty?: number;
    quantity?: number;
  }>;
  is_converted: boolean;
};

function WebOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [abandoned, setAbandoned] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [tab, setTab] = useState<TabKey>("processing");
  const [openOrder, setOpenOrder] = useState<OrderRow | null>(null);
  const [courierStats, setCourierStats] = useState<Record<string, CourierStat>>({});
  const fetchStatsFn = useServerFn(fetchCourierStats);

  const refreshCourierStat = async (phone: string, force = false) => {
    setCourierStats((prev) => ({
      ...prev,
      [phone]: { ...(prev[phone] ?? { total: 0, success: 0, rate: 0 }), loading: true, error: undefined },
    }));
    try {
      const res = await fetchStatsFn({ data: { phone, force_refresh: force } });
      if (res.ok && res.data) {
        setCourierStats((prev) => ({
          ...prev,
          [phone]: {
            total: res.data!.overall_total,
            success: res.data!.overall_success,
            rate: Number(res.data!.overall_success_rate),
            loading: false,
            stale: res.stale,
            error: res.stale ? res.error : undefined,
          },
        }));
        if (force) toast.success("Courier rating updated");
      } else {
        const msg = res.error ?? "Failed to fetch courier stats";
        setCourierStats((prev) => ({
          ...prev,
          [phone]: { ...(prev[phone] ?? { total: 0, success: 0, rate: 0 }), loading: false, error: msg },
        }));
        if (force) toast.error(msg);
      }
    } catch (e) {
      const msg = (e as Error).message;
      setCourierStats((prev) => ({
        ...prev,
        [phone]: { ...(prev[phone] ?? { total: 0, success: 0, rate: 0 }), loading: false, error: msg },
      }));
      if (force) toast.error(msg);
    }
  };

  async function loadOrders() {
    setLoading(true);
    const [ordersRes, abandonedRes] = await Promise.all([
      supabase
        .from("orders")
        .select(
          `id, created_at, updated_at, auto_call_enabled, call_status, call_attempt_count,
           shipping_name, shipping_phone, shipping_address, shipping_city, shipping_district,
           shipping_thana, alternate_phone, guest_name, guest_phone, guest_email, is_guest_order,
           latest_note, admin_notes, customer_note, internal_note, tags, order_tags,
           source_website, source, total, subtotal, shipping_fee, discount_amount, advance_amount,
           coupon_code, payment_method, delivery_method, courier_name, tracking_number,
           status, confirmation_status, web_status,
           order_items ( id, name, image, quantity, product_id, price, unit_price, variant_label, line_total )`,
        )
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("abandoned_carts")
        .select(
          "id, created_at, updated_at, customer_name, customer_phone, shipping_address, shipping_city, shipping_district, subtotal, cart_items, is_converted",
        )
        .eq("is_converted", false)
        .order("updated_at", { ascending: false })
        .limit(200),
    ]);

    if (ordersRes.error) {
      toast.error("Failed to load orders: " + ordersRes.error.message);
      setOrders([]);
    } else {
      setOrders((ordersRes.data ?? []) as unknown as OrderRow[]);
    }
    if (!abandonedRes.error) {
      setAbandoned((abandonedRes.data ?? []) as unknown as AbandonedCart[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  // Counts per tab (computed from full orders list)
  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {
      processing: 0,
      incomplete: abandoned.length,
      good_no_response: 0,
      no_response: 0,
      advance_payment: 0,
      on_hold: 0,
      complete: 0,
      cancel: 0,
      all: orders.length,
    };
    for (const o of orders) {
      for (const t of TABS) {
        if (t.key === "all" || t.key === "incomplete") continue;
        if (matchesTab(o, t.key)) counts[t.key]++;
      }
    }
    return counts;
  }, [orders, abandoned]);

  const isIncompleteTab = tab === "incomplete";

  // Apply tab filter
  const filteredOrders = useMemo(
    () => (isIncompleteTab ? [] : orders.filter((o) => matchesTab(o, tab))),
    [orders, tab, isIncompleteTab],
  );

  const total = isIncompleteTab ? abandoned.length : filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [page, pageSize, filteredOrders]);
  const abandonedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return abandoned.slice(start, start + pageSize);
  }, [page, pageSize, abandoned]);

  // BD Courier auto-fetch disabled — will be re-enabled later when API is configured.

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allChecked) rows.forEach((r) => next.delete(r.id));
    else rows.forEach((r) => next.add(r.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Web Orders</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All incoming orders from your storefront.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            {selected.size > 0 && <span className="mr-3">{selected.size} selected</span>}
            {total} orders
          </div>
          <Button variant="outline" size="sm" onClick={loadOrders} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = tabCounts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setPage(1);
              }}
              className={`group relative inline-flex items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={active ? "font-medium" : ""}>{t.label}</span>
              <span
                className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Order Items</TableHead>
                
                <TableHead>Tags</TableHead>
                <TableHead>Site</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading orders…
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                    No orders yet.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((o) => {
                  const dt = formatDateTime(o.created_at);
                  const phone = o.shipping_phone || o.guest_phone || "";
                  const name = o.shipping_name || o.guest_name || "—";
                  const address = [o.shipping_address, o.shipping_city]
                    .filter(Boolean)
                    .join(", ");
                  const noteSource = o.latest_note || o.admin_notes;
                  const noteAge = daysAgo(noteSource ? o.updated_at : null);
                  const tags = [...(o.tags || []), ...(o.order_tags || [])];
                  const items = o.order_items || [];
                  return (
                    <TableRow key={o.id} className="align-top">
                      <TableCell className="pt-4">
                        <Checkbox
                          checked={selected.has(o.id)}
                          onCheckedChange={() => toggleOne(o.id)}
                        />
                      </TableCell>
                      <TableCell className="pt-3">
                        <div className="text-sm font-medium text-foreground">{dt.date}</div>
                        <div className="text-xs text-muted-foreground">{dt.time}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground font-mono">
                          #{o.id.slice(0, 8)}
                        </div>
                      </TableCell>
                      <TableCell className="pt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{phone || "—"}</span>
                          {phone && (
                            <>
                              <a
                                href={`tel:${phone}`}
                                className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50"
                                aria-label="Call"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                              <a
                                href={`https://wa.me/88${phone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md p-1 text-green-600 hover:bg-green-50"
                                aria-label="WhatsApp"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </a>
                            </>
                          )}
                        </div>
                        <div className="mt-0.5 text-sm text-foreground">{name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2 max-w-[220px]">
                          {address || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="pt-3">
                        <span className="text-xs text-muted-foreground">
                          {!noteSource
                            ? "No notes"
                            : noteAge === 0
                              ? "Updated today"
                              : `Updated ${noteAge} day${(noteAge ?? 0) > 1 ? "s" : ""} ago`}
                        </span>
                      </TableCell>
                      <TableCell className="pt-3">
                        <div className="space-y-1.5">
                          {items.length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {items.map((it, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <img
                                src={it.image || "https://picsum.photos/seed/p/64"}
                                alt={it.name}
                                className="h-9 w-9 rounded-md border object-cover"
                              />
                              <div className="min-w-0 max-w-[160px]">
                                <div className="text-[11px] text-muted-foreground line-clamp-1">
                                  {it.name}
                                </div>
                                <div className="text-xs">Qty: {it.quantity}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="pt-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {tags.map((t) => (
                            <Badge
                              key={t}
                              variant="secondary"
                              className="rounded-full text-[10px] font-medium"
                            >
                              {t}
                            </Badge>
                          ))}
                          <button className="inline-flex items-center gap-0.5 rounded-full border border-dashed px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted">
                            <Plus className="h-2.5 w-2.5" />
                            Add
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="pt-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Globe className="h-3.5 w-3.5" />
                          {o.source_website || "main"}
                        </div>
                      </TableCell>
                      <TableCell className="pt-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          onClick={() => setOpenOrder(o)}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <OrderDetailModal
        order={openOrder}
        onClose={() => setOpenOrder(null)}
        onSaved={() => {
          setOpenOrder(null);
          loadOrders();
        }}
      />
    </div>
  );
}

const fmtBDT = (n: number | null | undefined) =>
  typeof n === "number" ? `৳${n.toLocaleString("en-BD")}` : "—";

const fmtFullDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function StatusPill({ label, tone = "slate" }: { label: string; tone?: string }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone] ?? tones.slate}`}>
      {label}
    </span>
  );
}

function statusTone(s: string): string {
  if (["delivered", "partial_delivered", "complete"].includes(s)) return "green";
  if (["cancelled", "fake", "returned"].includes(s)) return "rose";
  if (["shipped", "in_transit"].includes(s)) return "blue";
  if (["packed", "ready_to_ship", "courier_entry", "packaging", "ready_to_pack"].includes(s)) return "amber";
  return "slate";
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

const ORDER_STATUS_OPTIONS = [
  "new",
  "confirmed",
  "incomplete",
  "on_hold",
  "advance_payment_pending",
  "ready_to_pack",
  "packaging",
  "packed",
  "ready_to_ship",
  "courier_entry",
  "shipped",
  "in_transit",
  "delivered",
  "partial_delivered",
  "returned",
  "cancelled",
  "fake",
];

const CONFIRMATION_STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "rejected",
];

const CALL_STATUS_OPTIONS = [
  "not_called",
  "called",
  "no_answer",
  "busy",
];

const PAYMENT_METHOD_OPTIONS = [
  "cod",
  "bkash",
  "nagad",
  "rocket",
  "card",
  "bank_transfer",
];

type EditableItem = {
  id?: string; // existing row id; absent for newly added items
  _isNew?: boolean;
  name: string;
  image: string | null;
  product_id: string;
  variant_label?: string | null;
  quantity: number;
  unit_price: number;
};

type ProductPick = {
  id: string;
  title: string;
  price: number;
  image: string | null;
};

type EditableForm = {
  shipping_name: string;
  shipping_phone: string;
  alternate_phone: string;
  guest_email: string;
  shipping_address: string;
  shipping_thana: string;
  shipping_city: string;
  shipping_district: string;
  status: string;
  confirmation_status: string;
  call_status: string;
  auto_call_enabled: boolean;
  payment_method: string;
  delivery_method: string;
  courier_name: string;
  tracking_number: string;
  shipping_fee: number;
  discount_amount: number;
  advance_amount: number;
  coupon_code: string;
  customer_note: string;
  admin_notes: string;
  internal_note: string;
  tags: string;
  items: EditableItem[];
};

function OrderDetailModal({
  order,
  onClose,
  onSaved,
}: {
  order: OrderRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EditableForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerResults, setPickerResults] = useState<ProductPick[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  useEffect(() => {
    if (!order) {
      setForm(null);
      return;
    }
    setForm({
      shipping_name: order.shipping_name ?? order.guest_name ?? "",
      shipping_phone: order.shipping_phone ?? order.guest_phone ?? "",
      alternate_phone: order.alternate_phone ?? "",
      guest_email: order.guest_email ?? "",
      shipping_address: order.shipping_address ?? "",
      shipping_thana: order.shipping_thana ?? "",
      shipping_city: order.shipping_city ?? "",
      shipping_district: order.shipping_district ?? "",
      status: order.status ?? "new",
      confirmation_status: order.confirmation_status ?? "pending",
      call_status: order.call_status ?? "not_called",
      auto_call_enabled: !!order.auto_call_enabled,
      payment_method: order.payment_method ?? "cod",
      delivery_method: order.delivery_method ?? "",
      courier_name: order.courier_name ?? "",
      tracking_number: order.tracking_number ?? "",
      shipping_fee: Number(order.shipping_fee ?? 0),
      discount_amount: Number(order.discount_amount ?? 0),
      advance_amount: Number(order.advance_amount ?? 0),
      coupon_code: order.coupon_code ?? "",
      customer_note: order.customer_note ?? "",
      admin_notes: order.admin_notes ?? "",
      internal_note: order.internal_note ?? "",
      tags: [...(order.tags ?? []), ...(order.order_tags ?? [])].join(", "),
      items: (order.order_items ?? []).map((it) => ({
        id: it.id,
        name: it.name,
        image: it.image,
        product_id: it.product_id,
        variant_label: it.variant_label ?? null,
        quantity: it.quantity ?? 1,
        unit_price: Number(it.unit_price ?? it.price ?? 0),
      })),
    });
  }, [order]);

  // Product search for "Add item"
  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    setPickerLoading(true);
    const t = setTimeout(async () => {
      let q = supabase
        .from("products")
        .select("id, title, price, image")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (pickerQuery.trim()) q = q.ilike("title", `%${pickerQuery.trim()}%`);
      const { data } = await q;
      if (!cancelled) {
        setPickerResults((data ?? []) as ProductPick[]);
        setPickerLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [pickerOpen, pickerQuery]);

  if (!order || !form) return null;

  const update = <K extends keyof EditableForm>(key: K, value: EditableForm[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const updateItem = (idx: number, patch: Partial<EditableItem>) =>
    setForm((f) => {
      if (!f) return f;
      const items = [...f.items];
      items[idx] = { ...items[idx], ...patch };
      return { ...f, items };
    });

  const removeItem = (idx: number) =>
    setForm((f) => {
      if (!f) return f;
      const items = f.items.filter((_, i) => i !== idx);
      return { ...f, items };
    });

  const addItem = (p: ProductPick) => {
    setForm((f) => {
      if (!f) return f;
      // If product already in list, just bump qty
      const existingIdx = f.items.findIndex((it) => it.product_id === p.id && !it.variant_label);
      if (existingIdx >= 0) {
        const items = [...f.items];
        items[existingIdx] = { ...items[existingIdx], quantity: items[existingIdx].quantity + 1 };
        return { ...f, items };
      }
      return {
        ...f,
        items: [
          ...f.items,
          {
            _isNew: true,
            name: p.title,
            image: p.image,
            product_id: p.id,
            variant_label: null,
            quantity: 1,
            unit_price: Number(p.price) || 0,
          },
        ],
      };
    });
    setPickerOpen(false);
    setPickerQuery("");
  };

  const itemsSubtotal = form.items.reduce(
    (sum, it) => sum + (Number(it.unit_price) || 0) * (Number(it.quantity) || 0),
    0,
  );
  const computedTotal =
    itemsSubtotal +
    Number(form.shipping_fee || 0) -
    Number(form.discount_amount || 0);

  async function handleSave() {
    if (!order || !form) return;
    setSaving(true);
    try {
      const tagsArr = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const orderUpdate = {
        shipping_name: form.shipping_name || null,
        shipping_phone: form.shipping_phone || null,
        alternate_phone: form.alternate_phone || null,
        guest_email: form.guest_email || null,
        shipping_address: form.shipping_address || null,
        shipping_thana: form.shipping_thana || null,
        shipping_city: form.shipping_city || null,
        shipping_district: form.shipping_district || null,
        status: form.status,
        confirmation_status: form.confirmation_status,
        call_status: form.call_status,
        auto_call_enabled: form.auto_call_enabled,
        payment_method: form.payment_method || null,
        delivery_method: form.delivery_method || null,
        courier_name: form.courier_name || null,
        tracking_number: form.tracking_number || null,
        shipping_fee: Number(form.shipping_fee) || 0,
        discount_amount: Number(form.discount_amount) || 0,
        advance_amount: Number(form.advance_amount) || 0,
        coupon_code: form.coupon_code || null,
        customer_note: form.customer_note || null,
        admin_notes: form.admin_notes || null,
        internal_note: form.internal_note || null,
        order_tags: tagsArr,
        subtotal: itemsSubtotal,
        total: computedTotal,
        updated_at: new Date().toISOString(),
      };

      const { error: orderErr } = await supabase
        .from("orders")
        .update(orderUpdate as never)
        .eq("id", order.id);
      if (orderErr) throw new Error(orderErr.message);

      // Sync items: update existing, delete removed
      const originalIds = new Set(
        (order.order_items ?? [])
          .map((i) => i.id)
          .filter((id): id is string => !!id),
      );
      const keepIds = new Set(
        form.items.map((i) => i.id).filter((id): id is string => !!id),
      );
      const toDelete = [...originalIds].filter((id) => !keepIds.has(id));
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from("order_items")
          .delete()
          .in("id", toDelete);
        if (delErr) throw new Error(delErr.message);
      }

      for (const it of form.items) {
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unit_price) || 0;
        if (it.id) {
          const { error: upErr } = await supabase
            .from("order_items")
            .update({
              quantity: qty,
              unit_price: price,
              price,
              line_total: qty * price,
            })
            .eq("id", it.id);
          if (upErr) throw new Error(upErr.message);
        } else {
          // New item — insert
          const { error: insErr } = await supabase
            .from("order_items")
            .insert({
              order_id: order.id,
              product_id: it.product_id,
              name: it.name,
              image: it.image,
              variant_label: it.variant_label,
              quantity: qty,
              unit_price: price,
              price,
              line_total: qty * price,
            } as never);
          if (insErr) throw new Error(insErr.message);
        }
      }

      toast.success("Order updated");
      onSaved();
    } catch (e) {
      toast.error("Save failed: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!order} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[94vh] gap-0 overflow-hidden p-0">
        {/* Hero header */}
        <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-primary/5 to-background px-6 py-5">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm tracking-tight">{order.id.slice(0, 8).toUpperCase()}</span>
              <StatusPill label={form.status.replace(/_/g, " ")} tone={statusTone(form.status)} />
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {fmtFullDate(order.created_at)}
              </span>
              {form.shipping_phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {form.shipping_phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Package className="h-3 w-3" />
                {form.items.length} {form.items.length === 1 ? "item" : "items"}
              </span>
              <span className="ml-auto text-foreground">
                <span className="text-muted-foreground">Total: </span>
                <span className="text-base font-bold tabular-nums">{fmtBDT(computedTotal)}</span>
              </span>
            </div>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="max-h-[calc(94vh-180px)] overflow-y-auto bg-muted/30 px-6 py-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Customer */}
            <Section icon={<User className="h-4 w-4" />} title="Customer">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Name">
                  <Input value={form.shipping_name} onChange={(e) => update("shipping_name", e.target.value)} />
                </Field>
                <Field label="Phone">
                  <Input value={form.shipping_phone} onChange={(e) => update("shipping_phone", e.target.value)} />
                </Field>
                <Field label="Alt phone">
                  <Input value={form.alternate_phone} onChange={(e) => update("alternate_phone", e.target.value)} />
                </Field>
                <Field label="Email">
                  <Input value={form.guest_email} onChange={(e) => update("guest_email", e.target.value)} />
                </Field>
              </div>
            </Section>

            {/* Address */}
            <Section icon={<MapPin className="h-4 w-4" />} title="Shipping address">
              <div className="grid grid-cols-1 gap-2">
                <Field label="Address">
                  <Textarea
                    rows={2}
                    value={form.shipping_address}
                    onChange={(e) => update("shipping_address", e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Thana">
                    <Input value={form.shipping_thana} onChange={(e) => update("shipping_thana", e.target.value)} />
                  </Field>
                  <Field label="City">
                    <Input value={form.shipping_city} onChange={(e) => update("shipping_city", e.target.value)} />
                  </Field>
                  <Field label="District">
                    <Input value={form.shipping_district} onChange={(e) => update("shipping_district", e.target.value)} />
                  </Field>
                </div>
              </div>
            </Section>

            {/* Items */}
            <div className="md:col-span-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Items
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {form.items.length}
                  </span>
                  <div className="ml-auto">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPickerOpen((v) => !v)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add item
                    </Button>
                  </div>
                </div>

                {/* Add item picker */}
                {pickerOpen && (
                  <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 p-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoFocus
                        placeholder="Search products by name…"
                        className="pl-8"
                        value={pickerQuery}
                        onChange={(e) => setPickerQuery(e.target.value)}
                      />
                    </div>
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-border bg-background">
                      {pickerLoading ? (
                        <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Searching…
                        </div>
                      ) : pickerResults.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">No products found</div>
                      ) : (
                        pickerResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addItem(p)}
                            className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left last:border-0 hover:bg-muted/50"
                          >
                            <img
                              src={p.image || "https://picsum.photos/seed/p/64"}
                              alt={p.title}
                              className="h-9 w-9 rounded border object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-medium">{p.title}</div>
                              <div className="text-[11px] text-muted-foreground">{fmtBDT(p.price)}</div>
                            </div>
                            <Plus className="h-4 w-4 text-primary" />
                          </button>
                        ))
                      )}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setPickerOpen(false)}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {form.items.map((it, i) => {
                    const lineTotal = (Number(it.unit_price) || 0) * (Number(it.quantity) || 0);
                    return (
                      <div
                        key={it.id ?? `new-${i}`}
                        className={`group flex items-center gap-3 rounded-lg border bg-background p-2.5 transition-colors hover:border-primary/40 ${
                          it._isNew ? "border-primary/40 bg-primary/5" : "border-border/60"
                        }`}
                      >
                        <img
                          src={it.image || "https://picsum.photos/seed/p/64"}
                          alt={it.name}
                          className="h-14 w-14 rounded-md border object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <div className="line-clamp-1 text-sm font-medium">{it.name}</div>
                            {it._isNew && (
                              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                                New
                              </span>
                            )}
                          </div>
                          {it.variant_label && (
                            <div className="text-[11px] text-muted-foreground">{it.variant_label}</div>
                          )}
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {fmtBDT(it.unit_price)} × {it.quantity}
                          </div>
                        </div>

                        {/* Qty stepper */}
                        <div className="flex items-center rounded-md border border-border">
                          <button
                            type="button"
                            onClick={() => updateItem(i, { quantity: Math.max(1, (Number(it.quantity) || 1) - 1) })}
                            className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={(e) => updateItem(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                            className="h-8 w-12 border-x border-border bg-transparent text-center text-sm tabular-nums focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateItem(i, { quantity: (Number(it.quantity) || 0) + 1 })}
                            className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Unit price */}
                        <div className="w-24">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={it.unit_price}
                            onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })}
                            className="h-8 text-right tabular-nums"
                          />
                        </div>

                        <div className="w-24 text-right text-sm font-semibold tabular-nums">{fmtBDT(lineTotal)}</div>

                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                  {form.items.length === 0 && (
                    <div className="rounded-md border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                      No items yet — click <span className="font-medium">Add item</span> to insert one.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment & totals */}
            <Section icon={<CreditCard className="h-4 w-4" />} title="Payment & totals">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Payment method">
                  <Select value={form.payment_method} onValueChange={(v) => update("payment_method", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHOD_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Coupon code">
                  <Input value={form.coupon_code} onChange={(e) => update("coupon_code", e.target.value)} />
                </Field>
                <Field label="Shipping fee ৳">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.shipping_fee}
                    onChange={(e) => update("shipping_fee", Number(e.target.value))}
                  />
                </Field>
                <Field label="Discount ৳">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.discount_amount}
                    onChange={(e) => update("discount_amount", Number(e.target.value))}
                  />
                </Field>
                <Field label="Advance paid ৳">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.advance_amount}
                    onChange={(e) => update("advance_amount", Number(e.target.value))}
                  />
                </Field>
              </div>
              <div className="mt-3 space-y-1 rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Items subtotal</span>
                  <span className="tabular-nums">{fmtBDT(itemsSubtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="tabular-nums">+ {fmtBDT(form.shipping_fee)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums">− {fmtBDT(form.discount_amount)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-border pt-2 font-semibold">
                  <span>Total</span>
                  <span className="text-base tabular-nums">{fmtBDT(computedTotal)}</span>
                </div>
              </div>
            </Section>

            {/* Status & call */}
            <Section icon={<Tag className="h-4 w-4" />} title="Status">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Order status">
                  <Select value={form.status} onValueChange={(v) => update("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Call status">
                  <Select value={form.call_status} onValueChange={(v) => update("call_status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CALL_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            {/* Courier */}
            <Section icon={<Truck className="h-4 w-4" />} title="Delivery & courier">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Delivery method">
                  <Input value={form.delivery_method} onChange={(e) => update("delivery_method", e.target.value)} />
                </Field>
                <Field label="Courier name">
                  <Input value={form.courier_name} onChange={(e) => update("courier_name", e.target.value)} />
                </Field>
                <div className="col-span-2">
                  <Field label="Tracking number">
                    <Input value={form.tracking_number} onChange={(e) => update("tracking_number", e.target.value)} />
                  </Field>
                </div>
              </div>
            </Section>

            {/* Tags */}
            <Section icon={<Tag className="h-4 w-4" />} title="Tags">
              <Field label="Comma separated">
                <Input value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="vip, bulk, repeat" />
              </Field>
            </Section>

            {/* Notes */}
            <div className="md:col-span-2">
              <Section icon={<StickyNote className="h-4 w-4" />} title="Notes">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <Field label="Customer note">
                    <Textarea rows={3} value={form.customer_note} onChange={(e) => update("customer_note", e.target.value)} />
                  </Field>
                  <Field label="Admin notes">
                    <Textarea rows={3} value={form.admin_notes} onChange={(e) => update("admin_notes", e.target.value)} />
                  </Field>
                  <Field label="Internal note">
                    <Textarea rows={3} value={form.internal_note} onChange={(e) => update("internal_note", e.target.value)} />
                  </Field>
                </div>
              </Section>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-background px-6 py-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{fmtBDT(computedTotal)}</span>
            <span className="mx-2">•</span>
            {form.items.length} {form.items.length === 1 ? "item" : "items"}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            {form.status !== "confirmed" && form.status !== "delivered" && form.status !== "cancelled" && (
              <Button
                size="sm"
                disabled={saving}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={async () => {
                  try {
                    setSaving(true);
                    const { error } = await supabase
                      .from("orders")
                      .update({
                        status: "confirmed",
                        confirmation_status: "confirmed",
                        confirmed_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      } as never)
                      .eq("id", order.id);
                    if (error) throw error;
                    update("status", "confirmed");
                    update("confirmation_status", "confirmed");
                    toast.success("Order confirmed");
                    onSaved();
                  } catch (e) {
                    toast.error("Confirm failed: " + (e as Error).message);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                ✓ Confirm Order
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


