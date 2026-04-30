import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Loading, Empty, Badge, Input, fmtBDT, fmtDate } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersPage,
});

type Profile = {
  id: string; display_name: string | null; customer_segment: string | null;
  total_orders: number | null; total_spent: number | null;
  is_flagged: boolean; flag_reason: string | null;
  fake_order_count: number; cancellation_count: number;
  created_at: string;
};

function CustomersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as Profile[];
    },
  });
  const filtered = (data ?? []).filter((p) => !search || (p.display_name ?? "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Customers" description={`${data?.length ?? 0} profiles`}
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-7 w-64" />
          </div>
        }
      />
      <Card>
        {isLoading ? <Loading /> : filtered.length === 0 ? <Empty title="No customers" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Segment</th>
                  <th className="px-4 py-2 text-left font-medium">Orders</th>
                  <th className="px-4 py-2 text-left font-medium">Spent</th>
                  <th className="px-4 py-2 text-left font-medium">Cancelled / Fake</th>
                  <th className="px-4 py-2 text-left font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="font-medium flex items-center gap-2">
                        {p.display_name ?? "—"}
                        {p.is_flagged && <Badge tone="red">Flagged</Badge>}
                      </div>
                      {p.flag_reason && <div className="text-[11px] text-red-500">{p.flag_reason}</div>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={p.customer_segment === "vip" ? "purple" : p.customer_segment === "regular" ? "blue" : "gray"}>
                        {p.customer_segment ?? "new"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">{p.total_orders ?? 0}</td>
                    <td className="px-4 py-2.5 font-medium">{fmtBDT(p.total_spent)}</td>
                    <td className="px-4 py-2.5 text-xs">{p.cancellation_count} / {p.fake_order_count}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(p.created_at)}</td>
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
