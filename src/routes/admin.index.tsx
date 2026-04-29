import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  Package, AlertTriangle, ShoppingBag, ArrowRight,
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/admin/StatusPill";
import {
  getDashboardKpis, getSalesTrend, getTopProducts, getActivityFeed,
} from "@/server/dashboard.functions";
import { callWithSupabaseAuth } from "@/lib/server-fn-auth";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

const taka = (n: number) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(n);

function KpiCard({
  label, value, delta, icon: Icon, gradient, sub,
}: {
  label: string; value: string; delta?: number; icon: React.ComponentType<{ className?: string }>;
  gradient: string; sub?: string;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden border-border/50 p-5 transition hover:shadow-md">
      <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl ${gradient}`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${gradient} text-white`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          {delta !== undefined && (
            <span className={`inline-flex items-center gap-0.5 font-medium ${positive ? "text-success" : "text-destructive"}`}>
              {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {sub && <span className="text-muted-foreground">{sub}</span>}
        </div>
      </div>
    </Card>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const kpis = useQuery({ queryKey: ["admin", "kpis"], queryFn: () => callWithSupabaseAuth(getDashboardKpis), retry: false });
  const trend = useQuery({ queryKey: ["admin", "trend"], queryFn: () => callWithSupabaseAuth(getSalesTrend), retry: false });
  const top = useQuery({ queryKey: ["admin", "top"], queryFn: () => callWithSupabaseAuth(getTopProducts), retry: false });
  const feed = useQuery({ queryKey: ["admin", "feed"], queryFn: () => callWithSupabaseAuth(getActivityFeed), retry: false });

  useEffect(() => {
    const errors = [kpis.error, trend.error, top.error, feed.error].filter(Boolean) as Error[];
    if (errors.some((e) => e.message.toLowerCase().includes("session expired") || e.message.toLowerCase().includes("unauthorized"))) {
      navigate({ to: "/auth" });
    }
  }, [feed.error, kpis.error, navigate, top.error, trend.error]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time overview of your store performance</p>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.isLoading || !kpis.data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <KpiCard
              label="Today's Revenue"
              value={taka(kpis.data.todayRevenue)}
              delta={kpis.data.revenueDelta}
              icon={DollarSign}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
              sub="vs yesterday"
            />
            <KpiCard
              label="Today's Orders"
              value={String(kpis.data.todayOrders)}
              icon={ShoppingCart}
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
              sub={`${kpis.data.pendingConfirm} pending`}
            />
            <KpiCard
              label="Avg Order Value"
              value={taka(kpis.data.aov7)}
              icon={ShoppingBag}
              gradient="bg-gradient-to-br from-purple-500 to-pink-600"
              sub="last 7 days"
            />
            <KpiCard
              label="Delivery Rate"
              value={`${kpis.data.successRate.toFixed(1)}%`}
              icon={Package}
              gradient="bg-gradient-to-br from-orange-500 to-red-600"
              sub="last 30 days"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/admin/orders" search={{ status: "new" }}>
            <AlertTriangle className="h-3.5 w-3.5" />
            Pending confirmations
            {kpis.data && kpis.data.pendingConfirm > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {kpis.data.pendingConfirm}
              </span>
            )}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/admin/orders" search={{ status: "ready_to_ship" }}>
            <Package className="h-3.5 w-3.5" />
            Ready to ship
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/admin/orders" search={{ status: "shipped" }}>
            Today's deliveries
          </Link>
        </Button>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Sales Trend</h3>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
          </div>
          <div className="mt-4 h-64">
            {trend.isLoading || !trend.data ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend.data}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString("en", { month: "short", day: "numeric" })}
                    fontSize={11}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => taka(v)}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold">Top Products</h3>
          <p className="text-xs text-muted-foreground">By revenue · 30d</p>
          <div className="mt-4 h-64">
            {top.isLoading || !top.data ? (
              <Skeleton className="h-full w-full" />
            ) : top.data.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No sales yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top.data} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} fontSize={10} stroke="var(--muted-foreground)" tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => taka(v)}
                  />
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Activity feed */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Recent Orders</h3>
            <p className="text-xs text-muted-foreground">Latest activity</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to="/admin/orders">View all <ArrowRight className="h-3 w-3" /></Link>
          </Button>
        </div>
        <div className="mt-4 divide-y divide-border">
          {feed.isLoading || !feed.data ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="my-2 h-12 w-full" />)
          ) : feed.data.recent.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No recent orders</div>
          ) : (
            feed.data.recent.map((o) => (
              <Link
                key={o.id}
                to="/admin/orders"
                search={{ orderId: o.id }}
                className="flex items-center gap-4 py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{o.shipping_name ?? "Guest"}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground truncate">{o.shipping_phone ?? ""}</span>
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString("en", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">{taka(Number(o.total ?? 0))}</div>
                <StatusPill status={o.status} />
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
