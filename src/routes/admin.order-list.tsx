import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Printer,
  FileText,
  Truck,
  Search,
  CheckCircle2,
  ClipboardList,
  Trash2,
  RefreshCw,
  ShoppingBag,
  Clock,
  Phone,
  MapPin,
  User,
  Wallet,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

import { Card, Loading, Empty, Input } from "@/components/admin/ui";
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
import { generatePackingSlipsPDF } from "@/lib/pdf/packing-slips";
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
  const toneMap: Record<string, { bg: string; dot: string }> = {
    amber: { bg: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
    blue: { bg: "bg-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" },
    indigo: { bg: "bg-indigo-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500" },
    violet: { bg: "bg-violet-50 text-violet-700 ring-violet-200", dot: "bg-violet-500" },
    purple: { bg: "bg-purple-50 text-purple-700 ring-purple-200", dot: "bg-purple-500" },
    emerald: { bg: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
    rose: { bg: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  };
  const t = toneMap[def?.tone ?? "blue"] ?? toneMap.blue;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${t.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot} ${status !== "delivered" && status !== "returned" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}

/**
 * Highlights all case-insensitive occurrences of `query` inside `text`.
 * Returns the original text untouched when query is empty.
 */
function Highlight({
  text,
  query,
}: {
  text: string | null | undefined;
  query: string;
}) {
  const value = text ?? "";
  const q = query.trim();
  if (!q) return <>{value || "—"}</>;
  if (!value) return <>—</>;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = value.split(new RegExp(`(${escaped})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-200/70 px-0.5 font-semibold text-foreground dark:bg-yellow-500/30"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function OrderListPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<StatusValue | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);

  // Debounce the input so filtering feels instant without thrashing on every keystroke
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 120);
    return () => window.clearTimeout(t);
  }, [search]);

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
    const raw = debouncedSearch.trim();
    const q = raw.toLowerCase();
    // Allow searching with or without "#", and tolerate spaces/dashes in phone numbers
    const qDigits = raw.replace(/\D+/g, "");
    if (q) {
      rows = rows.filter((r) => {
        const id = r.id.toLowerCase();
        const short = shortId(r.id).toLowerCase();
        const name = (r.shipping_name ?? "").toLowerCase();
        const phone = (r.shipping_phone ?? "").replace(/\D+/g, "");
        const tracking = (r.tracking_number ?? "").toLowerCase();
        return (
          id.includes(q) ||
          short.includes(q.replace(/^#/, "")) ||
          name.includes(q) ||
          tracking.includes(q) ||
          (qDigits.length >= 3 && phone.includes(qDigits))
        );
      });
    }
    return rows;
  }, [data, filter, debouncedSearch]);

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


  async function bulkChangeStatus(ids: string[], newStatus: StatusValue) {
    if (!ids.length) return;
    const t = toast.loading(`Updating ${ids.length} order(s)…`);
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
        .in("id", ids);
      if (error) throw error;
      toast.success(`Updated ${ids.length} order(s)`, { id: t });
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["order-list-confirmed"] });
    } catch (e) {
      toast.error("Bulk update failed: " + (e as Error).message, { id: t });
    }
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

  async function printPackingSlips(ids: string[]) {
    if (!ids.length) {
      toast.error("Select at least one order");
      return;
    }
    const t = toast.loading(`Generating ${ids.length} packing slip(s)…`);
    try {
      await generatePackingSlipsPDF(ids);
      toast.success(`Packing slips ready (${ids.length})`, { id: t });
    } catch (e) {
      toast.error("Slips failed: " + (e as Error).message, { id: t });
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

  // Stats for hero cards
  const stats = useMemo(() => {
    const rows = data ?? [];
    const pending = rows.filter((r) => r.status === "confirmed").length;
    const inFulfillment = rows.filter((r) =>
      ["ready_to_pack", "packaging", "packed", "ready_to_ship"].includes(r.status),
    ).length;
    const inTransit = rows.filter((r) => ["shipped", "in_transit"].includes(r.status)).length;
    const revenue = rows.reduce((s, r) => s + Number(r.total ?? 0), 0);
    return { total: rows.length, pending, inFulfillment, inTransit, revenue };
  }, [data]);

  return (
    <div className="space-y-5">
      {/* Hero header — premium glassy card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-violet-500/10 p-5 shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.5),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.04),transparent_50%)]" />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-primary-foreground shadow-lg shadow-primary/30">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
            </span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Order List</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Confirmed orders · fulfillment pipeline & courier tracking
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 bg-background/70 backdrop-blur"
              onClick={() => printPicking([...selected])}
              disabled={selected.size === 0}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Picking ({selected.size})
            </Button>
            {selected.size > 0 && (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 gap-1.5"
                  onClick={() => hardDelete([...selected])}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete ({selected.size})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats grid — 5 cards including revenue */}
        <div className="relative mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
          <StatCard
            icon={<ShoppingBag className="h-3.5 w-3.5" />}
            label="Total"
            value={stats.total.toString()}
            tone="from-blue-500 to-indigo-600"
          />
          <StatCard
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Pending"
            value={stats.pending.toString()}
            tone="from-amber-500 to-orange-600"
          />
          <StatCard
            icon={<Package className="h-3.5 w-3.5" />}
            label="Fulfillment"
            value={stats.inFulfillment.toString()}
            tone="from-violet-500 to-purple-600"
          />
          <StatCard
            icon={<Truck className="h-3.5 w-3.5" />}
            label="In transit"
            value={stats.inTransit.toString()}
            tone="from-emerald-500 to-teal-600"
          />
          <StatCard
            icon={<Wallet className="h-3.5 w-3.5" />}
            label="Revenue"
            value={fmtBDT(stats.revenue)}
            tone="from-pink-500 to-rose-600"
          />
        </div>
      </div>

      {/* Sticky glassy toolbar: filter pills + search */}
      <div className="sticky top-0 z-10 rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label="All"
              count={counts.all ?? 0}
            />
            {PIPELINE_STATUSES.map((s) => (
              <FilterPill
                key={s.value}
                active={filter === s.value}
                onClick={() => setFilter(s.value)}
                label={s.label}
                count={counts[s.value] ?? 0}
              />
            ))}
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order ID, phone, tracking, name…"
              className="pl-9 pr-20 shadow-sm"
            />
            {search && (
              <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {filtered.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <Loading label="Loading orders…" />
        ) : filtered.length === 0 ? (
          <Empty
            title={debouncedSearch ? "No matches found" : "No orders"}
            description={
              debouncedSearch
                ? `Nothing matches "${debouncedSearch}" — try an order ID, phone, tracking, or name.`
                : "No confirmed orders match your filter."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 pl-4">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-gray-300 accent-primary"
                      checked={selected.size > 0 && selected.size === filtered.length}
                      onChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Order</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Customer</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Items</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Courier</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => {
                  const itemCount = (o.order_items ?? []).reduce(
                    (s, it) => s + (it.quantity || 0),
                    0,
                  );
                  const isSelected = selected.has(o.id);
                  return (
                    <TableRow
                      key={o.id}
                      className={`group border-b transition-colors ${
                        isSelected ? "bg-primary/5" : "odd:bg-muted/20 hover:bg-accent/40"
                      }`}
                    >
                      <TableCell className="pl-4">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-gray-300 accent-primary"
                          checked={isSelected}
                          onChange={() => toggleSel(o.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-violet-500/15 ring-1 ring-primary/20 shadow-sm transition-transform group-hover:scale-105">
                            <ShoppingBag className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-mono text-xs font-bold tracking-tight">#<Highlight text={shortId(o.id)} query={debouncedSearch.replace(/^#/, "")} /></div>
                            <div className="text-[10px] text-muted-foreground">{fmtDate(o.created_at)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 text-[10px] font-bold uppercase text-foreground ring-1 ring-border">
                            {(o.shipping_name ?? "?").trim().slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 truncate text-sm font-medium">
                              <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate"><Highlight text={o.shipping_name} query={debouncedSearch} /></span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                              <span className="inline-flex items-center gap-0.5">
                                <Phone className="h-2.5 w-2.5" />
                                <Highlight text={o.shipping_phone} query={debouncedSearch} />
                              </span>
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5" />
                                {o.shipping_city ?? o.shipping_district ?? "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold">
                          <Package className="h-3 w-3" />
                          {itemCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold tabular-nums text-foreground">{fmtBDT(o.total)}</div>
                        <div className="text-[10px] capitalize text-muted-foreground">
                          {o.payment_method ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium capitalize">
                          {o.courier_name || o.delivery_method || "—"}
                        </div>
                        {o.tracking_number && !o.tracking_number.startsWith("PENDING_") && (
                          <div className="font-mono text-[10px] text-emerald-600">
                            <Highlight text={o.tracking_number} query={debouncedSearch} />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={o.status}
                          onValueChange={(v) => changeStatus(o.id, v as StatusValue)}
                          disabled={busyId === o.id}
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue>
                              <StatusBadge status={o.status} />
                            </SelectValue>
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
                        <div className="flex flex-wrap items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                          <Button
                            size="sm"
                            className={`h-7 px-2 text-[11px] ${
                              o.tracking_number
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                : "bg-gradient-to-r from-primary to-violet-600 text-primary-foreground hover:opacity-90"
                            }`}
                            onClick={() => sendToPathao(o.id)}
                            disabled={busyId === o.id || !!o.tracking_number}
                            title={
                              o.tracking_number
                                ? `Already booked: ${o.tracking_number}`
                                : "Send to Pathao courier"
                            }
                          >
                            {o.tracking_number ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <Truck className="h-3 w-3" />
                            )}
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
                            Pack
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => printPicking([o.id])}
                            disabled={busyId === o.id}
                          >
                            <Printer className="h-3 w-3" />
                            Pick
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
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

      {/* Floating bulk actions toolbar */}
      {selected.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-background/95 px-3 py-2 shadow-2xl shadow-primary/20 backdrop-blur-xl ring-1 ring-primary/10">
            <div className="flex items-center gap-2 pl-1 pr-2">
              <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-gradient-to-r from-primary to-violet-600 px-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/30">
                {selected.size}
              </span>
              <span className="text-xs font-medium text-foreground">
                selected
              </span>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* One-click status update */}
            <Select onValueChange={(v) => bulkChangeStatus([...selected], v as StatusValue)}>
              <SelectTrigger className="h-8 w-[160px] gap-1 text-xs">
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                <SelectValue placeholder="Update status…" />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Courier sync (Pathao bulk send) */}
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-gradient-to-r from-primary to-violet-600 text-primary-foreground shadow-md shadow-primary/30 hover:opacity-90"
              onClick={() => sendBulkToPathao([...selected])}
            >
              <Truck className="h-3.5 w-3.5" />
              Send Pathao
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={runSyncPathao}
              disabled={syncing}
              title="Sync Pathao statuses"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              Sync
            </Button>

            {/* Packing slips PDF (combined) */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => printPackingSlips([...selected])}
              title="Export packing slips PDF (address, COD, items)"
            >
              <Printer className="h-3.5 w-3.5" />
              Slips
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => printPicking([...selected])}
              title="Print picking list"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Picking
            </Button>

            <div className="h-6 w-px bg-border" />

            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => hardDelete([...selected])}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setSelected(new Set())}
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${tone} opacity-80`}
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${tone} text-white shadow-sm transition-transform group-hover:scale-110`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-1.5 text-2xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
        active
          ? "border-transparent bg-gradient-to-r from-primary to-violet-600 text-primary-foreground shadow-md shadow-primary/25"
          : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent hover:shadow-sm"
      }`}
    >
      {label}
      <span
        className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums transition-colors ${
          active ? "bg-white/25 text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
