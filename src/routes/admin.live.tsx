import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Clock,
  CircleDot,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/live")({
  head: () => ({ meta: [{ title: "Live Dashboard — Admin" }] }),
  component: LiveDashboardPage,
});

const REFRESH_MS = 15_000;
const CURRENCY = "৳";

function formatMoney(n: number) {
  return `${CURRENCY}${Math.round(n).toLocaleString("en-IN")}`;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function pctChange(today: number, yesterday: number) {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return ((today - yesterday) / yesterday) * 100;
}

type Order = {
  id: string;
  created_at: string;
  total: number;
  subtotal: number;
  status: string;
  guest_name: string | null;
  shipping_name: string | null;
  shipping_city: string | null;
  guest_phone: string | null;
  shipping_phone: string | null;
};

type OrderItem = {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  image: string | null;
  created_at: string;
};

function LiveDashboardPage() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(i);
  }, []);

  const { todayStart, yesterdayStart, last24h, last48h } = useMemo(() => {
    const d = new Date();
    const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    const ys = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).toISOString();
    return {
      todayStart: ts,
      yesterdayStart: ys,
      last24h: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      last48h: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    };
  }, []);

  const { data: todayOrders = [] } = useQuery({
    queryKey: ["admin", "live", "today-orders", todayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, created_at, total, subtotal, status, guest_name, shipping_name, shipping_city, guest_phone, shipping_phone",
        )
        .gte("created_at", todayStart)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
    refetchInterval: REFRESH_MS,
  });

  const { data: yesterdayOrders = [] } = useQuery({
    queryKey: ["admin", "live", "yesterday-orders", yesterdayStart, todayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, total, status")
        .gte("created_at", yesterdayStart)
        .lt("created_at", todayStart);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const { data: trendOrders = [] } = useQuery({
    queryKey: ["admin", "live", "trend", last48h],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, total")
        .gte("created_at", last48h);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: REFRESH_MS,
  });

  const { data: topItems = [] } = useQuery({
    queryKey: ["admin", "live", "top-items", todayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("product_id, name, quantity, price, image, created_at")
        .gte("created_at", todayStart)
        .limit(500);
      if (error) throw error;
      return (data ?? []) as OrderItem[];
    },
    refetchInterval: REFRESH_MS,
  });

  const { data: activeVisitors = 0 } = useQuery({
    queryKey: ["admin", "live", "active-visitors"],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 60_000).toISOString();
      const { count, error } = await supabase
        .from("active_sessions")
        .select("session_id", { count: "exact", head: true })
        .gte("last_seen_at", cutoff);
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 10_000,
  });


  const recentOrders = todayOrders.slice(0, 8);

  const validToday = todayOrders.filter(
    (o) => !["fake", "cancelled"].includes(o.status),
  );
  const validYday = yesterdayOrders.filter(
    (o) => !["fake", "cancelled"].includes(o.status),
  );

  const todaySales = validToday.reduce((s, o) => s + Number(o.total || 0), 0);
  const ydaySales = validYday.reduce((s, o) => s + Number(o.total || 0), 0);
  const todayCount = validToday.length;
  const ydayCount = validYday.length;
  const todayAOV = todayCount ? todaySales / todayCount : 0;
  const ydayAOV = ydayCount ? ydaySales / ydayCount : 0;

  const hourNow = new Date().getHours();
  const ydaySoFar = validYday
    .filter((o) => new Date(o.created_at).getHours() <= hourNow)
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const ydaySoFarCount = validYday.filter(
    (o) => new Date(o.created_at).getHours() <= hourNow,
  ).length;

  const salesDelta = pctChange(todaySales, ydaySoFar);
  const ordersDelta = pctChange(todayCount, ydaySoFarCount);
  const aovDelta = pctChange(todayAOV, ydayAOV);

  const hourlyData = useMemo(() => {
    const buckets = new Map<string, { hour: string; today: number; yesterday: number }>();
    for (let i = 0; i < 24; i++) {
      const label = `${i.toString().padStart(2, "0")}:00`;
      buckets.set(label, { hour: label, today: 0, yesterday: 0 });
    }
    const todayDate = new Date().toDateString();
    trendOrders.forEach((o) => {
      const d = new Date(o.created_at);
      const label = `${d.getHours().toString().padStart(2, "0")}:00`;
      const b = buckets.get(label);
      if (!b) return;
      if (d.toDateString() === todayDate) {
        b.today += Number(o.total || 0);
      } else {
        b.yesterday += Number(o.total || 0);
      }
    });
    return Array.from(buckets.values());
  }, [trendOrders]);

  const topProducts = useMemo(() => {
    const m = new Map<
      string,
      { name: string; image: string | null; qty: number; revenue: number }
    >();
    topItems.forEach((it) => {
      const cur = m.get(it.product_id) ?? {
        name: it.name,
        image: it.image,
        qty: 0,
        revenue: 0,
      };
      cur.qty += it.quantity;
      cur.revenue += Number(it.price) * it.quantity;
      m.set(it.product_id, cur);
    });
    return Array.from(m.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [topItems]);

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    todayOrders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [todayOrders]);

  const recentPulse = todayOrders.filter(
    (o) => Date.now() - new Date(o.created_at).getTime() < 5 * 60 * 1000,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Live Dashboard</h1>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time store activity • auto-refresh every 15s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Clock className="h-3 w-3" />
            {new Date(now).toLocaleTimeString("en-GB")}
          </Badge>
          <Badge className="gap-1.5 bg-green-500/15 text-green-600 hover:bg-green-500/20">
            <CircleDot className="h-3 w-3 animate-pulse" />
            {activeVisitors} live {activeVisitors === 1 ? "visitor" : "visitors"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Today's sales"
          value={formatMoney(todaySales)}
          delta={salesDelta}
          subtitle={`vs ${formatMoney(ydaySoFar)} yesterday`}
        />
        <KpiCard
          icon={<ShoppingBag className="h-4 w-4" />}
          label="Today's orders"
          value={todayCount.toString()}
          delta={ordersDelta}
          subtitle={`vs ${ydaySoFarCount} yesterday`}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Avg order value"
          value={formatMoney(todayAOV)}
          delta={aovDelta}
          subtitle={`vs ${formatMoney(ydayAOV)} yesterday`}
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Active visitors"
          value={activeVisitors.toString()}
          subtitle={`${recentPulse} orders in last 5 min`}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Sales by hour</CardTitle>
            <p className="text-xs text-muted-foreground">Today vs yesterday</p>
          </div>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="todayG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} />
                <ReTooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Area
                  type="monotone"
                  dataKey="yesterday"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  fill="transparent"
                  name="Yesterday"
                />
                <Area
                  type="monotone"
                  dataKey="today"
                  stroke="hsl(var(--primary))"
                  fill="url(#todayG)"
                  strokeWidth={2}
                  name="Today"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Live order feed</CardTitle>
              <p className="text-xs text-muted-foreground">Latest orders today</p>
            </div>
            <Badge variant="outline">{todayCount} today</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                No orders yet today.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recentOrders.map((o) => {
                  const name = o.shipping_name || o.guest_name || "Guest";
                  const phone = o.shipping_phone || o.guest_phone || "";
                  const isFresh = Date.now() - new Date(o.created_at).getTime() < 5 * 60 * 1000;
                  return (
                    <li
                      key={o.id}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div
                        className={cn(
                          "h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold",
                          isFresh
                            ? "bg-green-500/15 text-green-600"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{name}</span>
                          {isFresh && (
                            <Badge className="h-4 bg-green-500/15 px-1.5 text-[10px] text-green-600 hover:bg-green-500/20">
                              NEW
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{phone}</span>
                          {o.shipping_city && (
                            <>
                              <span>•</span>
                              <span className="truncate">{o.shipping_city}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{formatMoney(Number(o.total))}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {timeAgo(o.created_at)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order status today</CardTitle>
            <p className="text-xs text-muted-foreground">Breakdown by stage</p>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No data yet.
              </div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="status"
                      tick={{ fontSize: 11 }}
                      width={90}
                    />
                    <ReTooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Top products today
          </CardTitle>
          <p className="text-xs text-muted-foreground">By revenue</p>
        </CardHeader>
        <CardContent className="p-0">
          {topProducts.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No product sales yet today.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {topProducts.map((p, idx) => {
                const max = topProducts[0].revenue || 1;
                const pct = (p.revenue / max) * 100;
                return (
                  <li key={idx} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-10 w-10 shrink-0 rounded-md bg-muted overflow-hidden">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{formatMoney(p.revenue)}</div>
                      <div className="text-[11px] text-muted-foreground">{p.qty} sold</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  delta,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: number;
  subtitle?: string;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {icon}
            {label}
          </div>
          {delta !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                positive
                  ? "bg-green-500/15 text-green-600"
                  : "bg-red-500/15 text-red-600",
              )}
            >
              {positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
        {subtitle && (
          <div className="mt-1 text-[11px] text-muted-foreground">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}
