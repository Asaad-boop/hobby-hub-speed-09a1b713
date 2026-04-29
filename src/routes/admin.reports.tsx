import { createFileRoute } from "@tanstack/react-router";
import { AdminErrorPanel } from "@/components/admin/AdminErrorPanel";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSalesReport } from "@/server/oms.functions";
import { Card, Loading, MetricCard, PageHeader } from "@/components/admin/ui";
import { fmtBDT } from "@/lib/oms";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
  errorComponent: AdminErrorPanel,
});

function ReportsPage() {
  const [days, setDays] = useState(30);
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(Date.now() - days * 86400_000);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  }, [days]);

  const q = useQuery({
    queryKey: ["oms", "report", days],
    queryFn: () => getSalesReport({ data: range }),
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title="Reports"
        subtitle={`Last ${days} days`}
        actions={
          <div className="flex items-center gap-1.5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  days === d
                    ? "bg-[#1D9E75] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {q.isLoading || !q.data ? (
          <Loading />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard label="Total Orders" value={q.data.totalOrders} />
              <MetricCard label="Delivered" value={q.data.delivered} accent />
              <MetricCard
                label="Total Revenue"
                value={fmtBDT(q.data.totalRevenue)}
                accent
                hint="From delivered"
              />
              <MetricCard label="Success Rate" value={`${q.data.successRate}%`} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <div className="mb-3 text-sm font-semibold">By status</div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {Object.entries(q.data.byStatus).map(([k, v]) => (
                      <tr key={k}>
                        <td className="py-2 capitalize">{k}</td>
                        <td className="py-2 text-right text-muted-foreground">{v.count}</td>
                        <td className="py-2 text-right font-semibold">{fmtBDT(v.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card className="p-5">
                <div className="mb-3 text-sm font-semibold">By courier</div>
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-2 text-left">Courier</th>
                      <th className="pb-2 text-right">Total</th>
                      <th className="pb-2 text-right">Delivered</th>
                      <th className="pb-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.entries(q.data.byCourier).map(([k, v]) => (
                      <tr key={k}>
                        <td className="py-2">{k}</td>
                        <td className="py-2 text-right text-muted-foreground">{v.count}</td>
                        <td className="py-2 text-right">
                          {v.delivered}{" "}
                          <span className="text-[10px] text-muted-foreground">
                            ({v.count ? Math.round((v.delivered / v.count) * 100) : 0}%)
                          </span>
                        </td>
                        <td className="py-2 text-right font-semibold">{fmtBDT(v.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
