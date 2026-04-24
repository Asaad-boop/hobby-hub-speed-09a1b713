import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Phone,
  MessageCircle,
  Copy,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Settings as SettingsIcon,
  MapPin,
  User as UserIcon,
  Plus,
  Filter as FilterIcon,
  ChevronDown,
} from "lucide-react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useAdminAuth } from "@/lib/admin";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type CallStatus = Database["public"]["Enums"]["call_status"];
type ConfirmationStatus = Database["public"]["Enums"]["confirmation_status"];

export const Route = createFileRoute("/admin/web-orders/")({
  head: () => ({
    meta: [
      { title: "Web Order List" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: WebOrdersPage,
});

const TABS = [
  { id: "processing", label: "⊙ Processing" },
  { id: "incomplete", label: "📝 Incomplete" },
  { id: "no_response_soft", label: "👍 Good But No Response" },
  { id: "no_response", label: "💬 No Response" },
  { id: "advance", label: "💳 Advance Payment" },
  { id: "hold", label: "⏸ On Hold" },
  { id: "complete", label: "✅ Complete" },
  { id: "cancel", label: "❌ Cancel" },
  { id: "all", label: "≡ All" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function formatBDT(value: number) {
  return `৳${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatCreatedAt(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${date}, ${time.toLowerCase()}`;
}

function relativeShort(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function copyToClipboard(text: string, label = "Copied") {
  if (!text) return;
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(label))
    .catch(() => toast.error("Copy failed"));
}

function CallDots({ count }: { count: number }) {
  const max = 3;
  return (
    <div className="flex items-center gap-1" aria-label={`${count} call attempts`}>
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i < count ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground">
        {count > 0 ? count : "—"}
      </span>
    </div>
  );
}

function SuccessRing({ rate }: { rate: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, rate));
  const offset = c - (pct / 100) * c;
  const color =
    pct >= 90
      ? "text-emerald-500"
      : pct >= 70
        ? "text-amber-500"
        : "text-rose-500";
  return (
    <div className="relative h-12 w-12">
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
        <circle cx="22" cy="22" r={r} strokeWidth="4" className="stroke-muted" fill="none" />
        <circle
          cx="22"
          cy="22"
          r={r}
          strokeWidth="4"
          className={`${color} stroke-current transition-all`}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${color}`}
      >
        {Math.round(pct)}%
      </span>
    </div>
  );
}

type CustomerStat = {
  phone: string | null;
  total_orders: number | null;
  delivered_orders: number | null;
  cancelled_orders: number | null;
  success_rate: number | null;
};

type CourierStat = {
  phone: string;
  overall_total: number;
  overall_success: number;
  overall_cancel: number;
  overall_success_rate: number | null;
  last_fetched_at: string;
};

function WebOrdersPage() {
  const { user, hasRole, loading: authLoading } = useAdminAuth();
  const allowed = hasRole(["admin", "customer_service"]);
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabId>("processing");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  // Realtime new-order subscription
  useEffect(() => {
    if (!allowed) return;
    const channel = supabase
      .channel("web-orders-new")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as Order;
          if (newOrder.status === "new") {
            queryClient.invalidateQueries({ queryKey: ["web-orders"] });
            if (soundOn) {
              try {
                const audio = new Audio(
                  "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"
                );
                audio.play().catch(() => {});
              } catch {}
            }
            toast.info(`🔔 New order received`, {
              description: `${newOrder.shipping_name ?? newOrder.guest_name ?? "Customer"} • ${formatBDT(Number(newOrder.total))}`,
            });
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [allowed, soundOn, queryClient]);

  const {
    data: orders = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["web-orders"],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
    refetchInterval: autoRefresh ? 30_000 : false,
    enabled: allowed,
  });

  // Fetch first item per order for the Order Items column
  const orderIds = useMemo(() => orders.map((o) => o.id), [orders]);
  const { data: itemsByOrder = {} } = useQuery({
    queryKey: ["web-orders-items", orderIds.join(",")],
    enabled: allowed && orderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);
      if (error) throw error;
      const map: Record<string, OrderItem[]> = {};
      for (const it of (data ?? []) as OrderItem[]) {
        if (!map[it.order_id]) map[it.order_id] = [];
        map[it.order_id].push(it);
      }
      return map;
    },
  });

  // Customer success-rate stats by phone
  const phones = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      const p = o.shipping_phone ?? o.guest_phone;
      if (p) set.add(p);
    }
    return Array.from(set);
  }, [orders]);

  const { data: statsByPhone = {} } = useQuery({
    queryKey: ["web-orders-stats", phones.join(",")],
    enabled: allowed && phones.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_stats_by_phone")
        .select("*")
        .in("phone", phones);
      if (error) {
        console.error("stats query failed", error);
        return {} as Record<string, CustomerStat>;
      }
      const map: Record<string, CustomerStat> = {};
      for (const row of (data ?? []) as CustomerStat[]) {
        if (row.phone) map[row.phone] = row;
      }
      return map;
    },
  });

  // BD Courier success-rate stats by phone (from courier_stats_cache)
  const { data: courierByPhone = {} } = useQuery({
    queryKey: ["web-orders-courier-stats", phones.join(",")],
    enabled: allowed && phones.length > 0,
    refetchInterval: autoRefresh ? 60_000 : false,
    queryFn: async () => {
      const cleanPhones = phones
        .map((p) => p.replace(/[^0-9]/g, "").slice(-11))
        .filter((p) => /^01[3-9]\d{8}$/.test(p));
      if (cleanPhones.length === 0) return {} as Record<string, CourierStat>;

      const { data, error } = await supabase
        .from("courier_stats_cache")
        .select(
          "phone, overall_total, overall_success, overall_cancel, overall_success_rate, last_fetched_at",
        )
        .in("phone", cleanPhones);
      if (error) {
        console.error("courier stats query failed", error);
        return {} as Record<string, CourierStat>;
      }
      const map: Record<string, CourierStat> = {};
      for (const row of (data ?? []) as CourierStat[]) {
        map[row.phone] = row;
      }

      // Fire-and-forget: fetch missing phones in background via edge function
      const missing = cleanPhones.filter((p) => !map[p]);
      if (missing.length > 0) {
        // Limit to 5 per refresh to avoid hammering the API
        for (const p of missing.slice(0, 5)) {
          supabase.functions
            .invoke("fetch-courier-stats", { body: { phone: p } })
            .then(() => {
              queryClient.invalidateQueries({
                queryKey: ["web-orders-courier-stats"],
              });
            })
            .catch((e) => console.warn("courier fetch failed", p, e));
        }
      }
      return map;
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  const counts = useMemo(() => {
    const c: Record<TabId, number> = {
      processing: 0,
      incomplete: 0,
      no_response_soft: 0,
      no_response: 0,
      advance: 0,
      hold: 0,
      complete: 0,
      cancel: 0,
      all: orders.length,
    };
    const oneDayAgo = Date.now() - 24 * 3600_000;
    for (const o of orders) {
      if (
        o.status === "new" &&
        o.confirmation_status === "pending" &&
        o.call_attempt_count < 2
      )
        c.processing++;
      const phone = o.shipping_phone ?? o.guest_phone;
      const addr = o.shipping_address;
      if (!phone || !addr) c.incomplete++;
      if (
        o.call_status === "reached" &&
        o.confirmation_status === "pending" &&
        new Date(o.created_at).getTime() < oneDayAgo
      )
        c.no_response_soft++;
      if (
        ["no_response", "wrong_number"].includes(o.call_status) ||
        o.call_attempt_count >= 3
      )
        c.no_response++;
      if (o.confirmation_status === "advance_pending") c.advance++;
      if (o.confirmation_status === "on_hold") c.hold++;
      if (
        o.confirmation_status === "confirmed" &&
        o.confirmed_at?.slice(0, 10) === today
      )
        c.complete++;
      if (["rejected", "fake"].includes(o.confirmation_status)) c.cancel++;
    }
    return c;
  }, [orders, today]);

  const filtered = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 3600_000;
    let list = orders;
    switch (tab) {
      case "processing":
        list = list.filter(
          (o) =>
            o.status === "new" &&
            o.confirmation_status === "pending" &&
            o.call_attempt_count < 2,
        );
        break;
      case "incomplete":
        list = list.filter(
          (o) =>
            !(o.shipping_phone ?? o.guest_phone) || !o.shipping_address,
        );
        break;
      case "no_response_soft":
        list = list.filter(
          (o) =>
            o.call_status === "reached" &&
            o.confirmation_status === "pending" &&
            new Date(o.created_at).getTime() < oneDayAgo,
        );
        break;
      case "no_response":
        list = list.filter(
          (o) =>
            ["no_response", "wrong_number"].includes(o.call_status) ||
            o.call_attempt_count >= 3,
        );
        break;
      case "advance":
        list = list.filter((o) => o.confirmation_status === "advance_pending");
        break;
      case "hold":
        list = list.filter((o) => o.confirmation_status === "on_hold");
        break;
      case "complete":
        list = list.filter(
          (o) =>
            o.confirmation_status === "confirmed" &&
            o.confirmed_at?.slice(0, 10) === today,
        );
        break;
      case "cancel":
        list = list.filter((o) => ["rejected", "fake"].includes(o.confirmation_status));
        break;
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.shipping_phone ?? "").includes(q) ||
        (o.guest_phone ?? "").includes(q) ||
        (o.shipping_name ?? "").toLowerCase().includes(q) ||
        (o.guest_name ?? "").toLowerCase().includes(q),
    );
  }, [orders, tab, search, today]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [tab, search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const allOnPageSelected =
    pagedOrders.length > 0 && pagedOrders.every((o) => selected.has(o.id));

  function togglePageSelect() {
    setSelected((prev) => {
      const n = new Set(prev);
      if (allOnPageSelected) {
        for (const o of pagedOrders) n.delete(o.id);
      } else {
        for (const o of pagedOrders) n.add(o.id);
      }
      return n;
    });
  }

  // ===== Mutations =====
  const confirmOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "confirmed",
          confirmation_status: "confirmed",
          confirmed_at: new Date().toISOString(),
          confirmed_by: user?.id,
          call_status: "customer_confirmed",
        })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      toast.success(`Order #${id.slice(0, 8).toUpperCase()} confirmed`);
      queryClient.invalidateQueries({ queryKey: ["web-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectOrder = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          confirmation_status: "rejected",
          rejection_reason: reason,
        })
        .eq("id", id);
      if (error) throw error;
      const { data: o } = await supabase
        .from("orders")
        .select("user_id")
        .eq("id", id)
        .single();
      if (o?.user_id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("cancellation_count")
          .eq("id", o.user_id)
          .single();
        await supabase
          .from("profiles")
          .update({ cancellation_count: (p?.cancellation_count ?? 0) + 1 })
          .eq("id", o.user_id);
      }
    },
    onSuccess: () => {
      toast.success("Order rejected");
      queryClient.invalidateQueries({ queryKey: ["web-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markFake = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "fake",
          confirmation_status: "fake",
          rejection_reason: reason,
        })
        .eq("id", id);
      if (error) throw error;
      const { data: o } = await supabase
        .from("orders")
        .select("user_id")
        .eq("id", id)
        .single();
      if (o?.user_id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("fake_order_count")
          .eq("id", o.user_id)
          .single();
        const next = (p?.fake_order_count ?? 0) + 1;
        await supabase
          .from("profiles")
          .update({
            fake_order_count: next,
            is_flagged: next >= 3,
            flag_reason: next >= 3 ? "3+ fake orders" : null,
          })
          .eq("id", o.user_id);
      }
    },
    onSuccess: () => {
      toast.success("Marked as fake");
      queryClient.invalidateQueries({ queryKey: ["web-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateOrderField = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Order> }) => {
      const { error } = await supabase.from("orders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Bulk action: add tag
  const bulkAddTag = useMutation({
    mutationFn: async ({ ids, tag }: { ids: string[]; tag: string }) => {
      for (const id of ids) {
        const o = orders.find((x) => x.id === id);
        const next = Array.from(new Set([...(o?.order_tags ?? []), tag]));
        const { error } = await supabase
          .from("orders")
          .update({ order_tags: next })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Tag added to selected orders");
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["web-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Dialogs
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [fakeFor, setFakeFor] = useState<string | null>(null);
  const [fakeConfirm, setFakeConfirm] = useState("");
  const [fakeReason, setFakeReason] = useState("");
  const [holdFor, setHoldFor] = useState<string | null>(null);
  const [holdReason, setHoldReason] = useState("waiting_for_stock");
  const [advanceFor, setAdvanceFor] = useState<string | null>(null);
  const [advance, setAdvance] = useState({ amount: "", method: "bkash", txn: "" });
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [bulkTagValue, setBulkTagValue] = useState("");

  if (authLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-lg font-bold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Web Orders queue admin or customer service team er jonno.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Web Order List</h1>
          <p className="text-xs text-muted-foreground">
            Total in last 7 days: <span className="font-semibold">{orders.length}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
            <Switch id="auto" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label htmlFor="auto" className="text-xs font-semibold">
              Auto-refresh
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSoundOn((v) => !v)}>
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs row */}
      <div className="flex flex-wrap items-center gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSelected(new Set());
              }}
              className={`relative whitespace-nowrap px-3 py-2 text-xs font-semibold transition ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                  active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {counts[t.id]}
              </span>
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter orders…"
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-3.5 w-3.5" /> New
        </Button>
        <Button variant="outline" size="sm">
          <FilterIcon className="mr-1 h-3.5 w-3.5" /> Filter
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={selected.size === 0}
              className={selected.size > 0 ? "border-primary text-primary" : ""}
            >
              Bulk Actions ({selected.size}) <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{selected.size} selected</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                for (const id of selected) await confirmOrder.mutateAsync(id);
                setSelected(new Set());
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Bulk Confirm
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setBulkTagOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Bulk Add Tag
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                toast.info("Bulk SMS coming soon");
              }}
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Bulk Send SMS
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelected(new Set())}>
              Clear selection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : pagedOrders.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Ei tab e kono order nei.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={togglePageSelect}
                      className="h-4 w-4 rounded border-border"
                      aria-label="Select all on page"
                    />
                  </TableHead>
                  <TableHead className="min-w-[140px]">Created At</TableHead>
                  <TableHead>Auto Call</TableHead>
                  <TableHead className="min-w-[220px]">Customer</TableHead>
                  <TableHead className="min-w-[160px]">Note</TableHead>
                  <TableHead className="min-w-[200px]">Order Items</TableHead>
                  <TableHead className="min-w-[140px]">Success Rate</TableHead>
                  <TableHead className="min-w-[120px]">Tags</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedOrders.map((o) => {
                  const phone = o.shipping_phone ?? o.guest_phone ?? "";
                  const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-11);
                  const customerName =
                    o.shipping_name ?? o.guest_name ?? "—";
                  const orderItems = itemsByOrder[o.id] ?? [];
                  const firstItem = orderItems[0];
                  const moreCount = orderItems.length - 1;
                  const courier = cleanPhone ? courierByPhone[cleanPhone] : undefined;
                  const internalStat = phone ? statsByPhone[phone] : undefined;
                  // Prefer BD Courier data; fall back to internal delivered/total
                  const successRate = courier
                    ? Number(courier.overall_success_rate ?? 0)
                    : Number(internalStat?.success_rate ?? 0);
                  const total = courier
                    ? courier.overall_total
                    : (internalStat?.total_orders ?? 0);
                  const delivered = courier
                    ? courier.overall_success
                    : (internalStat?.delivered_orders ?? 0);
                  const cancelled = courier ? courier.overall_cancel : 0;
                  const isCourierSource = !!courier;
                  const idShort = o.id.slice(0, 8).toUpperCase();
                  const isSelected = selected.has(o.id);
                  const cityLine = [o.shipping_city, o.shipping_district]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <TableRow
                      key={o.id}
                      data-state={isSelected ? "selected" : undefined}
                      className="align-top"
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            setSelected((s) => {
                              const n = new Set(s);
                              if (n.has(o.id)) n.delete(o.id);
                              else n.add(o.id);
                              return n;
                            })
                          }
                          className="h-4 w-4 rounded border-border"
                          aria-label={`Select order ${idShort}`}
                        />
                      </TableCell>

                      {/* Created At */}
                      <TableCell>
                        <div className="text-xs font-semibold">
                          {formatCreatedAt(o.created_at)}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          ID: {idShort}
                        </div>
                      </TableCell>

                      {/* Auto Call */}
                      <TableCell>
                        <CallDots count={o.call_attempt_count} />
                      </TableCell>

                      {/* Customer */}
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {phone ? (
                              <a
                                href={`tel:${phone}`}
                                className="font-semibold text-foreground hover:text-primary"
                              >
                                {phone}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">No phone</span>
                            )}
                            {phone && (
                              <>
                                <button
                                  onClick={() => copyToClipboard(phone, "Phone copied")}
                                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  aria-label="Copy phone"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                                <a
                                  href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded p-0.5 text-emerald-600 hover:bg-emerald-500/10"
                                  aria-label="WhatsApp"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                </a>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{customerName}</span>
                            {customerName !== "—" && (
                              <button
                                onClick={() => copyToClipboard(customerName, "Name copied")}
                                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label="Copy name"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          {cityLine && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{cityLine}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Note */}
                      <TableCell>
                        {o.admin_notes ? (
                          <div className="text-xs">
                            <div className="text-[10px] text-muted-foreground">
                              Updated {relativeShort(o.updated_at)}
                            </div>
                            <div className="mt-0.5 line-clamp-2 text-foreground">
                              {o.admin_notes.split("\n---\n").pop()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Order Items */}
                      <TableCell>
                        {firstItem ? (
                          <div className="flex items-center gap-2">
                            {firstItem.image ? (
                              <img
                                src={firstItem.image}
                                alt={firstItem.name}
                                className="h-10 w-10 flex-shrink-0 rounded border object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 flex-shrink-0 rounded border bg-muted" />
                            )}
                            <div className="min-w-0 text-xs">
                              <div className="truncate font-semibold">{firstItem.name}</div>
                              <div className="text-muted-foreground">
                                {firstItem.quantity}x · {formatBDT(Number(firstItem.price))}
                              </div>
                              {moreCount > 0 && (
                                <div className="text-[10px] font-semibold text-primary">
                                  +{moreCount} more
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No items</span>
                        )}
                      </TableCell>

                      {/* Success Rate (BD Courier) */}
                      <TableCell>
                        {total > 0 ? (
                          <div
                            className="flex items-center gap-2"
                            title={
                              isCourierSource
                                ? "BD Courier history (Pathao + Steadfast + RedX + Paperfly)"
                                : "Internal delivery stats"
                            }
                          >
                            <SuccessRing rate={successRate} />
                            <div className="space-y-0.5 text-[10px] leading-tight">
                              <div className="font-semibold text-emerald-600">
                                Success: {Math.round(successRate)}%
                              </div>
                              <div className="text-muted-foreground">
                                Order: {delivered}/{total}
                              </div>
                              {cancelled > 0 && (
                                <div className="text-rose-500">
                                  Cancel: {cancelled}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : cleanPhone ? (
                          <Badge variant="outline" className="text-[10px]">
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Loading...
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            New customer
                          </Badge>
                        )}
                      </TableCell>

                      {/* Tags */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(o.order_tags ?? []).map((t) => (
                            <Badge
                              key={t}
                              variant="secondary"
                              className="text-[10px] font-medium"
                            >
                              {t}
                            </Badge>
                          ))}
                          {(o.order_tags ?? []).length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Site */}
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          Main
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="default">
                          <Link
                            to="/admin/web-orders/$orderId"
                            params={{ orderId: o.id }}
                          >
                            Open <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination footer */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs">
            <div className="text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span> of{" "}
              <span className="font-semibold text-foreground">{totalPages}</span> ·{" "}
              <span className="font-semibold text-foreground">{filtered.length}</span> orders
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Rows per page:</Label>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                >
                  <SelectTrigger className="h-7 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject order</DialogTitle>
            <DialogDescription>Select reason for rejection.</DialogDescription>
          </DialogHeader>
          <Select value={rejectReason} onValueChange={setRejectReason}>
            <SelectTrigger>
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer_cancelled">Customer cancelled</SelectItem>
              <SelectItem value="out_of_stock">Out of stock</SelectItem>
              <SelectItem value="wrong_address">Wrong address</SelectItem>
              <SelectItem value="price_mismatch">Price mismatch</SelectItem>
              <SelectItem value="duplicate">Duplicate order</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason}
              onClick={() => {
                if (rejectFor) rejectOrder.mutate({ id: rejectFor, reason: rejectReason });
                setRejectFor(null);
              }}
            >
              Reject order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fake dialog */}
      <Dialog open={!!fakeFor} onOpenChange={(o) => !o && setFakeFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Mark as FAKE
            </DialogTitle>
            <DialogDescription>
              This will flag the customer. Type <strong>FAKE</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder='Type "FAKE"'
            value={fakeConfirm}
            onChange={(e) => setFakeConfirm(e.target.value)}
          />
          <Textarea
            placeholder="Reason (required)"
            value={fakeReason}
            onChange={(e) => setFakeReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFakeFor(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={fakeConfirm !== "FAKE" || !fakeReason}
              onClick={() => {
                if (fakeFor) markFake.mutate({ id: fakeFor, reason: fakeReason });
                setFakeFor(null);
              }}
            >
              Mark fake
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hold dialog */}
      <Dialog open={!!holdFor} onOpenChange={(o) => !o && setHoldFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Put order on hold</DialogTitle>
          </DialogHeader>
          <Select value={holdReason} onValueChange={setHoldReason}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="waiting_for_stock">Waiting for stock</SelectItem>
              <SelectItem value="customer_delay">Customer delay</SelectItem>
              <SelectItem value="address_verification">Address verification</SelectItem>
              <SelectItem value="price_negotiation">Price negotiation</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (holdFor)
                  updateOrderField.mutate({
                    id: holdFor,
                    patch: {
                      confirmation_status: "on_hold" as ConfirmationStatus,
                      hold_reason: holdReason,
                    },
                  });
                setHoldFor(null);
              }}
            >
              Hold order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance payment dialog */}
      <Dialog open={!!advanceFor} onOpenChange={(o) => !o && setAdvanceFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record advance payment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Amount (৳)</Label>
              <Input
                type="number"
                value={advance.amount}
                onChange={(e) => setAdvance({ ...advance, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select
                value={advance.method}
                onValueChange={(v) => setAdvance({ ...advance, method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction ID</Label>
              <Input
                value={advance.txn}
                onChange={(e) => setAdvance({ ...advance, txn: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceFor(null)}>
              Cancel
            </Button>
            <Button
              disabled={!advance.amount || !advance.txn}
              onClick={() => {
                if (advanceFor)
                  updateOrderField.mutate({
                    id: advanceFor,
                    patch: {
                      confirmation_status: "advance_pending" as ConfirmationStatus,
                      advance_payment_amount: Number(advance.amount),
                      advance_payment_method: advance.method,
                      advance_payment_txn_id: advance.txn,
                    },
                  });
                setAdvanceFor(null);
              }}
            >
              Save advance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk add tag dialog */}
      <Dialog open={bulkTagOpen} onOpenChange={setBulkTagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add tag to {selected.size} orders</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Tag name (e.g. priority, vip)"
            value={bulkTagValue}
            onChange={(e) => setBulkTagValue(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkTagOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!bulkTagValue.trim()}
              onClick={() => {
                bulkAddTag.mutate({
                  ids: Array.from(selected),
                  tag: bulkTagValue.trim(),
                });
                setBulkTagOpen(false);
                setBulkTagValue("");
              }}
            >
              Add tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
