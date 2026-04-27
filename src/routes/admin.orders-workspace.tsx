import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Phone,
  Copy,
  CheckCircle2,
  XCircle,
  Truck,
  Search,
  Loader2,
  AlertTriangle,
  Flame,
  Keyboard,
  StickyNote,
  ChevronDown,
} from "lucide-react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/lib/admin";

const supabase = supabaseTyped as any;

export const Route = createFileRoute("/admin/orders-workspace")({
  head: () => ({
    meta: [
      { title: "Orders Workspace — COD ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrdersWorkspacePage,
});

// ============================================================
// Types
// ============================================================

type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  confirmation_status: string;
  call_status: string;
  total: number;
  subtotal: number;
  payment_method: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_district: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  is_guest_order: boolean;
  user_id: string | null;
  admin_notes: string | null;
  cancellation_reason: string | null;
  delivery_method: string | null;
  source_website: string | null;
  order_items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
};

type TabId =
  | "new"
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "all";

const TABS: { id: TabId; label: string; hotkey?: string }[] = [
  { id: "new", label: "New" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
];

const COURIERS = ["pathao", "steadfast", "redx", "sundarban"] as const;

const CANCEL_REASONS = [
  "Customer changed mind",
  "Wrong number / unreachable",
  "Out of stock",
  "Address not deliverable",
  "Duplicate order",
  "Fake order",
  "Other",
];

function fmtBDT(v: number) {
  return `৳${Number(v || 0).toLocaleString("en-IN")}`;
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// Map UI tab -> DB filter on orders
function applyTabFilter(qb: any, tab: TabId) {
  switch (tab) {
    case "new":
      return qb.eq("status", "new");
    case "pending":
      return qb.eq("confirmation_status", "pending").in("status", ["new", "on_hold"]);
    case "confirmed":
      return qb.in("status", ["confirmed", "packaging", "packed", "ready_to_ship"]);
    case "shipped":
      return qb.in("status", ["shipped", "in_transit"]);
    case "delivered":
      return qb.in("status", ["delivered", "partial_delivered"]);
    case "cancelled":
      return qb.in("status", ["cancelled", "fake", "returned"]);
    default:
      return qb;
  }
}

// ============================================================
// Page
// ============================================================

function OrdersWorkspacePage() {
  const qc = useQueryClient();
  const { hasRole } = useAdminAuth();
  const canManage = hasRole(["admin", "customer_service", "operations"]);

  const [tab, setTab] = useState<TabId>("new");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(0);
  const [shipDialog, setShipDialog] = useState<{ open: boolean; orderId?: string }>({ open: false });
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; orderId?: string; bulk?: boolean }>({ open: false });
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const ordersQuery = useQuery({
    queryKey: ["orders-workspace", tab, debouncedSearch],
    queryFn: async () => {
      let qb = supabase
        .from("orders")
        .select(
          "id,created_at,status,confirmation_status,call_status,total,subtotal,payment_method,shipping_name,shipping_phone,shipping_address,shipping_city,shipping_district,guest_name,guest_phone,is_guest_order,user_id,admin_notes,cancellation_reason,delivery_method,source_website,order_items(id,name,quantity,price)"
        )
        .order("created_at", { ascending: false })
        .limit(200);

      qb = applyTabFilter(qb, tab);

      if (debouncedSearch) {
        const s = debouncedSearch.replace(/[%,]/g, "");
        // Search in name, phone, id (id needs prefix match)
        qb = qb.or(
          `shipping_name.ilike.%${s}%,shipping_phone.ilike.%${s}%,guest_name.ilike.%${s}%,guest_phone.ilike.%${s}%`
        );
      }

      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
    refetchInterval: 30_000,
  });

  // Realtime subscribe
  useEffect(() => {
    const ch = supabase
      .channel("orders-workspace")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => qc.invalidateQueries({ queryKey: ["orders-workspace"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const orders = ordersQuery.data ?? [];

  // Compute risk + duplicate flags
  const phoneCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const p = o.shipping_phone || o.guest_phone;
      if (!p) continue;
      if (
        o.status === "new" ||
        (o.confirmation_status === "pending" && ["new", "on_hold"].includes(o.status))
      ) {
        map.set(p, (map.get(p) ?? 0) + 1);
      }
    }
    return map;
  }, [orders]);

  // Fetch profile flags for visible authenticated orders
  const userIds = useMemo(
    () => Array.from(new Set(orders.map((o) => o.user_id).filter((x): x is string => !!x))),
    [orders],
  );

  const profilesQuery = useQuery({
    queryKey: ["orders-workspace", "profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,is_flagged,cancellation_count,fake_order_count")
        .in("id", userIds);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        is_flagged: boolean;
        cancellation_count: number;
        fake_order_count: number;
      }>;
    },
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, { risky: boolean }>();
    for (const p of profilesQuery.data ?? []) {
      m.set(p.id, {
        risky: p.is_flagged || p.cancellation_count > 2 || p.fake_order_count > 0,
      });
    }
    return m;
  }, [profilesQuery.data]);

  function isDuplicate(o: OrderRow) {
    const p = o.shipping_phone || o.guest_phone;
    return !!(p && (phoneCounts.get(p) ?? 0) > 1);
  }
  function isRisky(o: OrderRow) {
    if (o.user_id) return profileMap.get(o.user_id)?.risky ?? false;
    return false;
  }

  // ============================================================
  // Mutations
  // ============================================================

  const confirmMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "confirmed",
          confirmation_status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .in("id", orderIds);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      toast.success(`${ids.length} order${ids.length > 1 ? "s" : ""} confirmed`);
      qc.invalidateQueries({ queryKey: ["orders-workspace"] });
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to confirm"),
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          confirmation_status: "rejected",
          cancellation_reason: reason,
          rejection_reason: reason,
        })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`${v.ids.length} order${v.ids.length > 1 ? "s" : ""} cancelled`);
      qc.invalidateQueries({ queryKey: ["orders-workspace"] });
      setSelected(new Set());
      setCancelDialog({ open: false });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to cancel"),
  });

  const shipMutation = useMutation({
    mutationFn: async ({
      orderId,
      courier,
      tracking,
    }: {
      orderId: string;
      courier: string;
      tracking: string;
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "shipped",
          shipped_at: new Date().toISOString(),
          delivery_method: courier,
          admin_notes: tracking ? `Tracking: ${tracking}` : null,
        })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order shipped");
      qc.invalidateQueries({ queryKey: ["orders-workspace"] });
      setShipDialog({ open: false });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to ship"),
  });

  const inlineUpdateMutation = useMutation({
    mutationFn: async ({
      orderId,
      patch,
    }: {
      orderId: string;
      patch: Partial<OrderRow>;
    }) => {
      const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders-workspace"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  // ============================================================
  // Keyboard shortcuts
  // ============================================================

  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      const list = ordersRef.current;
      if (!list.length && !["?", "/"].includes(e.key)) return;
      const cur = cursorRef.current;
      const order = list[cur];

      switch (e.key.toLowerCase()) {
        case "j":
          e.preventDefault();
          setCursor((c) => Math.min(list.length - 1, c + 1));
          break;
        case "k":
          e.preventDefault();
          setCursor((c) => Math.max(0, c - 1));
          break;
        case "c":
          if (order && canManage && order.status === "new") {
            e.preventDefault();
            confirmMutation.mutate([order.id]);
          }
          break;
        case "x":
          if (order && canManage) {
            e.preventDefault();
            setCancelDialog({ open: true, orderId: order.id });
          }
          break;
        case "s":
          if (order && canManage && ["confirmed", "packaging", "packed", "ready_to_ship"].includes(order.status)) {
            e.preventDefault();
            setShipDialog({ open: true, orderId: order.id });
          }
          break;
        case "?":
          e.preventDefault();
          setShowHelp(true);
          break;
        case "/":
          e.preventDefault();
          document.getElementById("ow-search")?.focus();
          break;
        case "x".toUpperCase():
          break;
      }
      // Space to toggle select
      if (e.key === " " && order) {
        e.preventDefault();
        toggleSelect(order.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canManage, confirmMutation]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (selected.size === orders.length) setSelected(new Set());
    else setSelected(new Set(orders.map((o) => o.id)));
  }

  function copyPhone(phone: string) {
    navigator.clipboard.writeText(phone).then(
      () => toast.success(`Copied ${phone}`),
      () => toast.error("Copy failed"),
    );
  }

  // ============================================================
  // Render
  // ============================================================

  const stats = useMemo(() => {
    return {
      total: orders.length,
      duplicates: orders.filter(isDuplicate).length,
      risky: orders.filter(isRisky).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, phoneCounts, profileMap]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-background px-3 py-2">
        <h1 className="text-base font-bold">Orders Workspace</h1>
        <Badge variant="outline" className="font-mono text-[10px]">
          {stats.total} loaded
        </Badge>
        {stats.duplicates > 0 && (
          <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
            {stats.duplicates} duplicate
          </Badge>
        )}
        {stats.risky > 0 && (
          <Badge variant="destructive">{stats.risky} risky</Badge>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="ow-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, phone, ID  (press / )"
              className="h-8 w-72 pl-7 text-xs"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={() => setShowHelp(true)}
          >
            <Keyboard className="h-3.5 w-3.5" /> ?
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setCursor(0);
              setSelected(new Set());
            }}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && canManage && (
        <div className="flex items-center gap-2 border-b bg-primary/5 px-3 py-1.5 text-xs">
          <span className="font-semibold">{selected.size} selected</span>
          <Button
            size="sm"
            variant="default"
            className="h-7 gap-1"
            onClick={() => confirmMutation.mutate(Array.from(selected))}
            disabled={confirmMutation.isPending}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Bulk confirm
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 gap-1"
            onClick={() => setCancelDialog({ open: true, bulk: true })}
          >
            <XCircle className="h-3.5 w-3.5" /> Bulk cancel
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-7"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {ordersQuery.isLoading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No orders.
          </div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr className="h-9 border-b">
                <th className="w-8 px-2">
                  <Checkbox
                    checked={selected.size === orders.length && orders.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="w-10 px-1 text-left font-medium text-muted-foreground">#</th>
                <th className="w-24 px-2 text-left font-medium text-muted-foreground">Order</th>
                <th className="px-2 text-left font-medium text-muted-foreground">Customer</th>
                <th className="w-32 px-2 text-left font-medium text-muted-foreground">Phone</th>
                <th className="px-2 text-left font-medium text-muted-foreground">Address</th>
                <th className="px-2 text-left font-medium text-muted-foreground">Products</th>
                <th className="w-20 px-2 text-right font-medium text-muted-foreground">Amount</th>
                <th className="w-20 px-2 text-left font-medium text-muted-foreground">Pay</th>
                <th className="w-24 px-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="sticky right-0 z-20 w-44 bg-muted/80 px-2 text-center font-medium text-muted-foreground backdrop-blur">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, idx) => {
                const phone = o.shipping_phone || o.guest_phone || "";
                const name = o.shipping_name || o.guest_name || "—";
                const dup = isDuplicate(o);
                const risky = isRisky(o);
                const isSelected = selected.has(o.id);
                const isCursor = cursor === idx;
                return (
                  <OrderRowView
                    key={o.id}
                    order={o}
                    idx={idx}
                    name={name}
                    phone={phone}
                    duplicate={dup}
                    risky={risky}
                    selected={isSelected}
                    isCursor={isCursor}
                    canManage={canManage}
                    onSelectToggle={() => toggleSelect(o.id)}
                    onCursor={() => setCursor(idx)}
                    onCopyPhone={() => copyPhone(phone)}
                    onConfirm={() => confirmMutation.mutate([o.id])}
                    onCancel={() => setCancelDialog({ open: true, orderId: o.id })}
                    onShip={() => setShipDialog({ open: true, orderId: o.id })}
                    onSavePatch={(patch) =>
                      inlineUpdateMutation.mutate({ orderId: o.id, patch })
                    }
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Ship dialog */}
      <ShipDialog
        open={shipDialog.open}
        onOpenChange={(open) => setShipDialog({ open, orderId: shipDialog.orderId })}
        onSubmit={(courier, tracking) =>
          shipDialog.orderId &&
          shipMutation.mutate({ orderId: shipDialog.orderId, courier, tracking })
        }
        pending={shipMutation.isPending}
      />

      {/* Cancel dialog */}
      <CancelDialog
        open={cancelDialog.open}
        bulk={!!cancelDialog.bulk}
        count={cancelDialog.bulk ? selected.size : 1}
        onOpenChange={(open) => setCancelDialog({ open })}
        onSubmit={(reason) => {
          const ids = cancelDialog.bulk
            ? Array.from(selected)
            : cancelDialog.orderId
              ? [cancelDialog.orderId]
              : [];
          if (ids.length) cancelMutation.mutate({ ids, reason });
        }}
        pending={cancelMutation.isPending}
      />

      {/* Help */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>Move at the speed of typing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 text-sm">
            <ShortcutRow keys={["J"]} label="Move down" />
            <ShortcutRow keys={["K"]} label="Move up" />
            <ShortcutRow keys={["C"]} label="Confirm focused order" />
            <ShortcutRow keys={["X"]} label="Cancel focused order" />
            <ShortcutRow keys={["S"]} label="Ship focused order" />
            <ShortcutRow keys={["Space"]} label="Toggle select" />
            <ShortcutRow keys={["/"]} label="Focus search" />
            <ShortcutRow keys={["?"]} label="Show this help" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Row component
// ============================================================

function OrderRowView({
  order,
  idx,
  name,
  phone,
  duplicate,
  risky,
  selected,
  isCursor,
  canManage,
  onSelectToggle,
  onCursor,
  onCopyPhone,
  onConfirm,
  onCancel,
  onShip,
  onSavePatch,
}: {
  order: OrderRow;
  idx: number;
  name: string;
  phone: string;
  duplicate: boolean;
  risky: boolean;
  selected: boolean;
  isCursor: boolean;
  canManage: boolean;
  onSelectToggle: () => void;
  onCursor: () => void;
  onCopyPhone: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onShip: () => void;
  onSavePatch: (patch: Partial<OrderRow>) => void;
}) {
  const productSummary = useMemo(() => {
    const items = order.order_items ?? [];
    if (!items.length) return "—";
    const first = items[0];
    const more = items.length - 1;
    return `${first.name} ×${first.quantity}${more > 0 ? ` +${more}` : ""}`;
  }, [order.order_items]);

  const canShip = ["confirmed", "packaging", "packed", "ready_to_ship"].includes(order.status);
  const canConfirm = order.status === "new";

  return (
    <tr
      onClick={onCursor}
      className={cn(
        "h-10 border-b border-border/60 text-xs transition-colors",
        risky && "bg-destructive/5",
        duplicate && !risky && "bg-amber-500/5",
        isCursor && "ring-1 ring-inset ring-primary/60",
        selected && "bg-primary/10",
        !risky && !duplicate && "hover:bg-muted/40",
      )}
    >
      <td className="px-2" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onSelectToggle} />
      </td>
      <td className="px-1 text-muted-foreground">{idx + 1}</td>
      <td className="px-2">
        <div className="font-mono text-[11px] font-semibold">#{shortId(order.id)}</div>
        <div className="text-[10px] text-muted-foreground">{fmtTime(order.created_at)}</div>
      </td>
      <td className="px-2">
        <InlineEdit
          value={name}
          disabled={!canManage}
          onSave={(v) =>
            onSavePatch(
              order.is_guest_order ? { guest_name: v } : { shipping_name: v },
            )
          }
        />
        <div className="flex items-center gap-1">
          {duplicate && (
            <Badge variant="outline" className="h-4 border-amber-500 px-1 text-[9px] text-amber-700 dark:text-amber-400">
              <Flame className="mr-0.5 h-2.5 w-2.5" /> DUP
            </Badge>
          )}
          {risky && (
            <Badge variant="destructive" className="h-4 px-1 text-[9px]">
              <AlertTriangle className="mr-0.5 h-2.5 w-2.5" /> RISK
            </Badge>
          )}
        </div>
      </td>
      <td className="px-2 font-mono text-[11px]" onClick={(e) => e.stopPropagation()}>
        <InlineEdit
          value={phone}
          disabled={!canManage}
          onSave={(v) =>
            onSavePatch(
              order.is_guest_order ? { guest_phone: v } : { shipping_phone: v },
            )
          }
        />
      </td>
      <td className="px-2 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
        <InlineEdit
          value={`${order.shipping_address ?? ""}${order.shipping_city ? ", " + order.shipping_city : ""}`}
          disabled={!canManage}
          onSave={(v) => onSavePatch({ shipping_address: v })}
          className="line-clamp-1 max-w-[20ch]"
        />
      </td>
      <td className="px-2" title={productSummary}>
        <span className="line-clamp-1 max-w-[24ch]">{productSummary}</span>
      </td>
      <td className="px-2 text-right font-semibold">{fmtBDT(order.total)}</td>
      <td className="px-2">
        <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase">
          {order.payment_method ?? "cod"}
        </Badge>
      </td>
      <td className="px-2">
        <StatusBadge status={order.status} />
      </td>
      <td className="sticky right-0 z-10 bg-background px-2">
        <div
          className="flex items-center justify-end gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {phone && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title="Call"
                asChild
              >
                <a href={`tel:${phone}`} onClick={onCopyPhone}>
                  <Phone className="h-3.5 w-3.5" />
                </a>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title="Copy phone"
                onClick={onCopyPhone}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {canManage && canConfirm && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
              title="Confirm (C)"
              onClick={onConfirm}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
          {canManage && canShip && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-blue-600 hover:text-blue-700"
              title="Ship (S)"
              onClick={onShip}
            >
              <Truck className="h-4 w-4" />
            </Button>
          )}
          {canManage && order.status !== "cancelled" && order.status !== "delivered" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Cancel (X)"
              onClick={onCancel}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" title="More">
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Order #{shortId(order.id)}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <NoteEditor
                  current={order.admin_notes ?? ""}
                  onSave={(note) => onSavePatch({ admin_notes: note })}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </td>
    </tr>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    new: { label: "New", className: "bg-muted text-muted-foreground" },
    confirmed: { label: "Confirmed", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
    packaging: { label: "Packing", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
    packed: { label: "Packed", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
    ready_to_ship: { label: "Ready", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
    shipped: { label: "Shipped", className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
    in_transit: { label: "In transit", className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
    delivered: { label: "Delivered", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    partial_delivered: { label: "Partial", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    cancelled: { label: "Cancelled", className: "bg-destructive/15 text-destructive" },
    fake: { label: "Fake", className: "bg-destructive/15 text-destructive" },
    returned: { label: "Returned", className: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
    on_hold: { label: "On hold", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  };
  const cfg = map[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex h-5 items-center rounded px-1.5 text-[10px] font-semibold uppercase", cfg.className)}>
      {cfg.label}
    </span>
  );
}

function InlineEdit({
  value,
  onSave,
  disabled,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = useCallback(() => {
    setEditing(false);
    if (draft.trim() !== value.trim()) onSave(draft.trim());
  }, [draft, value, onSave]);

  if (disabled || !editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setEditing(true)}
        className={cn(
          "block w-full truncate text-left",
          !disabled && "cursor-text rounded px-0.5 hover:bg-muted",
          className,
        )}
        title={value}
      >
        {value || <span className="text-muted-foreground">—</span>}
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className="h-6 w-full rounded border border-input bg-background px-1 text-xs outline-none focus:border-primary"
    />
  );
}

function NoteEditor({
  current,
  onSave,
}: {
  current: string;
  onSave: (n: string) => void;
}) {
  const [val, setVal] = useState(current);
  return (
    <div className="space-y-2 px-2 py-2">
      <div className="flex items-center gap-1 text-xs font-medium">
        <StickyNote className="h-3.5 w-3.5" /> Note
      </div>
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        rows={3}
        className="w-full rounded border border-input bg-background p-1.5 text-xs"
        placeholder="Internal note…"
      />
      <Button
        size="sm"
        className="h-7 w-full"
        onClick={() => onSave(val.trim())}
      >
        Save note
      </Button>
    </div>
  );
}

function ShipDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (courier: string, tracking: string) => void;
  pending: boolean;
}) {
  const [courier, setCourier] = useState<string>("pathao");
  const [tracking, setTracking] = useState("");
  useEffect(() => {
    if (!open) {
      setCourier("pathao");
      setTracking("");
    }
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ship order</DialogTitle>
          <DialogDescription>Pick courier and (optionally) add a tracking ID.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Courier</label>
            <Select value={courier} onValueChange={setCourier}>
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COURIERS.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Tracking ID (optional)</label>
            <Input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="e.g. PT-12345"
              className="mt-1 h-9"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() => onSubmit(courier, tracking.trim())}
          >
            {pending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Ship
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  open,
  bulk,
  count,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  bulk: boolean;
  count: number;
  onOpenChange: (o: boolean) => void;
  onSubmit: (reason: string) => void;
  pending: boolean;
}) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [other, setOther] = useState("");
  useEffect(() => {
    if (!open) {
      setReason(CANCEL_REASONS[0]);
      setOther("");
    }
  }, [open]);
  const finalReason = reason === "Other" ? other.trim() : reason;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Cancel {bulk ? `${count} orders` : "order"}
          </DialogTitle>
          <DialogDescription>This sets status to cancelled.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CANCEL_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {reason === "Other" && (
            <Input
              autoFocus
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Reason"
              className="h-9"
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep
          </Button>
          <Button
            variant="destructive"
            disabled={pending || (reason === "Other" && !other.trim())}
            onClick={() => onSubmit(finalReason || "Cancelled")}
          >
            {pending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Cancel order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between rounded px-1 py-0.5">
      <span>{label}</span>
      <span className="flex gap-1">
        {keys.map((k) => (
          <kbd
            key={k}
            className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold shadow-sm"
          >
            {k}
          </kbd>
        ))}
      </span>
    </div>
  );
}
