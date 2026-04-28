import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  auto_call_enabled: boolean | null;
  call_status: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  latest_note: string | null;
  admin_notes: string | null;
  updated_at: string;
  tags: string[] | null;
  order_tags: string[] | null;
  source_website: string | null;
  total: number;
  status: string;
  order_items: {
    name: string;
    image: string | null;
    quantity: number;
    product_id: string;
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
  "confirmed",
  "packaging",
  "packed",
  "ready_to_pack",
  "ready_to_ship",
  "courier_entry",
  "shipped",
  "in_transit",
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

function WebOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [tab, setTab] = useState<TabKey>("processing");
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
    const { data, error } = await supabase
      .from("orders")
      .select(
        `id, created_at, auto_call_enabled, call_status, shipping_name, shipping_phone,
         shipping_address, shipping_city, guest_name, guest_phone, latest_note, admin_notes,
         updated_at, tags, order_tags, source_website, total, status,
         order_items ( name, image, quantity, product_id )`,
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast.error("Failed to load orders: " + error.message);
      setOrders([]);
    } else {
      setOrders((data ?? []) as unknown as OrderRow[]);
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
      incomplete: 0,
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
        if (t.key === "all") continue;
        if (matchesTab(o, t.key)) counts[t.key]++;
      }
    }
    return counts;
  }, [orders]);

  // Apply tab filter
  const filteredOrders = useMemo(
    () => orders.filter((o) => matchesTab(o, tab)),
    [orders, tab],
  );

  const total = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [page, pageSize, filteredOrders]);

  // Auto-fetch courier stats for visible rows (cache-first, server-side)
  useEffect(() => {
    const phones = Array.from(
      new Set(
        rows
          .map((r) => cleanPhone(r.shipping_phone || r.guest_phone))
          .filter((p): p is string => !!p),
      ),
    ).filter((p) => courierStats[p] === undefined);
    if (phones.length === 0) return;
    let cancelled = false;
    const queue = [...phones];
    const CONCURRENCY = 3;
    setCourierStats((prev) => {
      const next = { ...prev };
      phones.forEach((p) => {
        next[p] = { total: 0, success: 0, rate: 0, loading: true };
      });
      return next;
    });
    const worker = async () => {
      while (!cancelled) {
        const phone = queue.shift();
        if (!phone) return;
        try {
          const res = await fetchStatsFn({ data: { phone } });
          if (cancelled) return;
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
          } else {
            setCourierStats((prev) => ({
              ...prev,
              [phone]: { total: 0, success: 0, rate: 0, loading: false, error: res.error },
            }));
          }
        } catch (e) {
          if (cancelled) return;
          setCourierStats((prev) => ({
            ...prev,
            [phone]: { total: 0, success: 0, rate: 0, loading: false, error: (e as Error).message },
          }));
        }
      }
    };
    Array.from({ length: Math.min(CONCURRENCY, phones.length) }).forEach(() => void worker());
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

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
                <TableHead>Auto Call</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Order Items</TableHead>
                <TableHead>Success Rate</TableHead>
                
                <TableHead>Tags</TableHead>
                <TableHead>Site</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading orders…
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
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
                        <AutoCallBadge enabled={o.auto_call_enabled} status={o.call_status} />
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
                        <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs">
                          <Link to="/admin/orders-pipeline">
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </Link>
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
    </div>
  );
}

