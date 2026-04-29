import { createFileRoute } from "@tanstack/react-router";
import { AdminErrorPanel } from "@/components/admin/AdminErrorPanel";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardStats } from "@/server/oms.functions";
import { Card, Loading, PageHeader } from "@/components/admin/ui";
import { fmtBDT } from "@/lib/oms";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
  errorComponent: AdminErrorPanel,
});

const COLORS = ["#94a3b8", "#10b981", "#0ea5e9", "#22c55e", "#f43f5e", "#a1a1aa"];

function AnalyticsPage() {
  const qRaw = useQuery({ queryKey: ["oms", "dashboard"], queryFn: () => getDashboardStats() });
  const q = {
    ...qRaw,
    data: qRaw.data
      ? {
          series: Array.isArray(qRaw.data.series) ? qRaw.data.series : [],
          stageCount:
            qRaw.data.stageCount && typeof qRaw.data.stageCount === "object"
              ? (qRaw.data.stageCount as Record<string, number>)
              : ({} as Record<string, number>),
        }
      : undefined,
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Analytics" subtitle="Trends & breakdowns" />
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {q.isLoading || !q.data ? (
          <Loading />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-3 text-sm font-semibold">Daily orders (14d)</div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={q.data.series}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="orders" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-3 text-sm font-semibold">Revenue trend (14d)</div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={q.data.series}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: unknown) => [fmtBDT(Number(v)), "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5 lg:col-span-2">
              <div className="mb-3 text-sm font-semibold">Order status distribution</div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(q.data.stageCount).map(([name, value]) => ({
                        name,
                        value: Number(value) || 0,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label
                    >
                      {Object.keys(q.data.stageCount).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
