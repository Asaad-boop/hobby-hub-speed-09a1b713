import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Loading, fmtBDT, Btn } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const [orders, byStatus, topProducts] = await Promise.all([
        supabase.from("orders").select("id,total,created_at,status").gte("created_at", since).limit(2000),
        supabase.from("orders").select("status"),
        supabase.from("order_items").select("product_id,name,quantity,line_total"),
      ]);

      const totalRevenue = (orders.data ?? []).filter(o => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0);
      const totalOrders = orders.data?.length ?? 0;

      const statusCounts: Record<string, number> = {};
      for (const o of byStatus.data ?? []) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

      const productAgg: Record<string, { name: string; qty: number; revenue: number }> = {};
      for (const i of topProducts.data ?? []) {
        const k = i.product_id;
        if (!productAgg[k]) productAgg[k] = { name: i.name, qty: 0, revenue: 0 };
        productAgg[k].qty += i.quantity;
        productAgg[k].revenue += Number(i.line_total ?? 0);
      }
      const top = Object.values(productAgg).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      // Daily series
      const days: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
        days[d] = 0;
      }
      for (const o of orders.data ?? []) {
        if (o.status !== "delivered") continue;
        const d = o.created_at.slice(0, 10);
        if (d in days) days[d] += Number(o.total);
      }

      return { totalRevenue, totalOrders, statusCounts, top, days };
    },
  });

  if (isLoading || !data) return <><PageHeader title="Reports" /><Loading /></>;

  const max = Math.max(1, ...Object.values(data.days));

  const reportData = data;
  const exportCsv = () => {
    const lines = ["Date,Revenue"];
    for (const [d, v] of Object.entries(reportData.days)) lines.push(`${d},${v}`);
    lines.push("");
    lines.push("Top Products,Qty,Revenue");
    for (const p of reportData.top) lines.push(`"${p.name.replace(/"/g, '""')}",${p.qty},${p.revenue}`);
    lines.push("");
    lines.push("Status,Count");
    for (const [s, c] of Object.entries(reportData.statusCounts)) lines.push(`${s},${c}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Last 30 days"
        actions={
          <Btn variant="primary" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Btn>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Revenue (delivered)" value={fmtBDT(data.totalRevenue)} />
        <Stat label="Orders (30d)" value={String(data.totalOrders)} />
        <Stat label="Avg. order value" value={fmtBDT(data.totalOrders ? data.totalRevenue / data.totalOrders : 0)} />
      </div>

      <Card className="mb-4 p-5">
        <div className="mb-3 text-sm font-semibold">Daily revenue</div>
        <div className="flex h-40 items-end gap-1">
          {Object.entries(data.days).map(([d, v]) => (
            <div key={d} className="flex-1 bg-gray-900/80 rounded-t" style={{ height: `${(v / max) * 100}%`, minHeight: 2 }} title={`${d}: ${fmtBDT(v)}`} />
          ))}
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Status breakdown</div>
          <div className="space-y-1.5 text-sm">
            {Object.entries(data.statusCounts).sort((a, b) => b[1] - a[1]).map(([s, c]) => (
              <div key={s} className="flex justify-between"><span className="capitalize text-gray-600">{s.replace(/_/g, " ")}</span><span className="font-medium">{c}</span></div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">Top products by revenue</div>
          <table className="w-full text-sm">
            <tbody>
              {data.top.map((p) => (
                <tr key={p.name} className="border-b border-gray-100">
                  <td className="py-1.5">{p.name}</td>
                  <td className="py-1.5 text-right text-gray-500">{p.qty}</td>
                  <td className="py-1.5 text-right font-medium">{fmtBDT(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </Card>
  );
}
