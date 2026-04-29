import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminErrorPanel } from "@/components/admin/AdminErrorPanel";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag,
  TrendingUp,
  PackageCheck,
  Truck,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardStats } from "@/server/oms.functions";
import { Card, Loading, MetricCard, PageHeader, StageBadge } from "@/components/admin/ui";
import { deriveStage, fmtBDT, fmtDateShort, shortId } from "@/lib/oms";

export const Route = createFileRoute("/admin/dashboard")({
  component: DashboardPage,
  errorComponent: AdminErrorPanel,
});

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["oms", "dashboard"],
    queryFn: () => getDashboardStats(),
    refetchInterval: 30_000,
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Dashboard" subtitle="Today's performance overview" />
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading || !data ? (
          <Loading />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <MetricCard
                label="Today's Orders"
                value={data.todayOrders}
                accent
                icon={<ShoppingBag className="h-4 w-4" />}
              />
              <MetricCard
                label="Today's Revenue"
                value={fmtBDT(data.todayRevenue)}
                accent
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <MetricCard
                label="Pending"
                value={data.pending}
                hint="Needs action"
                icon={<Clock className="h-4 w-4" />}
              />
              <MetricCard
                label="Confirmed"
                value={data.confirmed}
                icon={<PackageCheck className="h-4 w-4" />}
              />
              <MetricCard
                label="Shipped"
                value={data.shipped}
                hint="In transit"
                icon={<Truck className="h-4 w-4" />}
              />
              <MetricCard
                label="Success Rate"
                value={`${data.successRate}%`}
                hint={`${data.delivered} delivered`}
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Sales overview</div>
                    <div className="text-xs text-muted-foreground">
                      Last 14 days · revenue & orders
                    </div>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1D9E75" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#1D9E75" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "oklch(0.45 0 0)" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "oklch(0.45 0 0)" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "white",
                          border: "1px solid oklch(0.92 0 0)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: unknown, k: string) =>
                          k === "revenue"
                            ? [fmtBDT(Number(v)), "Revenue"]
                            : [String(v), "Orders"]
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#1D9E75"
                        strokeWidth={2}
                        fill="url(#rev)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold">Low stock</div>
                  <Link
                    to="/admin/inventory"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1D9E75] hover:underline"
                  >
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {data.lowStock.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Everything stocked up ✨
                  </div>
                ) : (
                  <ul className="divide-y divide-border text-sm">
                    {data.lowStock.map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-2">
                        <span className="truncate pr-2">{p.title}</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            p.stock === 0
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {p.stock === 0 && <AlertTriangle className="h-3 w-3" />}
                          {p.stock} left
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <Card className="mt-4 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold">Recent orders</div>
                <Link
                  to="/admin/orders"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1D9E75] hover:underline"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {data.recent.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No orders yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="py-2 pr-2 text-left">Order</th>
                        <th className="py-2 pr-2 text-left">Customer</th>
                        <th className="py-2 pr-2 text-left">Phone</th>
                        <th className="py-2 pr-2 text-left">Stage</th>
                        <th className="py-2 pr-2 text-left">Courier</th>
                        <th className="py-2 pr-2 text-left">Date</th>
                        <th className="py-2 pl-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.recent.map((o) => {
                        const stage = deriveStage({
                          status: o.status,
                          confirmation_status: o.confirmation_status,
                          call_status: o.call_status,
                          hold_until: o.hold_until,
                          advance_amount: o.advance_amount,
                        });
                        return (
                          <tr key={o.id} className="hover:bg-muted/40">
                            <td className="py-2 pr-2 font-mono text-xs">{shortId(o.id)}</td>
                            <td className="py-2 pr-2">
                              {o.shipping_name ?? o.guest_name ?? "—"}
                            </td>
                            <td className="py-2 pr-2 text-muted-foreground">
                              {o.shipping_phone ?? o.guest_phone ?? "—"}
                            </td>
                            <td className="py-2 pr-2">
                              <StageBadge stage={stage} />
                            </td>
                            <td className="py-2 pr-2 text-muted-foreground">
                              {o.courier_name ?? "—"}
                            </td>
                            <td className="py-2 pr-2 text-muted-foreground">
                              {fmtDateShort(o.created_at)}
                            </td>
                            <td className="py-2 pl-2 text-right font-semibold">
                              {fmtBDT(Number(o.total))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {data.cancelled > 0 || data.returned > 0 ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800">
                <XCircle className="h-4 w-4" />
                <span>
                  All-time: {data.cancelled} cancelled · {data.returned} returned
                </span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
