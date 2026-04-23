import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  BarChart3,
  CalendarIcon,
  Download,
  Loader2,
  TrendingUp,
  ShoppingBag,
  Package,
  Tags,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  component: AnalyticsPage,
});

type OrderRow = {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  shipping_fee: number;
  created_at: string;
  user_id: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
};

type ProductCat = { id: string; category_id: string | null };
type CategoryRow = { id: string; name: string };

const taka = (n: number) => `৳${Math.round(n).toLocaleString()}`;

const PRESETS: { label: string; days: number }[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "365d", days: 365 },
];

const CATEGORY_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 200 80% 55%))",
  "hsl(var(--chart-3, 280 65% 60%))",
  "hsl(var(--chart-4, 35 90% 55%))",
  "hsl(var(--chart-5, 150 60% 50%))",
  "hsl(var(--chart-6, 0 70% 60%))",
];

function AnalyticsPage() {
  const [from, setFrom] = useState<Date>(() => startOfDay(subDays(new Date(), 29)));
  const [to, setTo] = useState<Date>(() => endOfDay(new Date()));

  const fromIso = useMemo(() => from.toISOString(), [from]);
  const toIso = useMemo(() => to.toISOString(), [to]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin_analytics", fromIso, toIso],
    queryFn: async () => {
      const ordersRes = await supabase
        .from("orders")
        .select("id,status,total,subtotal,shipping_fee,created_at,user_id")
        .gte("created_at", fromIso)
        .lte("created_at", toIso)
        .order("created_at", { ascending: true });
      if (ordersRes.error) throw ordersRes.error;
      const orders = (ordersRes.data ?? []) as OrderRow[];

      const orderIds = orders.map((o) => o.id);
      let items: OrderItemRow[] = [];
      if (orderIds.length > 0) {
        const itemsRes = await supabase
          .from("order_items")
          .select("id,order_id,product_id,name,price,quantity,image")
          .in("order_id", orderIds);
        if (itemsRes.error) throw itemsRes.error;
        items = (itemsRes.data ?? []) as OrderItemRow[];
      }

      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from("products").select("id,category_id"),
        supabase.from("categories").select("id,name"),
      ]);
      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      return {
        orders,
        items,
        products: (productsRes.data ?? []) as ProductCat[],
        categories: (categoriesRes.data ?? []) as CategoryRow[],
      };
    },
    staleTime: 60_000,
  });

  const metrics = useMemo(() => {
    const orders = data?.orders ?? [];
    const items = data?.items ?? [];
    const valid = orders.filter((o) => o.status !== "cancelled");
    const revenue = valid.reduce((s, o) => s + Number(o.total), 0);
    const units = items
      .filter((i) => valid.some((o) => o.id === i.order_id))
      .reduce((s, i) => s + i.quantity, 0);
    const customers = new Set(valid.map((o) => o.user_id)).size;
    return {
      revenue,
      orders: valid.length,
      units,
      customers,
      avgOrder: valid.length > 0 ? revenue / valid.length : 0,
      cancelled: orders.length - valid.length,
    };
  }, [data]);

  const series = useMemo(() => {
    const orders = data?.orders ?? [];
    const days: { date: string; label: string; revenue: number; orders: number }[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const span = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / dayMs));
    const start = startOfDay(from).getTime();
    for (let i = 0; i < span; i++) {
      const d = new Date(start + i * dayMs);
      days.push({
        date: d.toISOString().slice(0, 10),
        label: format(d, span > 60 ? "MMM d" : "MMM dd"),
        revenue: 0,
        orders: 0,
      });
    }
    const map = new Map(days.map((d) => [d.date, d]));
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const key = o.created_at.slice(0, 10);
      const slot = map.get(key);
      if (slot) {
        slot.revenue += Number(o.total);
        slot.orders += 1;
      }
    }
    return days;
  }, [data, from, to]);

  const topProducts = useMemo(() => {
    const items = data?.items ?? [];
    const valid = new Set(
      (data?.orders ?? []).filter((o) => o.status !== "cancelled").map((o) => o.id)
    );
    const map = new Map<
      string,
      { product_id: string; name: string; image: string | null; units: number; revenue: number }
    >();
    for (const it of items) {
      if (!valid.has(it.order_id)) continue;
      const cur = map.get(it.product_id) ?? {
        product_id: it.product_id,
        name: it.name,
        image: it.image,
        units: 0,
        revenue: 0,
      };
      cur.units += it.quantity;
      cur.revenue += Number(it.price) * it.quantity;
      map.set(it.product_id, cur);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [data]);

  const topCategories = useMemo(() => {
    const items = data?.items ?? [];
    const products = data?.products ?? [];
    const categories = data?.categories ?? [];
    const valid = new Set(
      (data?.orders ?? []).filter((o) => o.status !== "cancelled").map((o) => o.id)
    );
    const prodCat = new Map(products.map((p) => [p.id, p.category_id]));
    const catName = new Map(categories.map((c) => [c.id, c.name]));
    const map = new Map<string, { name: string; revenue: number; units: number }>();
    for (const it of items) {
      if (!valid.has(it.order_id)) continue;
      const cid = prodCat.get(it.product_id) ?? "uncategorised";
      const name = cid === "uncategorised" ? "Uncategorised" : catName.get(cid) ?? "Unknown";
      const cur = map.get(cid ?? "uncategorised") ?? { name, revenue: 0, units: 0 };
      cur.revenue += Number(it.price) * it.quantity;
      cur.units += it.quantity;
      map.set(cid ?? "uncategorised", cur);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [data]);

  const statusBreakdown = useMemo(() => {
    const orders = data?.orders ?? [];
    const map = new Map<string, number>();
    for (const o of orders) map.set(o.status, (map.get(o.status) ?? 0) + 1);
    return [...map.entries()].map(([status, count]) => ({ status, count }));
  }, [data]);

  const setPreset = (days: number) => {
    setFrom(startOfDay(subDays(new Date(), days - 1)));
    setTo(endOfDay(new Date()));
  };

  const exportCsv = () => {
    const lines: string[] = [];
    lines.push("# Daily revenue & orders");
    lines.push("date,revenue,orders");
    for (const d of series) lines.push(`${d.date},${d.revenue.toFixed(2)},${d.orders}`);
    lines.push("");
    lines.push("# Top products");
    lines.push("product_id,name,units,revenue");
    for (const p of topProducts)
      lines.push(`${p.product_id},"${p.name.replace(/"/g, '""')}",${p.units},${p.revenue.toFixed(2)}`);
    lines.push("");
    lines.push("# Top categories");
    lines.push("category,units,revenue");
    for (const c of topCategories)
      lines.push(`"${c.name.replace(/"/g, '""')}",${c.units},${c.revenue.toFixed(2)}`);

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${format(from, "yyyyMMdd")}-${format(to, "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(from, "MMM d, yyyy")} – {format(to, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <Button key={p.label} size="sm" variant="outline" onClick={() => setPreset(p.days)}>
              {p.label}
            </Button>
          ))}
          <DateButton label="From" value={from} onChange={(d) => setFrom(startOfDay(d))} />
          <DateButton label="To" value={to} onChange={(d) => setTo(endOfDay(d))} />
          <Button size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Revenue" value={taka(metrics.revenue)} icon={TrendingUp} />
        <KpiCard label="Orders" value={metrics.orders.toLocaleString()} icon={ShoppingBag} />
        <KpiCard label="Units sold" value={metrics.units.toLocaleString()} icon={Package} />
        <KpiCard label="Customers" value={metrics.customers.toLocaleString()} />
        <KpiCard label="Avg order" value={metrics.orders > 0 ? taka(metrics.avgOrder) : "—"} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Revenue & orders</CardTitle>
          <span className="text-xs text-muted-foreground">{series.length} days</span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={series} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <ReTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, name: string) =>
                    name === "revenue" ? [taka(value), "Revenue"] : [value, "Orders"]
                  }
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revFill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Top products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No sales in this range.</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p, i) => {
                  const max = topProducts[0].revenue;
                  const pct = max > 0 ? (p.revenue / max) * 100 : 0;
                  return (
                    <div key={p.product_id} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-semibold tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                        {p.image ? (
                          <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{p.name}</span>
                          <span className="text-xs font-semibold tabular-nums">{taka(p.revenue)}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                            {p.units} units
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tags className="h-4 w-4" /> Top categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No sales in this range.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={topCategories}
                      dataKey="revenue"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {topCategories.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(value: number) => taka(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 self-center">
                  {topCategories.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                      />
                      <span className="font-medium">{c.name}</span>
                      <span className="ml-auto tabular-nums text-muted-foreground">{taka(c.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders by status</CardTitle>
        </CardHeader>
        <CardContent>
          {statusBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No orders in this range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <ReTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {metrics.cancelled > 0 && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {metrics.cancelled} cancelled order{metrics.cancelled === 1 ? "" : "s"} excluded from revenue
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DateButton({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="justify-start text-left font-normal">
          <CalendarIcon className="mr-1.5 h-4 w-4" />
          <span className="text-xs text-muted-foreground mr-1">{label}:</span>
          {format(value, "MMM d, yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => d && onChange(d)}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof TrendingUp;
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
