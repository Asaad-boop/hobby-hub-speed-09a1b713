import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, FileDown, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchExpensesByCategory,
  fetchMonthlyPnL,
  fetchPnLSummary,
} from "@/lib/accounting";

export const Route = createFileRoute("/admin/accounting")({
  head: () => ({ meta: [{ title: "Accounting — Admin" }] }),
  component: AdminAccountingPage,
});

function fmt(n: number) {
  return `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
}

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#84cc16"];

function presetRange(preset: string): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const start = new Date(today);
  if (preset === "today") {
    return { from: to, to };
  }
  if (preset === "7d") start.setDate(start.getDate() - 6);
  else if (preset === "30d") start.setDate(start.getDate() - 29);
  else if (preset === "mtd") start.setDate(1);
  else if (preset === "ytd") { start.setMonth(0); start.setDate(1); }
  else if (preset === "12m") start.setMonth(start.getMonth() - 11);
  return { from: start.toISOString().slice(0, 10), to };
}

function AdminAccountingPage() {
  const [preset, setPreset] = useState("30d");
  const [{ from, to }, setRange] = useState(presetRange("30d"));

  const onPresetChange = (v: string) => {
    setPreset(v);
    if (v !== "custom") setRange(presetRange(v));
  };

  const { data: summary } = useQuery({
    queryKey: ["admin", "accounting", "summary", from, to],
    queryFn: () => fetchPnLSummary(from, to),
  });

  const { data: monthly = [] } = useQuery({
    queryKey: ["admin", "accounting", "monthly"],
    queryFn: () => fetchMonthlyPnL(12),
  });

  const { data: byCategory = [] } = useQuery({
    queryKey: ["admin", "accounting", "byCategory", from, to],
    queryFn: () => fetchExpensesByCategory(from, to),
  });

  const kpis = useMemo(() => {
    const s = summary ?? { revenue: 0, expenses: 0, profit: 0, orders: 0, margin: 0 };
    return [
      { label: "Revenue", value: fmt(s.revenue), icon: DollarSign, color: "text-emerald-600" },
      { label: "Expenses", value: fmt(s.expenses), icon: TrendingDown, color: "text-rose-600" },
      { label: "Net profit", value: fmt(s.profit), icon: TrendingUp, color: s.profit >= 0 ? "text-emerald-600" : "text-rose-600" },
      { label: "Orders", value: s.orders.toLocaleString(), icon: ShoppingBag, color: "text-indigo-600" },
    ];
  }, [summary]);

  const exportCSV = () => {
    const rows = [
      ["Month", "Revenue", "Expenses", "Profit"],
      ...monthly.map((m) => [m.month, m.revenue.toFixed(2), m.expenses.toFixed(2), m.profit.toFixed(2)]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pnl-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const s = summary ?? { revenue: 0, expenses: 0, profit: 0, orders: 0, margin: 0 };
    doc.setFontSize(16);
    doc.text("Profit & Loss Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Period: ${from} to ${to}`, 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [["Metric", "Value"]],
      body: [
        ["Revenue", `BDT ${s.revenue.toFixed(2)}`],
        ["Expenses", `BDT ${s.expenses.toFixed(2)}`],
        ["Net Profit", `BDT ${s.profit.toFixed(2)}`],
        ["Orders", String(s.orders)],
        ["Profit margin", `${s.margin.toFixed(2)}%`],
      ],
    });

    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10,
      head: [["Month", "Revenue", "Expenses", "Profit"]],
      body: monthly.map((m) => [m.month, m.revenue.toFixed(2), m.expenses.toFixed(2), m.profit.toFixed(2)]),
    });

    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10,
      head: [["Expense category", "Amount"]],
      body: byCategory.map((c) => [c.category, c.amount.toFixed(2)]),
    });

    doc.save(`pnl-${from}-to-${to}.pdf`);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <TrendingUp className="h-6 w-6" />
            Accounting
          </h1>
          <p className="text-sm text-muted-foreground">Revenue, expenses & profit overview</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <Label className="text-xs">Period</Label>
            <Select value={preset} onValueChange={onPresetChange}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="mtd">Month to date</SelectItem>
                <SelectItem value="ytd">Year to date</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {preset === "custom" && (
            <>
              <div className="grid gap-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">To</Label>
                <Input type="date" value={to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
              </div>
            </>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <FileDown className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</span>
              <k.icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <div className="mt-2 text-2xl font-bold">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Revenue vs Expenses (last 12 months)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmt(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="#6366f1" name="Profit" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Top expense categories</h3>
          <div className="h-72">
            {byCategory.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No expense data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry: { category: string }) => entry.category}
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Monthly P&amp;L breakdown</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthly.map((m) => {
              const margin = m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) : "—";
              return (
                <TableRow key={m.month}>
                  <TableCell className="font-mono text-xs">{m.month}</TableCell>
                  <TableCell className="text-right text-emerald-600">{fmt(m.revenue)}</TableCell>
                  <TableCell className="text-right text-rose-600">{fmt(m.expenses)}</TableCell>
                  <TableCell className={`text-right font-semibold ${m.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {fmt(m.profit)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {margin === "—" ? "—" : `${margin}%`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
