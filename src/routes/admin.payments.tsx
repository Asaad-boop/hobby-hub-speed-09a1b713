import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Loading, fmtBDT, fmtDate, Badge, Btn, Input, Select, Empty } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/payments")({
  component: PaymentsPage,
});

type OrderRow = {
  id: string;
  total: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  shipping_name: string | null;
  guest_name: string | null;
  shipping_phone: string | null;
  guest_phone: string | null;
};

function methodLabel(m: string | null | undefined) {
  if (!m) return "COD";
  const k = m.toLowerCase();
  if (k.includes("bkash")) return "bKash";
  if (k.includes("nagad")) return "Nagad";
  if (k.includes("rocket")) return "Rocket";
  if (k.includes("card")) return "Card";
  if (k.includes("cod") || k.includes("cash")) return "COD";
  return m;
}

function methodTone(m: string): "purple" | "yellow" | "blue" | "gray" | "green" {
  switch (m) {
    case "bKash": return "purple";
    case "Nagad": return "yellow";
    case "Rocket": return "purple";
    case "Card": return "blue";
    case "COD": return "gray";
    default: return "gray";
  }
}

function paymentStatus(status: string): { label: string; tone: "green" | "yellow" | "red" | "gray" } {
  if (status === "delivered") return { label: "Paid", tone: "green" };
  if (status === "cancelled" || status === "fake" || status === "returned") return { label: "Failed", tone: "red" };
  if (status === "new" || status === "confirmed") return { label: "Pending", tone: "yellow" };
  return { label: "In progress", tone: "gray" };
}

function PaymentsPage() {
  const [method, setMethod] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,total,status,payment_method,created_at,shipping_name,guest_name,shipping_phone,guest_phone")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    return data
      .map((o) => ({
        ...o,
        method: methodLabel(o.payment_method),
        customer: o.shipping_name || o.guest_name || "—",
        phone: o.shipping_phone || o.guest_phone || "",
        pay: paymentStatus(o.status),
      }))
      .filter((r) => (method === "all" ? true : r.method === method))
      .filter((r) => (status === "all" ? true : r.pay.label === status))
      .filter((r) =>
        search.trim() === ""
          ? true
          : r.customer.toLowerCase().includes(search.toLowerCase()) ||
            r.phone.includes(search) ||
            r.id.toLowerCase().includes(search.toLowerCase()),
      );
  }, [data, method, status, search]);

  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.pay.label === "Paid").reduce((s, r) => s + Number(r.total), 0);
    const pending = rows.filter((r) => r.pay.label === "Pending").reduce((s, r) => s + Number(r.total), 0);
    return { paid, pending, count: rows.length };
  }, [rows]);

  function exportCsv() {
    const header = ["Order ID", "Date", "Customer", "Phone", "Method", "Status", "Amount"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.id.slice(0, 8),
          new Date(r.created_at).toISOString(),
          `"${r.customer.replace(/"/g, '""')}"`,
          r.phone,
          r.method,
          r.pay.label,
          r.total,
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Transaction log derived from order data"
        actions={
          <Btn variant="primary" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Btn>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Paid (filtered)" value={fmtBDT(totals.paid)} tone="green" />
        <KpiCard label="Pending" value={fmtBDT(totals.pending)} tone="yellow" />
        <KpiCard label="Transactions" value={String(totals.count)} tone="blue" />
      </div>

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer, phone, order id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={method} onChange={(e) => setMethod(e.target.value)} className="w-36">
            <option value="all">All methods</option>
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
            <option value="Rocket">Rocket</option>
            <option value="Card">Card</option>
            <option value="COD">COD</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-36">
            <option value="all">All status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="In progress">In progress</option>
            <option value="Failed">Failed</option>
          </Select>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="No transactions" description="Try adjusting filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Method</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">#{r.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.customer}</div>
                      {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={methodTone(r.method)}>{r.method}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={r.pay.tone}>{r.pay.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmtBDT(r.total)}</td>
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

function KpiCard({ label, value, tone }: { label: string; value: string; tone: "green" | "yellow" | "blue" }) {
  const tones: Record<string, string> = {
    green: "from-emerald-500/10 to-emerald-500/0 border-emerald-200/50",
    yellow: "from-amber-500/10 to-amber-500/0 border-amber-200/50",
    blue: "from-sky-500/10 to-sky-500/0 border-sky-200/50",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${tones[tone]}`}>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
