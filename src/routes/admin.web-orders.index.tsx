import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Search,
  Phone,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Inbox,
  FileWarning,
  PhoneOff,
  PhoneMissed,
  Wallet,
  PauseCircle,
  CheckCircle2,
  XCircle,
  List,
} from "lucide-react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { useAdminAuth } from "@/lib/admin";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type WebStatus = Database["public"]["Enums"]["web_order_status"];

const TAB_DEFS: {
  id: WebStatus | "all";
  label: string;
  icon: typeof Inbox;
  tone: string;
}[] = [
  { id: "processing", label: "Processing", icon: Inbox, tone: "text-amber-700" },
  { id: "incomplete", label: "Incomplete", icon: FileWarning, tone: "text-slate-700" },
  { id: "good_but_no_response", label: "Good But No Response", icon: PhoneOff, tone: "text-blue-700" },
  { id: "no_response", label: "No Response", icon: PhoneMissed, tone: "text-orange-700" },
  { id: "advance_payment", label: "Advance Payment", icon: Wallet, tone: "text-purple-700" },
  { id: "on_hold", label: "On Hold", icon: PauseCircle, tone: "text-yellow-700" },
  { id: "complete", label: "Complete", icon: CheckCircle2, tone: "text-emerald-700" },
  { id: "cancelled", label: "Cancelled", icon: XCircle, tone: "text-rose-700" },
  { id: "all", label: "All", icon: List, tone: "text-foreground" },
];

const WEB_STATUS_OPTIONS: WebStatus[] = [
  "processing",
  "incomplete",
  "good_but_no_response",
  "no_response",
  "advance_payment",
  "on_hold",
  "complete",
  "cancelled",
];

const searchSchema = z.object({
  tab: fallback(
    z.enum([
      "processing",
      "incomplete",
      "good_but_no_response",
      "no_response",
      "advance_payment",
      "on_hold",
      "complete",
      "cancelled",
      "all",
    ]),
    "processing",
  ).default("processing"),
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/admin/web-orders/")({
  head: () => ({
    meta: [
      { title: "Web Orders Inbox — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: zodValidator(searchSchema),
  component: WebOrdersInboxPage,
});

function formatBDT(v: number | null | undefined) {
  return `৳${Number(v ?? 0).toLocaleString("en-IN")}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function WebOrdersInboxPage() {
  const { hasRole, loading: authLoading } = useAdminAuth();
  const allowed = hasRole(["admin", "customer_service"]);
  const queryClient = useQueryClient();
  const { tab, q } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [searchInput, setSearchInput] = useState(q);

  // Sync local input <-> URL
  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  // Debounced URL sync
  useEffect(() => {
    if (searchInput === q) return;
    const t = setTimeout(() => {
      navigate({ search: (prev) => ({ ...prev, q: searchInput }) });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, q, navigate]);

  // Realtime: invalidate on any orders change
  useEffect(() => {
    if (!allowed) return;
    const channel = supabase
      .channel("web-orders-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ["web-orders-inbox"] });
          if (payload.eventType === "INSERT") {
            const o = payload.new as Order;
            toast.info("🔔 New order received", {
              description: `${o.shipping_name ?? o.guest_name ?? "Customer"} • ${formatBDT(Number(o.total))}`,
            });
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [allowed, queryClient]);

  // Fetch all orders from last 30 days for inbox view
  const { data: orders = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["web-orders-inbox"],
    enabled: allowed,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
    refetchInterval: 30_000,
  });

  const orderIds = useMemo(() => orders.map((o) => o.id), [orders]);

  // Fetch all line items for visible orders (one row each)
  const { data: itemsByOrder = {} } = useQuery({
    queryKey: ["web-orders-items", orderIds.length],
    enabled: allowed && orderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);
      if (error) throw error;
      const map: Record<string, OrderItem[]> = {};
      for (const it of (data ?? []) as OrderItem[]) {
        (map[it.order_id] ||= []).push(it);
      }
      return map;
    },
  });

  // Duplicate detection by phone (open orders only)
  const duplicatePhones = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of orders) {
      const isOpen =
        o.web_status &&
        !["complete", "cancelled"].includes(o.web_status as string);
      if (!isOpen) continue;
      const phone = (o.shipping_phone ?? o.guest_phone ?? "").trim();
      if (!phone) continue;
      counts.set(phone, (counts.get(phone) ?? 0) + 1);
    }
    const dups = new Set<string>();
    for (const [phone, n] of counts.entries()) if (n > 1) dups.add(phone);
    return dups;
  }, [orders]);

  // Counts per tab
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const status of WEB_STATUS_OPTIONS) c[status] = 0;
    for (const o of orders) {
      const ws = (o.web_status ?? "processing") as string;
      if (c[ws] !== undefined) c[ws]++;
    }
    return c;
  }, [orders]);

  // Filter rows by tab + search
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders.filter((o) => {
      const ws = (o.web_status ?? "processing") as string;
      if (tab !== "all" && ws !== tab) return false;
      if (!term) return true;
      return (
        o.id.toLowerCase().includes(term) ||
        (o.shipping_name ?? "").toLowerCase().includes(term) ||
        (o.guest_name ?? "").toLowerCase().includes(term) ||
        (o.shipping_phone ?? "").includes(term) ||
        (o.guest_phone ?? "").includes(term) ||
        (o.shipping_city ?? "").toLowerCase().includes(term)
      );
    });
  }, [orders, tab, q]);

  // Quick status change mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, web_status }: { id: string; web_status: WebStatus }) => {
      const { error } = await supabase
        .from("orders")
        .update({ web_status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["web-orders-inbox"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm">
        You don't have permission to view Web Orders.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Web Orders Inbox</h1>
          <p className="text-xs text-muted-foreground">
            Raw inbox — review, edit, and confirm incoming orders
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {TAB_DEFS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          const count = counts[t.id] ?? 0;
          return (
            <button
              key={t.id}
              onClick={() =>
                navigate({ search: (prev) => ({ ...prev, tab: t.id }) })
              }
              className={`group flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? "" : t.tone}`} />
              <span>{t.label}</span>
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by Order ID, name, phone, city..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "order" : "orders"}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-9 px-2 text-[11px] uppercase tracking-wider">Order</TableHead>
              <TableHead className="h-9 px-2 text-[11px] uppercase tracking-wider">Customer</TableHead>
              <TableHead className="h-9 px-2 text-[11px] uppercase tracking-wider">Phone</TableHead>
              <TableHead className="h-9 px-2 text-[11px] uppercase tracking-wider">Items</TableHead>
              <TableHead className="h-9 px-2 text-right text-[11px] uppercase tracking-wider">Total</TableHead>
              <TableHead className="h-9 px-2 text-[11px] uppercase tracking-wider">Status</TableHead>
              <TableHead className="h-9 px-2 text-[11px] uppercase tracking-wider">Created</TableHead>
              <TableHead className="h-9 px-2 text-right text-[11px] uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                  No orders in this tab
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => {
                const items = itemsByOrder[o.id] ?? [];
                const phone = o.shipping_phone ?? o.guest_phone ?? "";
                const customer = o.shipping_name ?? o.guest_name ?? "Guest";
                const isDup = phone && duplicatePhones.has(phone.trim());
                const isRisky = o.risk_flag;
                const itemSummary = items.length
                  ? items.length === 1
                    ? items[0].name
                    : `${items[0].name} +${items.length - 1} more`
                  : "—";
                const itemQty = items.reduce((s, it) => s + (it.quantity ?? 0), 0);

                return (
                  <TableRow
                    key={o.id}
                    className={`h-10 ${isRisky ? "bg-rose-500/5" : ""}`}
                  >
                    <TableCell className="px-2 py-1.5 font-mono text-xs">
                      <Link
                        to="/admin/web-orders/$orderId"
                        params={{ orderId: o.id }}
                        className="text-primary hover:underline"
                      >
                        {shortId(o.id)}
                      </Link>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {isDup && (
                          <Badge
                            variant="outline"
                            className="h-4 border-orange-500/40 bg-orange-500/10 px-1 text-[9px] text-orange-700"
                          >
                            <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                            Duplicate
                          </Badge>
                        )}
                        {isRisky && (
                          <Badge
                            variant="outline"
                            className="h-4 border-rose-500/40 bg-rose-500/10 px-1 text-[9px] text-rose-700"
                          >
                            Risky
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-xs">
                      <div className="font-medium">{customer}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {o.shipping_city ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-xs">
                      {phone ? (
                        <a
                          href={`tel:${phone}`}
                          className="font-mono text-primary hover:underline"
                        >
                          {phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-xs">
                      <div className="line-clamp-1 max-w-[200px]">{itemSummary}</div>
                      {itemQty > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                          {itemQty} {itemQty === 1 ? "unit" : "units"}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right font-mono text-xs font-semibold">
                      {formatBDT(Number(o.total))}
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Select
                        value={(o.web_status ?? "processing") as string}
                        onValueChange={(v) =>
                          updateStatus.mutate({ id: o.id, web_status: v as WebStatus })
                        }
                      >
                        <SelectTrigger className="h-7 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEB_STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {TAB_DEFS.find((t) => t.id === s)?.label ?? s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-xs text-muted-foreground">
                      {formatDateTime(o.created_at)}
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="flex items-center justify-end gap-1">
                        {phone && (
                          <Button
                            asChild
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Call customer"
                          >
                            <a href={`tel:${phone}`}>
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Open order"
                        >
                          <Link
                            to="/admin/web-orders/$orderId"
                            params={{ orderId: o.id }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
