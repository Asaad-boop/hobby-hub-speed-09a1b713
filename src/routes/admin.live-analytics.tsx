import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Activity,
  Users,
  ShoppingCart,
  CreditCard,
  Package,
  TrendingUp,
  TrendingDown,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  ArrowRight,
  Globe,
  Circle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, fmtBDT, Badge } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/live-analytics")({
  component: LiveAnalytics,
});

type Range = "live" | "today" | "yesterday" | "7d" | "30d";

const RANGE_LABELS: Record<Range, string> = {
  live: "Live (30 min)",
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

function rangeBounds(range: Range): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const now = new Date();
  const to = new Date(now);
  let from: Date;
  switch (range) {
    case "live":
      from = new Date(now.getTime() - 30 * 60_000);
      break;
    case "today":
      from = new Date(now);
      from.setHours(0, 0, 0, 0);
      break;
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      y.setHours(0, 0, 0, 0);
      const yEnd = new Date(y);
      yEnd.setHours(23, 59, 59, 999);
      const prevDay = new Date(y);
      prevDay.setDate(prevDay.getDate() - 1);
      return { from: y, to: yEnd, prevFrom: prevDay, prevTo: new Date(y.getTime() - 1) };
    }
    case "7d":
      from = new Date(now.getTime() - 7 * 86400_000);
      break;
    case "30d":
      from = new Date(now.getTime() - 30 * 86400_000);
      break;
  }
  const span = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span);
  return { from, to, prevFrom, prevTo };
}

function pct(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null;
  return ((curr - prev) / prev) * 100;
}

function LiveAnalytics() {
  const [range, setRange] = useState<Range>("today");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Analytics"
        description="Real-time visitor activity, sales funnel, and performance insights"
        actions={
          <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === r ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {r === "live" && <Circle className="h-2 w-2 fill-current animate-pulse" />}
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        }
      />

      <LiveBar />
      <FunnelSection range={range} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityChart range={range} />
        </div>
        <DeviceBreakdown range={range} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopProducts range={range} />
        <TrafficSources range={range} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LiveOrderFeed />
        <RecentActivity />
      </div>
    </div>
  );
}

/* --------------------------------- LIVE BAR -------------------------------- */

function LiveBar() {
  const { data } = useQuery({
    queryKey: ["live-bar"],
    refetchInterval: 5000,
    queryFn: async () => {
      const since60 = new Date(Date.now() - 60_000).toISOString();
      const since30m = new Date(Date.now() - 30 * 60_000).toISOString();

      const [activeVisitors, activeCarts, activeCheckouts, recentPurchases, productViews] = await Promise.all([
        // active_sessions PK is session_id, so each row is already one unique
        // visitor — no extra dedupe needed here.
        supabase
          .from("active_sessions")
          .select("session_id,path")
          .gte("last_seen_at", since60),
        supabase
          .from("abandoned_carts")
          .select("session_id,user_id,id")
          .gte("updated_at", since30m)
          .eq("is_converted", false)
          .or("last_step.is.null,last_step.neq.checkout"),
        supabase
          .from("abandoned_carts")
          .select("session_id,user_id,id")
          .gte("updated_at", since30m)
          .eq("is_converted", false)
          .eq("last_step", "checkout"),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since30m),
        // Pull session_id so we can count *distinct* viewers, not raw rows.
        supabase
          .from("analytics_events")
          .select("session_id")
          .eq("event_name", "page_view")
          .gte("created_at", since30m)
          .eq("page_type", "product")
          .limit(5000),
      ]);

      const visitorRows = activeVisitors.data ?? [];
      // Defensive: dedupe by session_id even though PK should guarantee it.
      const uniqVisitors = new Map<string, { path: string | null }>();
      for (const v of visitorRows) {
        if (!uniqVisitors.has(v.session_id)) {
          uniqVisitors.set(v.session_id, { path: v.path ?? null });
        }
      }
      const visitors = Array.from(uniqVisitors.values());
      const onProduct = visitors.filter((v) => v.path?.startsWith("/product/")).length;
      const onCheckout = visitors.filter((v) => v.path?.startsWith("/checkout")).length;
      const onHome = visitors.filter((v) => v.path === "/").length;

      const dedupeKey = (r: { session_id: string | null; user_id: string | null; id: string }) =>
        r.user_id || r.session_id || r.id;
      const cartSet = new Set((activeCarts.data ?? []).map(dedupeKey));
      const checkoutSet = new Set((activeCheckouts.data ?? []).map(dedupeKey));
      const productViewSessions = new Set((productViews.data ?? []).map((r) => r.session_id));

      return {
        live: visitors.length,
        carts: cartSet.size,
        checkouts: checkoutSet.size,
        purchases30m: recentPurchases.count ?? 0,
        productViews30m: productViewSessions.size,
        onProduct,
        onCheckout,
        onHome,
      };
    },
  });

  const stats = [
    {
      label: "Live Visitors",
      value: data?.live ?? 0,
      icon: Users,
      color: "from-emerald-500 to-emerald-600",
      sub: "Last 60 sec",
      pulse: true,
    },
    {
      label: "Viewing Products",
      value: data?.onProduct ?? 0,
      icon: Eye,
      color: "from-blue-500 to-blue-600",
      sub: "Right now",
    },
    {
      label: "Active Carts",
      value: data?.carts ?? 0,
      icon: ShoppingCart,
      color: "from-amber-500 to-amber-600",
      sub: "Last 30 min",
    },
    {
      label: "In Checkout",
      value: data?.checkouts ?? 0,
      icon: CreditCard,
      color: "from-purple-500 to-purple-600",
      sub: "Last 30 min",
    },
    {
      label: "Purchases",
      value: data?.purchases30m ?? 0,
      icon: Package,
      color: "from-pink-500 to-rose-600",
      sub: "Last 30 min",
    },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-semibold text-white">Live Activity</span>
        </div>
        <span className="text-[11px] text-gray-300">Updates every 5 seconds</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-gray-200 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">{s.sub}</p>
              </div>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${s.color} text-white shadow-sm`}>
                <s.icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------------------------- FUNNEL --------------------------------- */

function FunnelSection({ range }: { range: Range }) {
  const { from, to, prevFrom, prevTo } = useMemo(() => rangeBounds(range), [range]);

  const { data, isLoading } = useQuery({
    queryKey: ["funnel", range],
    refetchInterval: range === "live" ? 10_000 : 30_000,
    queryFn: async () => {
      const fromIso = from.toISOString();
      const toIso = to.toISOString();
      const prevFromIso = prevFrom.toISOString();
      const prevToIso = prevTo.toISOString();

      // GA4-style funnel: every step is one row in analytics_events. Distinct
      // session counts use a lightweight client-side dedupe so traffic-source
      // attribution lines up with conversions even when the cart never made it
      // into the abandoned_carts table.
      const select = "session_id,event_name,value";
      const fetchEvents = (a: string, b: string) =>
        supabase
          .from("analytics_events")
          .select(select)
          .gte("created_at", a)
          .lte("created_at", b)
          .in("event_name", [
            "page_view",
            "view_item",
            "add_to_cart",
            "begin_checkout",
            "purchase",
          ])
          .limit(20000);

      const [curr, prev, orders, prevOrders] = await Promise.all([
        fetchEvents(fromIso, toIso),
        fetchEvents(prevFromIso, prevToIso),
        supabase.from("orders").select("total,status,created_at").gte("created_at", fromIso).lte("created_at", toIso),
        supabase.from("orders").select("total,status,created_at").gte("created_at", prevFromIso).lte("created_at", prevToIso),
      ]);

      const tally = (rows: Array<{ session_id: string; event_name: string }> | null) => {
        const out = {
          visitors: new Set<string>(),
          productViews: new Set<string>(),
          carts: new Set<string>(),
          checkouts: new Set<string>(),
          purchases: new Set<string>(),
        };
        for (const r of rows ?? []) {
          if (r.event_name === "page_view") out.visitors.add(r.session_id);
          else if (r.event_name === "view_item") out.productViews.add(r.session_id);
          else if (r.event_name === "add_to_cart") out.carts.add(r.session_id);
          else if (r.event_name === "begin_checkout") out.checkouts.add(r.session_id);
          else if (r.event_name === "purchase") out.purchases.add(r.session_id);
        }
        return {
          visitors: out.visitors.size,
          productViews: out.productViews.size,
          carts: out.carts.size,
          checkouts: out.checkouts.size,
          purchases: out.purchases.size,
        };
      };

      const c = tally(curr.data);
      const p = tally(prev.data);

      const ordersData = orders.data ?? [];
      const prevOrdersData = prevOrders.data ?? [];
      const revenue = ordersData
        .filter((o) => o.status === "delivered" || o.status === "confirmed")
        .reduce((s, o) => s + Number(o.total), 0);
      const prevRevenue = prevOrdersData
        .filter((o) => o.status === "delivered" || o.status === "confirmed")
        .reduce((s, o) => s + Number(o.total), 0);

      return {
        visitors: c.visitors,
        prevVisitors: p.visitors,
        productViews: c.productViews,
        prevProductViews: p.productViews,
        carts: c.carts,
        prevCarts: p.carts,
        checkouts: c.checkouts,
        prevCheckouts: p.checkouts,
        purchases: c.purchases || ordersData.length,
        prevPurchases: p.purchases || prevOrdersData.length,
        revenue,
        prevRevenue,
      };
    },
  });

  const steps = data
    ? [
        { label: "Visitors", value: data.visitors, prev: data.prevVisitors, color: "bg-blue-500" },
        { label: "Product Views", value: data.productViews, prev: data.prevProductViews, color: "bg-indigo-500" },
        { label: "Add to Cart", value: data.carts, prev: data.prevCarts, color: "bg-amber-500" },
        { label: "Checkout", value: data.checkouts, prev: data.prevCheckouts, color: "bg-purple-500" },
        { label: "Purchase", value: data.purchases, prev: data.prevPurchases, color: "bg-emerald-500" },
      ]
    : [];

  const max = Math.max(...steps.map((s) => s.value), 1);
  const conversion = data && data.visitors > 0 ? (data.purchases / data.visitors) * 100 : 0;
  const prevConversion = data && data.prevVisitors > 0 ? (data.prevPurchases / data.prevVisitors) * 100 : 0;

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Sales Funnel</h3>
          <p className="text-xs text-gray-500">Customer journey from visit to purchase</p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500">Conversion</p>
            <p className="text-lg font-bold text-gray-900">{conversion.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500">Revenue</p>
            <p className="text-lg font-bold text-gray-900">{fmtBDT(data?.revenue ?? 0)}</p>
            <Trend value={pct(data?.revenue ?? 0, data?.prevRevenue ?? 0)} />
          </div>
        </div>
      </div>
      <div className="space-y-3 p-5">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading funnel…</div>
        ) : (
          steps.map((s, i) => {
            const width = (s.value / max) * 100;
            const dropoff = i > 0 && steps[i - 1].value > 0 ? (s.value / steps[i - 1].value) * 100 : 100;
            return (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">{s.label}</span>
                  <div className="flex items-center gap-3">
                    {i > 0 && <span className="text-gray-400">{dropoff.toFixed(1)}% from prev</span>}
                    <span className="font-bold tabular-nums text-gray-900">{s.value.toLocaleString()}</span>
                    <Trend value={pct(s.value, s.prev)} small />
                  </div>
                </div>
                <div className="h-7 overflow-hidden rounded-md bg-gray-100">
                  <div
                    className={`flex h-full items-center justify-end px-2 text-[10px] font-medium text-white transition-all ${s.color}`}
                    style={{ width: `${Math.max(width, 2)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
        {data && (
          <div className="mt-4 flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
            <span className="text-gray-500">vs previous period — Conversion</span>
            <span className="font-medium text-gray-900">
              {prevConversion.toFixed(2)}% <Trend value={pct(conversion, prevConversion)} small />
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

function Trend({ value, small = false }: { value: number | null; small?: boolean }) {
  if (value === null) return null;
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 ${small ? "text-[10px]" : "text-[11px]"} font-medium ${
        positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

/* ----------------------------- ACTIVITY CHART ------------------------------ */

function ActivityChart({ range }: { range: Range }) {
  const { from, to } = useMemo(() => rangeBounds(range), [range]);

  const { data } = useQuery({
    queryKey: ["activity-chart", range],
    refetchInterval: range === "live" ? 10_000 : 60_000,
    queryFn: async () => {
      const [views, orders] = await Promise.all([
        supabase.from("analytics_events").select("session_id,created_at").eq("event_name", "page_view").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).limit(10000),
        supabase.from("orders").select("created_at,total").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).limit(2000),
      ]);

      const buckets = range === "live" ? 30 : range === "today" || range === "yesterday" ? 24 : range === "7d" ? 7 : 30;
      const span = to.getTime() - from.getTime();
      const step = span / buckets;
      const out = Array.from({ length: buckets }, (_, i) => {
        const t = from.getTime() + i * step;
        return { time: t, label: formatBucket(new Date(t), range), visitors: 0, orders: 0 };
      });
      // Distinct sessions per bucket so refresh storms / StrictMode dupes
      // don't inflate the visitor line.
      const seenPerBucket: Array<Set<string>> = Array.from({ length: buckets }, () => new Set());

      for (const v of views.data ?? []) {
        const idx = Math.min(buckets - 1, Math.floor((new Date(v.created_at).getTime() - from.getTime()) / step));
        if (idx >= 0 && v.session_id && !seenPerBucket[idx].has(v.session_id)) {
          seenPerBucket[idx].add(v.session_id);
          out[idx].visitors += 1;
        }
      }
      for (const o of orders.data ?? []) {
        const idx = Math.min(buckets - 1, Math.floor((new Date(o.created_at).getTime() - from.getTime()) / step));
        if (idx >= 0) out[idx].orders += 1;
      }
      return out;
    },
  });

  return (
    <Card>
      <div className="border-b border-gray-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Visitor & Order Trend</h3>
        <p className="text-xs text-gray-500">{RANGE_LABELS[range]}</p>
      </div>
      <div className="h-72 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data ?? []}>
            <defs>
              <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
            <Area type="monotone" dataKey="visitors" stroke="#3b82f6" fill="url(#gV)" strokeWidth={2} name="Visitors" />
            <Area type="monotone" dataKey="orders" stroke="#10b981" fill="url(#gO)" strokeWidth={2} name="Orders" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function formatBucket(d: Date, range: Range): string {
  if (range === "live") return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (range === "today" || range === "yesterday") return d.toLocaleTimeString("en-GB", { hour: "2-digit" });
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

/* ----------------------------- DEVICE BREAKDOWN ---------------------------- */

function DeviceBreakdown({ range }: { range: Range }) {
  const { from, to } = useMemo(() => rangeBounds(range), [range]);
  const { data } = useQuery({
    queryKey: ["devices", range],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("analytics_events")
        .select("session_id,device_type")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .limit(10000);
      // Count one device per session (first seen wins) so repeat page views
      // from the same visitor don't skew the device split.
      const counts: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
      const seen = new Set<string>();
      for (const r of rows ?? []) {
        if (!r.session_id || seen.has(r.session_id)) continue;
        seen.add(r.session_id);
        const k = (r.device_type as string) || "desktop";
        counts[k] = (counts[k] ?? 0) + 1;
      }
      return counts;
    },
  });

  const total = (data?.mobile ?? 0) + (data?.desktop ?? 0) + (data?.tablet ?? 0);
  const items = [
    { key: "mobile", label: "Mobile", icon: Smartphone, color: "#3b82f6", value: data?.mobile ?? 0 },
    { key: "desktop", label: "Desktop", icon: Monitor, color: "#8b5cf6", value: data?.desktop ?? 0 },
    { key: "tablet", label: "Tablet", icon: Tablet, color: "#f59e0b", value: data?.tablet ?? 0 },
  ];

  return (
    <Card>
      <div className="border-b border-gray-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Devices</h3>
        <p className="text-xs text-gray-500">Visitor device breakdown</p>
      </div>
      <div className="p-4">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={items} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={2}>
                {items.map((it) => (
                  <Cell key={it.key} fill={it.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 space-y-2">
          {items.map((it) => {
            const p = total > 0 ? (it.value / total) * 100 : 0;
            return (
              <div key={it.key} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <it.icon className="h-3.5 w-3.5" style={{ color: it.color }} />
                  <span className="text-gray-700">{it.label}</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="text-gray-500">{p.toFixed(1)}%</span>
                  <span className="font-medium text-gray-900">{it.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------ TOP PRODUCTS ------------------------------- */

function TopProducts({ range }: { range: Range }) {
  const { from, to } = useMemo(() => rangeBounds(range), [range]);

  const { data } = useQuery({
    queryKey: ["top-products", range],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data: views } = await supabase
        .from("analytics_events")
        .select("session_id,product_id")
        .eq("page_type", "product")
        .not("product_id", "is", null)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .limit(10000);

      // Count distinct sessions per product so a visitor reloading the same
      // PDP 5 times doesn't push it to the top of the list.
      const tally: Record<string, number> = {};
      const seen = new Set<string>();
      for (const v of views ?? []) {
        if (!v.product_id || !v.session_id) continue;
        const key = `${v.session_id}|${v.product_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        tally[v.product_id] = (tally[v.product_id] ?? 0) + 1;
      }

      const top = Object.entries(tally)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
      if (top.length === 0) return [];

      const ids = top.map(([id]) => id);
      const { data: products } = await supabase.from("products").select("id,title,image,price,slug").in("id", ids);
      const map = new Map((products ?? []).map((p) => [p.id, p]));
      return top.map(([id, count]) => ({ id, count, product: map.get(id) }));
    },
  });

  return (
    <Card>
      <div className="border-b border-gray-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Top Products</h3>
        <p className="text-xs text-gray-500">Most viewed in {RANGE_LABELS[range].toLowerCase()}</p>
      </div>
      <div className="divide-y divide-gray-100">
        {(data ?? []).length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">No product views yet in this range.</div>
        ) : (
          (data ?? []).map((row, i) => (
            <div key={row.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-600">
                {i + 1}
              </span>
              {row.product?.image ? (
                <img src={row.product.image} alt="" className="h-10 w-10 rounded-md object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-md bg-gray-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{row.product?.title ?? "Unknown"}</p>
                <p className="text-[11px] text-gray-500">{fmtBDT(row.product?.price ?? 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums text-gray-900">{row.count}</p>
                <p className="text-[10px] text-gray-400">views</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

/* ---------------------------- TRAFFIC SOURCES ------------------------------ */

function TrafficSources({ range }: { range: Range }) {
  const { from, to } = useMemo(() => rangeBounds(range), [range]);

  const { data } = useQuery({
    queryKey: ["traffic-sources", range],
    refetchInterval: 60_000,
    queryFn: async () => {
      // Read directly from analytics_events so traffic-source numbers match
      // funnel/conversion numbers exactly (same table, same session_id space).
      const { data: rows } = await supabase
        .from("analytics_events")
        .select("session_id,event_name,utm_source,referrer,value")
        .in("event_name", ["page_view", "purchase"])
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .limit(20000);

      const normalize = (utm: string | null, ref: string | null): string => {
        let src = utm || null;
        if (!src && ref) {
          try { src = new URL(ref).hostname.replace(/^www\./, ""); } catch { src = null; }
        }
        if (!src) return "Direct";
        const s = src.toLowerCase();
        if (s.includes("facebook") || s.includes("fb.com")) return "Facebook";
        if (s.includes("instagram")) return "Instagram";
        if (s.includes("google")) return "Google";
        if (s.includes("tiktok")) return "TikTok";
        if (s.includes("youtube")) return "YouTube";
        return src;
      };

      const tally: Record<string, { visits: number; conversions: number; revenue: number }> = {};
      for (const r of rows ?? []) {
        const name = normalize(
          (r.utm_source as string) ?? null,
          (r.referrer as string) ?? null,
        );
        if (!tally[name]) tally[name] = { visits: 0, conversions: 0, revenue: 0 };
        if (r.event_name === "page_view") tally[name].visits += 1;
        else if (r.event_name === "purchase") {
          tally[name].conversions += 1;
          tally[name].revenue += Number(r.value ?? 0);
        }
      }
      return Object.entries(tally)
        .map(([name, v]) => ({ name, count: v.visits, conversions: v.conversions, revenue: v.revenue }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    },
  });

  const total = (data ?? []).reduce((s, r) => s + r.count, 0);

  return (
    <Card>
      <div className="border-b border-gray-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Traffic Sources</h3>
        <p className="text-xs text-gray-500">Visits and conversions by source</p>
      </div>
      <div className="h-56 p-4">
        {(data ?? []).length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">No traffic data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" width={80} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Visits" />
              <Bar dataKey="conversions" fill="#10b981" radius={[0, 4, 4, 0]} name="Conversions" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {(data ?? []).length > 0 && (
        <div className="divide-y divide-gray-100 border-t border-gray-100 text-[11px]">
          {(data ?? []).slice(0, 5).map((r) => {
            const cvr = r.count > 0 ? (r.conversions / r.count) * 100 : 0;
            return (
              <div key={r.name} className="flex items-center justify-between px-5 py-1.5">
                <span className="font-medium text-gray-700">{r.name}</span>
                <span className="text-gray-500 tabular-nums">
                  {r.count.toLocaleString()} visits ·{" "}
                  <span className="font-medium text-emerald-700">{r.conversions} conv ({cvr.toFixed(1)}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ----------------------------- LIVE ORDER FEED ----------------------------- */

function LiveOrderFeed() {
  const { data } = useQuery({
    queryKey: ["live-order-feed"],
    refetchInterval: 8000,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,total,status,shipping_name,guest_name,shipping_city,created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Live Order Feed</h3>
          <p className="text-xs text-gray-500">Latest 10 orders</p>
        </div>
        <Link to="/admin/order-list" className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-gray-100">
        {(data ?? []).length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">No orders yet.</div>
        ) : (
          (data ?? []).map((o) => (
            <div key={o.id} className="flex items-center gap-3 px-5 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {o.shipping_name || o.guest_name || "Guest"}
                </p>
                <p className="text-[11px] text-gray-500">
                  {o.shipping_city ?? "—"} · {timeAgo(o.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums text-gray-900">{fmtBDT(o.total)}</p>
                <Badge tone={statusTone(o.status)}>{o.status}</Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

/* ----------------------------- RECENT ACTIVITY ----------------------------- */

function RecentActivity() {
  const { data } = useQuery({
    queryKey: ["recent-pages"],
    refetchInterval: 8000,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 60_000).toISOString();
      const { data } = await supabase
        .from("active_sessions")
        .select("session_id,path,country,user_agent,last_seen_at")
        .gte("last_seen_at", since)
        .order("last_seen_at", { ascending: false })
        .limit(15);
      return data ?? [];
    },
  });

  return (
    <Card>
      <div className="border-b border-gray-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Active Visitors</h3>
        <p className="text-xs text-gray-500">Where they are right now</p>
      </div>
      <div className="divide-y divide-gray-100">
        {(data ?? []).length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">No active visitors.</div>
        ) : (
          (data ?? []).map((s) => (
            <div key={s.session_id} className="flex items-center gap-3 px-5 py-2.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs text-gray-700">{s.path || "/"}</p>
                <p className="text-[10px] text-gray-400">{timeAgo(s.last_seen_at)}</p>
              </div>
              <Globe className="h-3.5 w-3.5 text-gray-300" />
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

/* --------------------------------- HELPERS --------------------------------- */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function statusTone(status: string): "gray" | "green" | "red" | "yellow" | "blue" | "purple" {
  switch (status) {
    case "delivered":
      return "green";
    case "cancelled":
    case "fake":
      return "red";
    case "new":
      return "yellow";
    case "confirmed":
    case "shipped":
      return "blue";
    case "packaging":
    case "packed":
      return "purple";
    default:
      return "gray";
  }
}
