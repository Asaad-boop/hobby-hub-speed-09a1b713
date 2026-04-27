import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Loading, fmtBDT, Badge } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [pending, pipeline, todayOrders, lowStock] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["confirmed", "ready_to_pack", "packed", "ready_to_ship", "courier_entry", "shipped", "in_transit"]),
        supabase.from("orders").select("total,status").gte("created_at", today.toISOString()),
        supabase.from("products").select("id,title,stock").lte("stock", 5).eq("is_active", true).order("stock").limit(8),
      ]);
      const todayRevenue = (todayOrders.data ?? []).filter(o => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0);
      return {
        pendingCount: pending.count ?? 0,
        pipelineCount: pipeline.count ?? 0,
        todayCount: todayOrders.data?.length ?? 0,
        todayRevenue,
        lowStock: lowStock.data ?? [],
      };
    },
  });

  if (isLoading || !data) return <><PageHeader title="Dashboard" /><Loading /></>;

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of today's activity" />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New web orders" value={String(data.pendingCount)} link="/admin/web-orders" tone="blue" />
        <StatCard label="In pipeline" value={String(data.pipelineCount)} link="/admin/orders-pipeline" tone="purple" />
        <StatCard label="Orders today" value={String(data.todayCount)} tone="gray" />
        <StatCard label="Revenue today" value={fmtBDT(data.todayRevenue)} tone="green" />
      </div>

      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">Low stock alerts</div>
        {data.lowStock.length === 0 ? (
          <div className="text-sm text-gray-500">All products well stocked. ✨</div>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {data.lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span>{p.title}</span>
                <Badge tone={p.stock === 0 ? "red" : "yellow"}>{p.stock} left</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, link, tone }: { label: string; value: string; link?: string; tone: "blue" | "purple" | "gray" | "green" }) {
  const tones: Record<string, string> = {
    blue: "from-blue-50 to-white border-blue-100",
    purple: "from-purple-50 to-white border-purple-100",
    gray: "from-gray-50 to-white border-gray-100",
    green: "from-green-50 to-white border-green-100",
  };
  const Inner = (
    <div className={`rounded-lg border bg-gradient-to-br p-4 ${tones[tone]}`} style={{ borderWidth: "0.5px" }}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
  return link ? <Link to={link}>{Inner}</Link> : Inner;
}
