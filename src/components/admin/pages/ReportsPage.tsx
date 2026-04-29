import { useMemo, useState } from "react";
import { useOpsStore } from "@/lib/ops-store";
import { COURIERS, formatBDT, type CourierName } from "@/lib/mock-data";
import { MetricCard, PageHeader, Select } from "@/components/admin/ui";

type Range = "week" | "month" | "all";

export default function ReportsPage() {
  const orders = useOpsStore((s) => s.orders);
  const products = useOpsStore((s) => s.products);
  const [range, setRange] = useState<Range>("month");

  const filtered = useMemo(() => {
    const cutoff = new Date();
    if (range === "week") cutoff.setDate(cutoff.getDate() - 7);
    else if (range === "month") cutoff.setMonth(cutoff.getMonth() - 1);
    else cutoff.setFullYear(cutoff.getFullYear() - 5);
    return orders.filter((o) => new Date(o.createdAt) >= cutoff);
  }, [orders, range]);

  const totalRevenue = filtered.filter((o) => o.status !== "Cancelled").reduce((s, o) => s + o.total, 0);
  const totalOrders = filtered.length;
  const aov = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;
  const delivered = filtered.filter((o) => o.status === "Delivered").length;
  const deliveryRate = totalOrders ? Math.round((delivered / totalOrders) * 100) : 0;
  const returnRate = 4; // mock
  const fraudBlocked = filtered.filter((o) => o.fraudScore >= 70).length;
  const amountSaved = filtered.filter((o) => o.fraudScore >= 70).reduce((s, o) => s + o.total, 0);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; units: number; revenue: number }>();
    filtered.forEach((o) => o.items.forEach((it) => {
      const cur = map.get(it.sku) ?? { name: it.name, units: 0, revenue: 0 };
      cur.units += it.quantity;
      cur.revenue += it.price * it.quantity;
      map.set(it.sku, cur);
    }));
    return [...map.entries()].map(([sku, v]) => ({ sku, ...v, returnRate: Math.round(Math.random() * 8) }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [filtered]);

  const courierPerf = useMemo(() => {
    return COURIERS.map((c) => {
      const list = filtered.filter((o) => o.courier === c.name);
      const dl = list.filter((o) => o.status === "Delivered").length;
      const it = list.filter((o) => o.status === "Shipped").length;
      const fl = list.filter((o) => o.status === "Cancelled").length;
      return {
        name: c.name as CourierName,
        total: list.length,
        delivered: dl,
        inTransit: it,
        failed: fl,
        avgDays: list.length ? (1.5 + (list.length % 3) * 0.7).toFixed(1) : "—",
      };
    });
  }, [filtered]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Reports" subtitle="Business performance overview" actions={
        <Select value={range} onChange={(e) => setRange(e.target.value as Range)} className="w-44">
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="all">All Time</option>
        </Select>
      } />
      <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Total Revenue" value={formatBDT(totalRevenue)} accent />
          <MetricCard label="Total Orders" value={totalOrders} />
          <MetricCard label="Avg Order Value" value={formatBDT(aov)} />
          <MetricCard label="Delivery Rate" value={`${deliveryRate}%`} />
          <MetricCard label="Return Rate" value={`${returnRate}%`} />
          <MetricCard label="Fraud Blocked" value={`${fraudBlocked}`} hint={`Saved ${formatBDT(amountSaved)}`} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-foreground">Top Products</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-right">Units</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">Return %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topProducts.map((p) => (
                  <tr key={p.sku}>
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-right">{p.units}</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatBDT(p.revenue)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{p.returnRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-foreground">Courier Performance</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Courier</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-right">Delivered</th>
                  <th className="px-4 py-2 text-right">In Transit</th>
                  <th className="px-4 py-2 text-right">Failed</th>
                  <th className="px-4 py-2 text-right">Avg Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {courierPerf.map((c) => (
                  <tr key={c.name}>
                    <td className="px-4 py-2 font-medium">{c.name}</td>
                    <td className="px-4 py-2 text-right">{c.total}</td>
                    <td className="px-4 py-2 text-right text-emerald-700">{c.delivered}</td>
                    <td className="px-4 py-2 text-right text-blue-700">{c.inTransit}</td>
                    <td className="px-4 py-2 text-right text-rose-700">{c.failed}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{c.avgDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Note: products variable referenced for type only */}
        <div className="hidden">{products.length}</div>
      </div>
    </div>
  );
}
