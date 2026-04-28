import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, ShoppingBag, Users, Percent, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Loading, fmtBDT, Badge } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const since14 = new Date(Date.now() - 13 * 86400_000).toISOString();

      const [pending, pipeline, todayOrders, lowStock, customers, recent, last14] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["confirmed", "ready_to_pack", "packed", "ready_to_ship", "courier_entry", "shipped", "in_transit"]),
        supabase.from("orders").select("total,status").gte("created_at", today.toISOString()),
        supabase.from("products").select("id,title,stock").lte("stock", 5).eq("is_active", true).order("stock").limit(6),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("id,total,status,shipping_name,guest_name,created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase.from("orders").select("total,status,created_at").gte("created_at", since14).limit(2000),
      ]);

      const todayRevenue = (todayOrders.data ?? [])
        .filter((o) => o.status === "delivered")
        .reduce((s, o) => s + Number(o.total), 0);

      const totalRevenue14 = (last14.data ?? [])
        .filter((o) => o.status === "delivered")
        .reduce((s, o) => s + Number(o.total), 0);
      const total14 = last14.data?.length ?? 0;
      const delivered14 = (last14.data ?? []).filter((o) => o.status === "delivered").length;
      const conversion = total14 > 0 ? (delivered14 / total14) * 100 : 0;

      // Build 14-day series
      const days: Record<string, { date: string; revenue: number; orders: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
        days[d] = { date: d.slice(5), revenue: 0, orders: 0 };
      }
      for (const o of last14.data ?? []) {
        const d = o.created_at.slice(0, 10);
        if (d in days) {
          days[d].orders += 1;
          if (o.status === "delivered") days[d].revenue += Number(o.total);
        }
      }

      return {
        pendingCount: pending.count ?? 0,
        pipelineCount: pipeline.count ?? 0,
        todayCount: todayOrders.data?.length ?? 0,
        todayRevenue,
        revenue14: totalRevenue14,
        orders14: total14,
        customers: customers.count ?? 0,
        conversion,
        lowStock: lowStock.data ?? [],
        recent: recent.data ?? [],
        series: Object.values(days),
      };
    },
  });

  if (isLoading || !data) return (<><PageHeader title="Dashboard" /><Loading /></>);

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of store performance — last 14 days" />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue (14d)"
          value={fmtBDT(data.revenue14)}
          sub={`Today ${fmtBDT(data.todayRevenue)}`}
          icon={TrendingUp}
          tone="emerald"
        />
        <KpiCard
          label="Orders (14d)"
          value={String(data.orders14)}
          sub={`${data.pendingCount} new · ${data.pipelineCount} pipeline`}
          icon={ShoppingBag}
          tone="violet"
        />
        <KpiCard
          label="Customers"
          value={String(data.customers)}
          sub="Total registered"
          icon={Users}
          tone="sky"
        />
        <KpiCard
          label="Conversion"
          value={data.conversion.toFixed(1) + "%"}
          sub="Delivered / total"
          icon={Percent}
          tone="amber"
        />
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Sales overview</div>
              <div className="text-xs text-muted-foreground">Daily revenue & orders, last 14 days</div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.585 0.245 27.5)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.585 0.245 27.5)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "oklch(0.45 0 0)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.45 0 0)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid oklch(0.92 0 0)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: any, k) => (k === "revenue" ? [fmtBDT(Number(v)), "Revenue"] : [v, "Orders"])}
                />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.585 0.245 27.5)" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Low stock</div>
            <Link to="/admin/inventory" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.lowStock.length === 0 ? (
            <div className="text-sm text-muted-foreground">All products well stocked ✨</div>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {data.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <span className="truncate pr-2">{p.title}</span>
                  <Badge tone={p.stock === 0 ? "red" : "yellow"}>{p.stock} left</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Recent orders</div>
          <Link to="/admin/web-orders" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <div className="text-sm text-muted-foreground">No orders yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 font-medium">Order</th>
                  <th className="py-2 font-medium">Customer</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((o: any) => (
                  <tr key={o.id} className="border-b border-border/60">
                    <td className="py-2 font-mono text-xs">#{o.id.slice(0, 8)}</td>
                    <td className="py-2">{o.shipping_name || o.guest_name || "—"}</td>
                    <td className="py-2"><Badge tone={statusTone(o.status)}>{o.status}</Badge></td>
                    <td className="py-2 text-right font-medium">{fmtBDT(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function statusTone(s: string): "green" | "yellow" | "red" | "blue" | "gray" {
  if (s === "delivered") return "green";
  if (s === "new") return "blue";
  if (s === "cancelled" || s === "fake" || s === "returned") return "red";
  return "yellow";
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof TrendingUp;
  tone: "emerald" | "violet" | "sky" | "amber";
}) {
  const tones: Record<string, string> = {
    emerald: "from-emerald-500/15 to-transparent border-emerald-200/50 text-emerald-700",
    violet: "from-violet-500/15 to-transparent border-violet-200/50 text-violet-700",
    sky: "from-sky-500/15 to-transparent border-sky-200/50 text-sky-700",
    amber: "from-amber-500/15 to-transparent border-amber-200/50 text-amber-700",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
          {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
        </div>
        <div className="rounded-lg bg-white/60 p-2 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
