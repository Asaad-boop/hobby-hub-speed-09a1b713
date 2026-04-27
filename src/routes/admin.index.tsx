import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  PackageCheck,
  Activity,
  Eye,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type OrderRow = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  shipping_name: string | null;
};

type ProductLow = {
  id: string;
  title: string;
  stock: number;
  image: string;
};

const STATUS_META: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  pending: { label: "Pending", icon: Clock, cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  processing: { label: "Processing", icon: PackageCheck, cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  shipped: { label: "Shipped", icon: Truck, cls: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" },
  delivered: { label: "Delivered", icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  cancelled: { label: "Cancelled", icon: XCircle, cls: "bg-rose-500/10 text-rose-700 dark:text-rose-400" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, icon: Clock, cls: "bg-muted text-foreground" };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function LiveVisitorsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "live-visitors"],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 60_000).toISOString();
      const { data, error } = await supabase
        .from("active_sessions")
        .select("session_id, path, last_seen_at, country")
        .gte("last_seen_at", cutoff)
        .order("last_seen_at", { ascending: false })
        .limit(50);
      if (error) return { count: 0, sessions: [] as Array<{ session_id: string; path: string | null; last_seen_at: string; country: string | null }> };
      return { count: data.length, sessions: data };
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const pathCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of data?.sessions ?? []) {
      const p = s.path || "/";
      map.set(p, (map.get(p) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [data?.sessions]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <h2 className="text-base font-semibold">Live visitors</h2>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px]">
          <Activity className="h-3 w-3" /> Real-time
        </Badge>
      </div>

      <div className="mb-4 flex items-baseline gap-2">
        <p className="text-4xl font-bold tabular-nums">
          {isLoading ? <span className="inline-block h-9 w-16 animate-pulse rounded bg-muted" /> : data?.count ?? 0}
        </p>
        <span className="text-xs text-muted-foreground">active now (last 60s)</span>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Top pages
        </p>
        {isLoading ? (
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-7 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : pathCounts.length ? (
          <ul className="space-y-1.5">
            {pathCounts.map(([path, count]) => (
              <li
                key={path}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-xs">
                  <Eye className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono">{path}</span>
                </span>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No visitors right now.
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 29);
      const sinceISO = sinceDate.toISOString();

      const [productsCnt, customersCnt, allOrdersRes, recentOrdersRes, lowStockRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total, status, created_at").gte("created_at", sinceISO),
        supabase
          .from("orders")
          .select("id, total, status, created_at, shipping_name")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("products")
          .select("id, title, stock, image")
          .lte("stock", 5)
          .eq("is_active", true)
          .order("stock", { ascending: true })
          .limit(6),
      ]);

      const allOrders = (allOrdersRes.data ?? []) as OrderRow[];
      return {
        productsCount: productsCnt.count ?? 0,
        customersCount: customersCnt.count ?? 0,
        allOrders,
        recentOrders: (recentOrdersRes.data ?? []) as OrderRow[],
        lowStock: (lowStockRes.data ?? []) as ProductLow[],
      };
    },
    staleTime: 60_000,
  });

  const metrics = useMemo(() => {
    const orders = data?.allOrders ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.getTime();
    const last7 = today.getTime() - 6 * 86400_000;

    let revenue30 = 0;
    let revenueToday = 0;
    let orders7 = 0;
    let pending = 0;

    for (const o of orders) {
      const t = new Date(o.created_at).getTime();
      const total = Number(o.total) || 0;
      if (o.status !== "cancelled") revenue30 += total;
      if (t >= todayISO && o.status !== "cancelled") revenueToday += total;
      if (t >= last7) orders7 += 1;
      if (o.status === "pending") pending += 1;
    }

    // Build last 30 day series
    const days: { day: string; revenue: number; orders: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400_000);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: key, revenue: 0, orders: 0 });
    }
    const idx = new Map(days.map((d, i) => [d.day, i]));
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      const i = idx.get(key);
      if (i !== undefined) {
        days[i].revenue += Number(o.total) || 0;
        days[i].orders += 1;
      }
    }

    return { revenue30, revenueToday, orders7, pending, series: days };
  }, [data?.allOrders]);

  const kpis = [
    {
      label: "Revenue (30d)",
      value: `৳${Math.round(metrics.revenue30).toLocaleString()}`,
      sub: `Today: ৳${Math.round(metrics.revenueToday).toLocaleString()}`,
      icon: TrendingUp,
      tone: "text-emerald-700 bg-emerald-500/10",
    },
    {
      label: "Orders (7d)",
      value: metrics.orders7.toLocaleString(),
      sub: `${metrics.pending} pending`,
      icon: ShoppingBag,
      tone: "text-blue-700 bg-blue-500/10",
    },
    {
      label: "Products",
      value: (data?.productsCount ?? 0).toLocaleString(),
      sub: `${data?.lowStock.length ?? 0} low stock`,
      icon: Package,
      tone: "text-amber-700 bg-amber-500/10",
    },
    {
      label: "Customers",
      value: (data?.customersCount ?? 0).toLocaleString(),
      sub: "Registered users",
      icon: Users,
      tone: "text-fuchsia-700 bg-fuchsia-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Last 30 days · Real-time business overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-semibold hover:bg-muted"
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Orders
          </Link>
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Package className="h-3.5 w-3.5" /> Add product
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${c.tone}`}>
                <c.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold">
              {isLoading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-muted" /> : c.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Sales chart + Pending orders */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Sales trend</h2>
              <p className="text-xs text-muted-foreground">Daily revenue · last 30 days</p>
            </div>
            <Badge variant="outline" className="text-[10px]">৳ BDT</Badge>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.series} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <ReTooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`৳${Math.round(v).toLocaleString()}`, "Revenue"]}
                  labelFormatter={(l) => `Date: ${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low stock */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h2 className="text-base font-semibold">Low stock</h2>
            </div>
            <Link to="/admin/products" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : data?.lowStock.length ? (
            <ul className="space-y-2">
              {data.lowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-background p-2"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {p.image ? (
                      <img src={p.image} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Only <span className="font-bold text-amber-700">{p.stock}</span> left
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              All good. No low-stock items.
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Recent orders</h2>
            <p className="text-xs text-muted-foreground">Latest 8 orders across all statuses</p>
          </div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Order</th>
                <th className="px-5 py-3 text-left font-semibold">Customer</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
                <th className="px-5 py-3 text-left font-semibold">Date</th>
                <th className="px-5 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-5 py-3" colSpan={5}>
                      <div className="h-5 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : data?.recentOrders.length ? (
                data.recentOrders.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs">#{o.id.slice(0, 8)}</td>
                    <td className="px-5 py-3">{o.shipping_name || "—"}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">
                      ৳{Number(o.total).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-border">
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
