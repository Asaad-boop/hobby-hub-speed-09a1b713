import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Phone,
  PhoneCall,
  Eye,
  CheckCircle2,
  XCircle,
  Ban,
  Pause,
  CreditCard,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  Loader2,
  AlertTriangle,
  MessageSquareWarning,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAdminAuth } from "@/lib/admin";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type CallStatus = Database["public"]["Enums"]["call_status"];
type ConfirmationStatus = Database["public"]["Enums"]["confirmation_status"];

export const Route = createFileRoute("/admin/web-orders")({
  head: () => ({
    meta: [
      { title: "Web Orders — Verification Queue" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: WebOrdersPage,
});

const TABS = [
  { id: "processing", label: "🔴 Processing", color: "text-red-600" },
  { id: "no_response_soft", label: "⏳ Good but No Response", color: "text-amber-600" },
  { id: "no_response", label: "📵 No Response", color: "text-orange-600" },
  { id: "advance", label: "💳 Advance Payment", color: "text-violet-600" },
  { id: "hold", label: "⏸️ On Hold", color: "text-slate-600" },
  { id: "complete", label: "✅ Complete", color: "text-emerald-600" },
  { id: "cancel", label: "❌ Cancel", color: "text-destructive" },
  { id: "all", label: "📋 All (7d)", color: "text-foreground" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function CallDots({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} call attempts`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i < count ? "bg-primary" : "bg-muted"}`}
        />
      ))}
    </div>
  );
}

function CallStatusBadge({ status }: { status: CallStatus }) {
  const meta: Record<CallStatus, { label: string; cls: string }> = {
    not_called: { label: "Not called", cls: "bg-muted text-muted-foreground" },
    attempting: { label: "Attempting", cls: "bg-amber-500/10 text-amber-700" },
    reached: { label: "Reached", cls: "bg-sky-500/10 text-sky-700" },
    no_response: { label: "No response", cls: "bg-orange-500/10 text-orange-700" },
    wrong_number: { label: "Wrong number", cls: "bg-rose-500/10 text-rose-700" },
    customer_confirmed: { label: "Confirmed", cls: "bg-emerald-500/10 text-emerald-700" },
    customer_cancelled: { label: "Cancelled", cls: "bg-destructive/10 text-destructive" },
    needs_followup: { label: "Follow-up", cls: "bg-violet-500/10 text-violet-700" },
  };
  const m = meta[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${m.cls}`}>
      {m.label}
    </span>
  );
}

function WebOrdersPage() {
  const { user, hasRole, loading: authLoading } = useAdminAuth();
  const allowed = hasRole(["admin", "customer_service"]);
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabId>("processing");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
              description: `${newOrder.shipping_name ?? newOrder.guest_name ?? "Customer"} • ৳${Number(newOrder.total).toLocaleString()}`,
            });
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [allowed, soundOn, queryClient]);

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery({
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

  const today = new Date().toISOString().slice(0, 10);

  const counts = useMemo(() => {
    const c: Record<TabId, number> = {
      processing: 0,
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
      if (o.status === "new" && o.confirmation_status === "pending" && o.call_attempt_count < 2) c.processing++;
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
      if (o.confirmation_status === "confirmed" && o.confirmed_at?.slice(0, 10) === today)
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
          (o) => o.status === "new" && o.confirmation_status === "pending" && o.call_attempt_count < 2,
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
          (o) => ["no_response", "wrong_number"].includes(o.call_status) || o.call_attempt_count >= 3,
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
          (o) => o.confirmation_status === "confirmed" && o.confirmed_at?.slice(0, 10) === today,
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

  // Mutations
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
      toast.success(`Order #${id.slice(0, 8).toUpperCase()} confirmed → Order List`);
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
      // Bump cancellation_count
      const { data: o } = await supabase.from("orders").select("user_id").eq("id", id).single();
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
      const { data: o } = await supabase.from("orders").select("user_id").eq("id", id).single();
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
      queryClient.invalidateQueries({ queryKey: ["web-order", openOrderId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Reject/fake/hold/advance dialogs
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [fakeFor, setFakeFor] = useState<string | null>(null);
  const [fakeConfirm, setFakeConfirm] = useState("");
  const [fakeReason, setFakeReason] = useState("");
  const [holdFor, setHoldFor] = useState<string | null>(null);
  const [holdReason, setHoldReason] = useState("waiting_for_stock");
  const [advanceFor, setAdvanceFor] = useState<string | null>(null);
  const [advance, setAdvance] = useState({ amount: "", method: "bkash", txn: "" });

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Web Orders — Verification Queue</h1>
          <p className="text-sm text-muted-foreground">
            Pending: <span className="font-semibold text-foreground">{counts.processing}</span> · Confirmed today:{" "}
            <span className="font-semibold text-emerald-600">{counts.complete}</span> · Cancelled:{" "}
            <span className="font-semibold text-destructive">{counts.cancel}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
            <Switch id="auto" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label htmlFor="auto" className="text-xs font-semibold">Auto-refresh</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSoundOn((v) => !v)}>
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSelected(new Set());
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {t.label} <span className="ml-1 opacity-70">({counts[t.id]})</span>
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
          placeholder="Search by Order ID, phone, name…"
          className="pl-9"
        />
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="sticky top-14 z-10 flex items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-semibold">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                for (const id of selected) await confirmOrder.mutateAsync(id);
                setSelected(new Set());
              }}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" /> Bulk Confirm
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Cards */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Ei tab e kono order nei.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              selected={selected.has(o.id)}
              onToggleSelect={() =>
                setSelected((s) => {
                  const n = new Set(s);
                  if (n.has(o.id)) n.delete(o.id);
                  else n.add(o.id);
                  return n;
                })
              }
              onView={() => setOpenOrderId(o.id)}
              onConfirm={() => confirmOrder.mutate(o.id)}
              onReject={() => {
                setRejectFor(o.id);
                setRejectReason("");
              }}
              onFake={() => {
                setFakeFor(o.id);
                setFakeConfirm("");
                setFakeReason("");
              }}
              onHold={() => {
                setHoldFor(o.id);
                setHoldReason("waiting_for_stock");
              }}
              onAdvance={() => {
                setAdvanceFor(o.id);
                setAdvance({ amount: "", method: "bkash", txn: "" });
              }}
            />
          ))}
        </div>
      )}

      {/* Detail drawer */}
      <OrderDetailDrawer
        orderId={openOrderId}
        onClose={() => setOpenOrderId(null)}
        onConfirm={() => openOrderId && confirmOrder.mutate(openOrderId)}
        onUpdateField={(patch) =>
          openOrderId && updateOrderField.mutate({ id: openOrderId, patch })
        }
      />

      {/* Reject dialog */}
      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject order</DialogTitle>
            <DialogDescription>Select reason for rejection.</DialogDescription>
          </DialogHeader>
          <Select value={rejectReason} onValueChange={setRejectReason}>
            <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
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
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
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

      {/* Fake dialog with strong confirm */}
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
            <Button variant="outline" onClick={() => setFakeFor(null)}>Cancel</Button>
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
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="waiting_for_stock">Waiting for stock</SelectItem>
              <SelectItem value="customer_delay">Customer delay</SelectItem>
              <SelectItem value="address_verification">Address verification</SelectItem>
              <SelectItem value="price_negotiation">Price negotiation</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldFor(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (holdFor)
                  updateOrderField.mutate({
                    id: holdFor,
                    patch: { confirmation_status: "on_hold" as ConfirmationStatus, hold_reason: holdReason },
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Button variant="outline" onClick={() => setAdvanceFor(null)}>Cancel</Button>
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
    </div>
  );
}

function OrderCard({
  order,
  selected,
  onToggleSelect,
  onView,
  onConfirm,
  onReject,
  onFake,
  onHold,
  onAdvance,
}: {
  order: Order;
  selected: boolean;
  onToggleSelect: () => void;
  onView: () => void;
  onConfirm: () => void;
  onReject: () => void;
  onFake: () => void;
  onHold: () => void;
  onAdvance: () => void;
}) {
  const customerName = order.shipping_name ?? order.guest_name ?? "—";
  const phone = order.shipping_phone ?? order.guest_phone ?? "";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-primary/40">
      <div className="flex items-start gap-3 p-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 h-4 w-4 rounded border-border"
        />
        <div className="grid flex-1 gap-3 md:grid-cols-3">
          {/* Left: order info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold">#{order.id.slice(0, 8).toUpperCase()}</span>
              {order.is_guest_order && (
                <Badge variant="outline" className="text-[9px]">Guest</Badge>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold">{customerName}</p>
            <p className="text-xs text-muted-foreground">{relativeTime(order.created_at)}</p>
          </div>

          {/* Center: total + city */}
          <div className="text-sm">
            <p className="text-lg font-extrabold text-primary">৳{Number(order.total).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {order.shipping_city ?? "—"}
              {order.shipping_district ? `, ${order.shipping_district}` : ""}
            </p>
            {order.payment_method && (
              <Badge variant="outline" className="mt-1 text-[10px] uppercase">
                {order.payment_method}
              </Badge>
            )}
          </div>

          {/* Right: phone + call info */}
          <div className="space-y-1.5">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2 text-base font-bold text-primary hover:underline"
              >
                <Phone className="h-4 w-4" />
                {phone}
              </a>
            )}
            <div className="flex items-center gap-2">
              <CallStatusBadge status={order.call_status} />
              <CallDots count={order.call_attempt_count} />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-border bg-muted/30 px-4 py-2">
        {phone && (
          <Button asChild size="sm" variant="outline">
            <a href={`tel:${phone}`}>
              <PhoneCall className="mr-1 h-3.5 w-3.5" /> Call
            </a>
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onView}>
          <Eye className="mr-1 h-3.5 w-3.5" /> Details
        </Button>
        <Button size="sm" onClick={onConfirm}>
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Confirm
        </Button>
        <Button size="sm" variant="outline" onClick={onAdvance}>
          <CreditCard className="mr-1 h-3.5 w-3.5" /> Advance
        </Button>
        <Button size="sm" variant="outline" onClick={onHold}>
          <Pause className="mr-1 h-3.5 w-3.5" /> Hold
        </Button>
        <Button size="sm" variant="destructive" onClick={onReject}>
          <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
        </Button>
        <Button size="sm" variant="destructive" className="opacity-90" onClick={onFake}>
          <Ban className="mr-1 h-3.5 w-3.5" /> Fake
        </Button>
      </div>
    </div>
  );
}

function OrderDetailDrawer({
  orderId,
  onClose,
  onConfirm,
  onUpdateField,
}: {
  orderId: string | null;
  onClose: () => void;
  onConfirm: () => void;
  onUpdateField: (patch: Partial<Order>) => void;
}) {
  const { user } = useAdminAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["web-order", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).single(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
      ]);
      if (orderRes.error) throw orderRes.error;
      if (itemsRes.error) throw itemsRes.error;
      const order = orderRes.data as Order;

      let profile: { fake_order_count: number; cancellation_count: number; is_flagged: boolean } | null = null;
      let prevOrders = 0;
      if (order.user_id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("fake_order_count, cancellation_count, is_flagged")
          .eq("id", order.user_id)
          .maybeSingle();
        profile = p;
        const { count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", order.user_id);
        prevOrders = count ?? 0;
      }

      // Stock check
      const items = (itemsRes.data ?? []) as OrderItem[];
      const productIds = [...new Set(items.map((i) => i.product_id))];
      const stockMap = new Map<string, number>();
      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from("products")
          .select("id, stock")
          .in("id", productIds);
        for (const p of prods ?? []) stockMap.set(p.id, p.stock);
      }
      return { order, items, profile, prevOrders, stockMap };
    },
    enabled: !!orderId,
  });

  const [note, setNote] = useState("");
  useEffect(() => {
    setNote(data?.order.admin_notes ?? "");
  }, [data?.order.admin_notes]);

  const recordCall = (status: CallStatus) => {
    if (!data) return;
    onUpdateField({
      call_status: status,
      call_attempt_count: data.order.call_attempt_count + 1,
      last_call_at: new Date().toISOString(),
      last_called_by: user?.id ?? null,
    });
    toast.success("Call attempt recorded");
  };

  return (
    <Sheet open={!!orderId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Order details</SheetTitle>
          <SheetDescription>
            {orderId ? <span className="font-mono text-xs">#{orderId.slice(0, 8).toUpperCase()}</span> : null}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !data ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-4 space-y-5 pb-24">
            {/* Customer */}
            <section className="rounded-xl border border-border bg-muted/30 p-3">
              <h3 className="mb-2 text-sm font-bold">Customer</h3>
              <p className="text-sm font-semibold">
                {data.order.shipping_name ?? data.order.guest_name ?? "—"}
              </p>
              <a
                href={`tel:${data.order.shipping_phone ?? data.order.guest_phone ?? ""}`}
                className="text-sm text-primary"
              >
                {data.order.shipping_phone ?? data.order.guest_phone ?? "—"}
              </a>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.order.shipping_address}
                {data.order.shipping_city ? `, ${data.order.shipping_city}` : ""}
                {data.order.shipping_district ? `, ${data.order.shipping_district}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <span>Previous orders: <strong>{data.prevOrders}</strong></span>
                {data.profile && (
                  <>
                    <span>Cancellations: <strong>{data.profile.cancellation_count}</strong></span>
                    {data.profile.fake_order_count > 0 && (
                      <span className="font-bold text-destructive">
                        Fake orders: {data.profile.fake_order_count}
                      </span>
                    )}
                    {data.profile.is_flagged && (
                      <Badge variant="destructive" className="text-[10px]">
                        <MessageSquareWarning className="mr-1 h-3 w-3" /> Flagged
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Items + stock */}
            <section>
              <h3 className="mb-2 text-sm font-bold">Items ({data.items.length})</h3>
              <div className="space-y-2">
                {data.items.map((it) => {
                  const stock = data.stockMap.get(it.product_id) ?? 0;
                  const insufficient = stock < it.quantity;
                  return (
                    <div
                      key={it.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-background p-2"
                    >
                      {it.image && (
                        <img src={it.image} alt={it.name} className="h-12 w-12 rounded object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{it.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ৳{Number(it.price).toLocaleString()} × {it.quantity}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${insufficient ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700"}`}
                      >
                        Stock: {stock}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Call log */}
            <section>
              <h3 className="mb-2 text-sm font-bold">Call activity</h3>
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span>Attempts: <strong>{data.order.call_attempt_count}</strong></span>
                  <CallStatusBadge status={data.order.call_status} />
                </div>
                {data.order.last_call_at && (
                  <p className="mt-1 text-muted-foreground">
                    Last: {new Date(data.order.last_call_at).toLocaleString("en-GB")}
                  </p>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["reached", "no_response", "wrong_number", "needs_followup"] as CallStatus[]).map((s) => (
                  <Button key={s} size="sm" variant="outline" onClick={() => recordCall(s)}>
                    + {s.replace(/_/g, " ")}
                  </Button>
                ))}
              </div>
            </section>

            {/* Admin notes */}
            <section>
              <h3 className="mb-2 text-sm font-bold">Admin notes</h3>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Internal notes about this order…"
              />
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => onUpdateField({ admin_notes: note })}
              >
                Save note
              </Button>
            </section>

            {/* Sticky actions */}
            <div className="sticky bottom-0 -mx-6 border-t border-border bg-background p-3">
              <div className="flex gap-2">
                <Button className="flex-1" onClick={onConfirm}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Confirm order
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
