import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Printer, TrendingDown, TrendingUp, Wallet, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bdt, getProfitLoss, listLedgerEntries } from "@/lib/ledger";

export const Route = createFileRoute("/admin/reports/profit-loss")({
  head: () => ({
    meta: [
      { title: "Profit & Loss — HobbyShop ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProfitLossPage,
});

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function ProfitLossPage() {
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const printRef = useRef<HTMLDivElement>(null);

  const pnlQ = useQuery({
    queryKey: ["pnl", from, to],
    queryFn: () => getProfitLoss(from, to),
  });

  const entriesQ = useQuery({
    queryKey: ["ledger_entries", from, to],
    queryFn: () => listLedgerEntries({ from, to, limit: 100 }),
  });

  const presets = useMemo(
    () => [
      { label: "Today", from: isoDaysAgo(0), to: isoDaysAgo(0) },
      { label: "7 days", from: isoDaysAgo(7), to: isoDaysAgo(0) },
      { label: "30 days", from: isoDaysAgo(30), to: isoDaysAgo(0) },
      { label: "This month", from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), to: isoDaysAgo(0) },
      { label: "This year", from: `${new Date().getFullYear()}-01-01`, to: isoDaysAgo(0) },
    ],
    [],
  );

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Profit & Loss · ${from} to ${to}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            .muted { color: #666; font-size: 12px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
            th, td { padding: 6px 8px; border-bottom: 1px solid #eee; text-align: left; }
            td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
            tr.total td { border-top: 2px solid #111; font-weight: 700; }
            h2 { font-size: 14px; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0 24px; }
            .stat { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; }
            .stat .l { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.06em; }
            .stat .v { font-size: 18px; font-weight: 700; margin-top: 2px; }
          </style>
        </head>
        <body>${node.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const pnl = pnlQ.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profit &amp; Loss</h1>
          <p className="text-sm text-muted-foreground">
            Revenue minus all operating costs over the selected range. Sourced from the double-entry ledger.
          </p>
        </div>
        <Button onClick={handlePrint} size="sm" variant="outline">
          <Printer className="mr-2 h-4 w-4" /> Print report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  setFrom(p.from);
                  setTo(p.to);
                }}
              >
                <Calendar className="mr-1 h-3 w-3" />
                {p.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div ref={printRef}>
        <h1 className="hidden print:block">Profit &amp; Loss Report</h1>
        <p className="muted hidden print:block">
          {from} → {to}
        </p>

        {/* Summary */}
        <div className="summary grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Net Sales"
            value={bdt(pnl?.totalRevenue ?? 0)}
            tone="from-emerald-500/10 to-emerald-500/0"
          />
          <SummaryCard
            icon={<Receipt className="h-4 w-4" />}
            label="COGS"
            value={bdt(pnl?.cogs ?? 0)}
            tone="from-amber-500/10 to-amber-500/0"
          />
          <SummaryCard
            icon={<Wallet className="h-4 w-4" />}
            label="Total Expenses"
            value={bdt(pnl?.totalExpenses ?? 0)}
            tone="from-rose-500/10 to-rose-500/0"
          />
          <SummaryCard
            icon={
              (pnl?.netProfit ?? 0) >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )
            }
            label="Net Profit"
            value={bdt(pnl?.netProfit ?? 0)}
            sub={`${(pnl?.margin ?? 0).toFixed(1)}% margin`}
            tone={
              (pnl?.netProfit ?? 0) >= 0
                ? "from-primary/15 to-primary/0"
                : "from-destructive/10 to-destructive/0"
            }
            strong
          />
        </div>

        {/* Revenue */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Revenue</CardTitle>
            <CardDescription>Income recognized in the selected period.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pnl?.revenue ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">
                      No revenue posted in this range.
                    </TableCell>
                  </TableRow>
                )}
                {pnl?.revenue.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{bdt(r.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="total bg-muted/40">
                  <TableCell colSpan={2} className="font-semibold">
                    Total Revenue
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {bdt(pnl?.totalRevenue ?? 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Cost of Sales &amp; Operating Expenses</CardTitle>
            <CardDescription>
              5xxx = cost of sales (COGS, shipping, returns). 6xxx-7xxx = operating expenses.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pnl?.expenses ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">
                      No expenses posted in this range.
                    </TableCell>
                  </TableRow>
                )}
                {pnl?.expenses.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{bdt(r.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="total bg-muted/40">
                  <TableCell colSpan={2} className="font-semibold">
                    Total Expenses
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {bdt(pnl?.totalExpenses ?? 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Bottom line */}
        <Card className="mt-6 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Gross Profit
              </div>
              <div className="text-2xl font-bold tabular-nums">{bdt(pnl?.grossProfit ?? 0)}</div>
              <div className="text-[11px] text-muted-foreground">Revenue − COGS</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Net Profit
              </div>
              <div
                className={`text-2xl font-bold tabular-nums ${
                  (pnl?.netProfit ?? 0) < 0 ? "text-destructive" : "text-primary"
                }`}
              >
                {bdt(pnl?.netProfit ?? 0)}
              </div>
              <div className="text-[11px] text-muted-foreground">Revenue − all expenses</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Net Margin
              </div>
              <div className="text-2xl font-bold tabular-nums">
                {(pnl?.margin ?? 0).toFixed(1)}%
              </div>
              <div className="text-[11px] text-muted-foreground">Net profit ÷ revenue</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent journal entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Journal Entries</CardTitle>
          <CardDescription>Last 100 ledger entries in this date range.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Entry #</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entriesQ.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                      No entries in range.
                    </TableCell>
                  </TableRow>
                )}
                {entriesQ.data?.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">#{e.entry_no}</TableCell>
                    <TableCell className="text-xs">{e.entry_date}</TableCell>
                    <TableCell className="text-sm">{e.description}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider">
                        {e.source_type}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  tone,
  strong,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: string;
  strong?: boolean;
}) {
  return (
    <Card className={`stat bg-gradient-to-br ${tone ?? ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="l text-xs font-medium uppercase tracking-wider">{label}</span>
          {icon}
        </div>
        <div className={`v mt-1 tabular-nums ${strong ? "text-3xl font-extrabold" : "text-2xl font-bold"}`}>
          {value}
        </div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
