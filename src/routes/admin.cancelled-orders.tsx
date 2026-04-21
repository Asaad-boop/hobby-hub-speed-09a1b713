import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { useAdminAuth } from "@/lib/admin";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export const Route = createFileRoute("/admin/cancelled-orders")({
  head: () => ({
    meta: [
      { title: "Cancelled Orders — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CancelledOrdersPage,
});

const TABS = [
  { id: "cancelled", label: "Cancelled" },
  { id: "fake", label: "Fake" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
] as const;

function CancelledOrdersPage() {
  const { isAdmin, loading } = useAdminAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("cancelled");
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["cancelled-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["cancelled", "fake"])
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Order[];
    },
    enabled: isAdmin,
  });

  const reasonStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const r = o.rejection_reason ?? o.cancellation_reason ?? "unspecified";
      map.set(r, (map.get(r) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [orders]);

  const filtered = useMemo(() => {
    let list = orders;
    if (tab === "cancelled") list = list.filter((o) => o.status === "cancelled");
    if (tab === "fake") list = list.filter((o) => o.status === "fake");
    if (tab === "rejected") list = list.filter((o) => o.confirmation_status === "rejected");
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.shipping_phone ?? "").includes(q) ||
        (o.shipping_name ?? "").toLowerCase().includes(q),
    );
  }, [orders, tab, search]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-lg font-bold">Admin only</h1>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Cancelled & Fake Orders</h1>
        <p className="text-sm text-muted-foreground">Track rejected orders and patterns.</p>
      </div>

      {/* Reason stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Total cancelled</p>
          <p className="mt-1 text-2xl font-bold">{orders.filter((o) => o.status === "cancelled").length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Total fake</p>
          <p className="mt-1 text-2xl font-bold text-destructive">
            {orders.filter((o) => o.status === "fake").length}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase text-muted-foreground">Top reason</p>
          <p className="mt-1 truncate text-base font-semibold">
            {reasonStats[0] ? `${reasonStats[0][0]} (${reasonStats[0][1]})` : "—"}
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="pl-9"
        />
      </div>

      <div className="rounded-2xl border border-border bg-background">
        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No matching records.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{o.shipping_name ?? o.guest_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{o.shipping_phone ?? o.guest_phone ?? ""}</p>
                  </TableCell>
                  <TableCell>৳{Number(o.total).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={o.status === "fake" ? "destructive" : "outline"}>
                      {o.status === "fake" && <AlertTriangle className="mr-1 h-3 w-3" />}
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{o.rejection_reason ?? o.cancellation_reason ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("en-GB")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
