import { useOpsStore } from "@/lib/ops-store";
import { formatBDT } from "@/lib/mock-data";
import { MetricCard, PageHeader, StatusBadge, FraudBadge } from "@/components/admin/ui";

export default function DashboardPage() {
  const orders = useOpsStore((s) => s.orders);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isToday = (iso: string) => new Date(iso) >= today;

  const todayOrders = orders.filter((o) => isToday(o.createdAt));
  const todayRevenue = todayOrders.filter((o) => o.status !== "Cancelled").reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === "Pending").length;
  const inTransit = orders.filter((o) => o.status === "Shipped").length;
  const delivered = orders.filter((o) => o.status === "Delivered").length;
  const total = orders.length || 1;
  const successRate = Math.round((delivered / total) * 100);
  const fraudBlocked = orders.filter((o) => o.fraudScore >= 70).length;

  const recent = [...orders].slice(0, 10);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Dashboard" subtitle="Today's performance overview" />
      <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Today's Orders" value={todayOrders.length} accent />
          <MetricCard label="Pending" value={pending} hint="Awaiting confirm" />
          <MetricCard label="In Transit" value={inTransit} hint="Shipped via courier" />
          <MetricCard label="Today's Revenue" value={formatBDT(todayRevenue)} accent />
          <MetricCard label="Delivery Success" value={`${successRate}%`} hint={`${delivered} delivered`} />
          <MetricCard label="Fraud Blocked" value={fraudBlocked} hint="High-risk flagged" />
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
              <p className="text-xs text-muted-foreground">Last {recent.length} orders</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Order ID</th>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-left">Phone</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-left">Courier</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Fraud Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground">{o.id}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{o.customerName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{o.phone}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-foreground">{formatBDT(o.total)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{o.courier}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-2.5"><FraudBadge score={o.fraudScore} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
