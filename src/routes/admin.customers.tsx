import { createFileRoute } from "@tanstack/react-router";
import { AdminErrorPanel } from "@/components/admin/AdminErrorPanel";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Flag } from "lucide-react";
import { listCustomers } from "@/server/oms.functions";
import { Card, Loading, MetricCard, PageHeader, Empty } from "@/components/admin/ui";
import { fmtBDT, fmtDateShort } from "@/lib/oms";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersPage,
  errorComponent: AdminErrorPanel,
});

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function CustomersPage() {
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["oms", "customers"],
    queryFn: () => listCustomers(),
  });

  const customerRows = useMemo(
    () => safeArray(q.data).filter((c): c is NonNullable<typeof c> => !!c && !!c.id),
    [q.data],
  );

  const customers = useMemo(() => {
    const list = customerRows;
    if (!search) return list;
    const term = search.toLowerCase();
    return list.filter((c) => (c.display_name ?? "").toLowerCase().includes(term));
  }, [customerRows, search]);

  const stats = useMemo(() => {
    const list = customerRows;
    return {
      total: list.length,
      flagged: list.filter((c) => !!c.is_flagged).length,
      vip: list.filter((c) => c.customer_segment === "vip").length,
      revenue: list.reduce((s, c) => {
        const v = Number(c.total_spent ?? 0);
        return s + (Number.isFinite(v) ? v : 0);
      }, 0),
    };
  }, [customerRows]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Customers" subtitle={`${stats.total} registered`} />
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Total Customers" value={stats.total} />
          <MetricCard label="VIP" value={stats.vip} hint="6+ orders" accent />
          <MetricCard
            label="Flagged"
            value={stats.flagged}
            hint="Risk customers"
            icon={<Flag className="h-4 w-4" />}
          />
          <MetricCard label="Lifetime Value" value={fmtBDT(stats.revenue)} />
        </div>

        <Card className="mt-6">
          <div className="border-b border-border p-3">
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name…"
                className="h-8 w-full rounded-md border border-border bg-white pl-8 pr-3 text-sm outline-none focus:border-[#1D9E75]"
              />
            </div>
          </div>
          {q.isLoading ? (
            <Loading />
          ) : customers.length === 0 ? (
            <Empty label="No customers" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Name</th>
                    <th className="px-3 py-2.5 text-center">Segment</th>
                    <th className="px-3 py-2.5 text-right">Orders</th>
                    <th className="px-3 py-2.5 text-right">Spent</th>
                    <th className="px-3 py-2.5 text-center">Cancellations</th>
                    <th className="px-3 py-2.5 text-center">Fake Orders</th>
                    <th className="px-3 py-2.5 text-left">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.display_name ?? "—"}</span>
                          {c.is_flagged && (
                            <span
                              title={c.flag_reason ?? "Flagged"}
                              className="inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                            >
                              <Flag className="h-2.5 w-2.5" /> Flag
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            c.customer_segment === "vip"
                              ? "bg-violet-100 text-violet-700"
                              : c.customer_segment === "regular"
                                ? "bg-sky-100 text-sky-700"
                                : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {c.customer_segment ?? "new"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{c.total_orders ?? 0}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {fmtBDT(Number(c.total_spent ?? 0))}
                      </td>
                      <td className="px-3 py-2 text-center text-muted-foreground">
                        {c.cancellation_count}
                      </td>
                      <td className="px-3 py-2 text-center text-muted-foreground">
                        {c.fake_order_count}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {fmtDateShort(c.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
