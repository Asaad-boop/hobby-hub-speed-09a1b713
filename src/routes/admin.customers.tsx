import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Search,
  Download,
  Users,
  Phone,
  MapPin,
  ShoppingBag,
  TrendingUp,
  Calendar,
  ArrowLeft,
  Crown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/admin/customers")({
  head: () => ({ meta: [{ title: "Customers — Admin" }] }),
  component: CustomersPage,
});

type OrderLite = {
  id: string;
  user_id: string;
  status: string;
  total: number;
  created_at: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_city: string | null;
  shipping_district: string | null;
  shipping_address: string | null;
  payment_method: string | null;
};

type ProfileLite = {
  id: string;
  display_name: string | null;
  created_at: string;
};

type Customer = {
  user_id: string;
  display_name: string | null;
  joined_at: string | null;
  orders: number;
  total_spend: number;
  avg_order: number;
  last_order: string | null;
  first_order: string | null;
  last_status: string | null;
  last_phone: string | null;
  last_city: string | null;
  last_district: string | null;
  last_address: string | null;
  last_name: string | null;
};

const taka = (n: number) => `৳${Math.round(n).toLocaleString()}`;

function CustomersPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"spend" | "orders" | "recent" | "name">("spend");
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin_customers"],
    queryFn: async () => {
      const [ordersRes, profilesRes] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id,user_id,status,total,created_at,shipping_name,shipping_phone,shipping_city,shipping_district,shipping_address,payment_method"
          )
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,display_name,created_at"),
      ]);
      if (ordersRes.error) throw ordersRes.error;
      if (profilesRes.error) throw profilesRes.error;
      return {
        orders: (ordersRes.data ?? []) as OrderLite[],
        profiles: (profilesRes.data ?? []) as ProfileLite[],
      };
    },
    staleTime: 60_000,
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileLite>();
    (data?.profiles ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [data]);

  const customers = useMemo<Customer[]>(() => {
    const orders = data?.orders ?? [];
    const map = new Map<string, OrderLite[]>();
    for (const o of orders) {
      const list = map.get(o.user_id) ?? [];
      list.push(o);
      map.set(o.user_id, list);
    }
    // Include profiles that may have zero orders too
    for (const p of data?.profiles ?? []) {
      if (!map.has(p.id)) map.set(p.id, []);
    }
    const out: Customer[] = [];
    for (const [user_id, list] of map.entries()) {
      const sorted = [...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latest = sorted[0];
      const earliest = sorted[sorted.length - 1];
      const total = list.reduce((s, o) => s + Number(o.total), 0);
      const profile = profileMap.get(user_id);
      out.push({
        user_id,
        display_name: profile?.display_name ?? latest?.shipping_name ?? null,
        joined_at: profile?.created_at ?? earliest?.created_at ?? null,
        orders: list.length,
        total_spend: total,
        avg_order: list.length > 0 ? total / list.length : 0,
        last_order: latest?.created_at ?? null,
        first_order: earliest?.created_at ?? null,
        last_status: latest?.status ?? null,
        last_phone: latest?.shipping_phone ?? null,
        last_city: latest?.shipping_city ?? null,
        last_district: latest?.shipping_district ?? null,
        last_address: latest?.shipping_address ?? null,
        last_name: latest?.shipping_name ?? null,
      });
    }
    return out;
  }, [data, profileMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = customers;
    if (q) {
      list = list.filter((c) => {
        return (
          (c.display_name ?? "").toLowerCase().includes(q) ||
          (c.last_phone ?? "").toLowerCase().includes(q) ||
          (c.last_city ?? "").toLowerCase().includes(q) ||
          c.user_id.toLowerCase().includes(q)
        );
      });
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === "spend") return b.total_spend - a.total_spend;
      if (sortBy === "orders") return b.orders - a.orders;
      if (sortBy === "recent") {
        const at = a.last_order ? new Date(a.last_order).getTime() : 0;
        const bt = b.last_order ? new Date(b.last_order).getTime() : 0;
        return bt - at;
      }
      return (a.display_name ?? "").localeCompare(b.display_name ?? "");
    });
    return sorted;
  }, [customers, search, sortBy]);

  const stats = useMemo(() => {
    const buying = customers.filter((c) => c.orders > 0);
    const totalRev = buying.reduce((s, c) => s + c.total_spend, 0);
    const repeat = buying.filter((c) => c.orders >= 2).length;
    return {
      total: customers.length,
      buying: buying.length,
      repeat,
      revenue: totalRev,
      avgLtv: buying.length > 0 ? totalRev / buying.length : 0,
    };
  }, [customers]);

  const exportCsv = () => {
    const header = [
      "user_id",
      "name",
      "phone",
      "city",
      "district",
      "orders",
      "total_spend",
      "avg_order",
      "first_order",
      "last_order",
      "joined_at",
    ];
    const rows = filtered.map((c) => [
      c.user_id,
      `"${(c.display_name ?? "").replace(/"/g, '""')}"`,
      `"${(c.last_phone ?? "").replace(/"/g, '""')}"`,
      `"${(c.last_city ?? "").replace(/"/g, '""')}"`,
      `"${(c.last_district ?? "").replace(/"/g, '""')}"`,
      c.orders,
      c.total_spend.toFixed(2),
      c.avg_order.toFixed(2),
      c.first_order ?? "",
      c.last_order ?? "",
      c.joined_at ?? "",
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (selected) {
    const customer = customers.find((c) => c.user_id === selected);
    const orders = (data?.orders ?? []).filter((o) => o.user_id === selected);
    return (
      <CustomerDetail
        customer={customer}
        orders={orders}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Customers
          </h1>
          <p className="text-sm text-muted-foreground">
            Registered users, order history, and lifetime value.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-1.5 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Total customers" value={stats.total.toLocaleString()} />
        <KpiCard label="Buying customers" value={stats.buying.toLocaleString()} />
        <KpiCard label="Repeat buyers" value={stats.repeat.toLocaleString()} />
        <KpiCard label="Total revenue" value={taka(stats.revenue)} />
        <KpiCard label="Avg LTV" value={taka(stats.avgLtv)} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, city..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spend">Top spenders</SelectItem>
            <SelectItem value="orders">Most orders</SelectItem>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="name">Name (A→Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No customers found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total spend</TableHead>
                <TableHead className="text-right">Avg order</TableHead>
                <TableHead>Last order</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c, idx) => {
                const isVip = c.total_spend >= 10000 || c.orders >= 5;
                return (
                  <TableRow
                    key={c.user_id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setSelected(c.user_id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {(c.display_name ?? "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-medium">
                            <span className="truncate">{c.display_name ?? "Unknown"}</span>
                            {isVip && (
                              <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="VIP" />
                            )}
                            {sortBy === "spend" && idx < 3 && (
                              <Badge variant="secondary" className="text-[10px]">
                                #{idx + 1}
                              </Badge>
                            )}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {c.joined_at
                              ? `Joined ${new Date(c.joined_at).toLocaleDateString()}`
                              : "Guest"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{c.last_phone ?? <span className="text-muted-foreground">—</span>}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.last_city ? `${c.last_city}${c.last_district ? `, ${c.last_district}` : ""}` : "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{c.orders}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{taka(c.total_spend)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {c.orders > 0 ? taka(c.avg_order) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {c.last_order ? new Date(c.last_order).toLocaleDateString() : "—"}
                      {c.last_status && (
                        <Badge variant="outline" className="ml-2 capitalize text-[10px]">
                          {c.last_status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost">View</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function CustomerDetail({
  customer,
  orders,
  onBack,
}: {
  customer: Customer | undefined;
  orders: OrderLite[];
  onBack: () => void;
}) {
  if (!customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Customer not found.</p>
      </div>
    );
  }
  const isVip = customer.total_spend >= 10000 || customer.orders >= 5;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> All customers
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {(customer.display_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold truncate">{customer.display_name ?? "Unknown"}</h2>
              {isVip && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20">
                  <Crown className="mr-1 h-3 w-3" /> VIP
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {customer.last_phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {customer.last_phone}
                </span>
              )}
              {customer.last_city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {customer.last_city}
                  {customer.last_district ? `, ${customer.last_district}` : ""}
                </span>
              )}
              {customer.joined_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Joined {new Date(customer.joined_at).toLocaleDateString()}
                </span>
              )}
              <span className="font-mono">{customer.user_id.slice(0, 8)}…</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total orders" value={customer.orders.toLocaleString()} icon={ShoppingBag} />
        <KpiCard label="Lifetime value" value={taka(customer.total_spend)} icon={TrendingUp} />
        <KpiCard label="Avg order" value={customer.orders > 0 ? taka(customer.avg_order) : "—"} />
        <KpiCard
          label="Last order"
          value={customer.last_order ? new Date(customer.last_order).toLocaleDateString() : "—"}
          icon={Calendar}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No orders from this customer yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Ship to</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">#{o.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(o.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{o.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs uppercase">{o.payment_method ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">
                      {o.shipping_address ?? "—"}
                      {o.shipping_city ? `, ${o.shipping_city}` : ""}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {taka(Number(o.total))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Users;
}) {
  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          {Icon ? <Icon className="h-3 w-3" /> : null}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
