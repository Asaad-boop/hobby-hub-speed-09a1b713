import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  Receipt,
  ArrowLeftRight,
  BarChart3,
  Coins,
  PieChart,
  Plus,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  fetchDashboardKpis,
  fetchAccounts,
  fetchRevenueExpenseSeries,
  fetchTransactions,
  formatBDT,
  accountTypeLabel,
} from "@/lib/finance";

export const Route = createFileRoute("/admin/finance")({
  head: () => ({
    meta: [
      { title: "Finance — HobbyShop Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FinanceLayout,
});

const SUB_TABS = [
  { to: "/admin/finance", label: "Dashboard", exact: true, icon: BarChart3 },
  { to: "/admin/finance/accounts", label: "Accounts", icon: Wallet },
  { to: "/admin/finance/transactions", label: "Transactions", icon: Receipt },
];

function FinanceLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // If at /admin/finance exact → dashboard; otherwise child route
  const isDashboard = pathname === "/admin/finance" || pathname === "/admin/finance/";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        {SUB_TABS.map((t) => {
          const active = t.exact ? isDashboard : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </div>
      {isDashboard ? <FinanceDashboard /> : <Outlet />}
    </div>
  );
}

function FinanceDashboard() {
  const kpisQ = useQuery({ queryKey: ["finance", "kpis"], queryFn: fetchDashboardKpis });
  const accountsQ = useQuery({ queryKey: ["finance", "accounts"], queryFn: fetchAccounts });
  const seriesQ = useQuery({ queryKey: ["finance", "series", 30], queryFn: () => fetchRevenueExpenseSeries(30) });
  const recentQ = useQuery({ queryKey: ["finance", "recent"], queryFn: () => fetchTransactions({ limit: 10 }) });

  const k = kpisQ.data;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Today Revenue"
          value={k ? formatBDT(k.todayRevenue) : null}
          icon={Coins}
          tone="neutral"
          loading={kpisQ.isLoading}
        />
        <KpiCard
          label="Today Profit"
          value={k ? formatBDT(k.todayProfit) : null}
          icon={TrendingUp}
          tone={k && k.todayProfit < 0 ? "loss" : "profit"}
          loading={kpisQ.isLoading}
        />
        <KpiCard
          label="Total Cash"
          value={k ? formatBDT(k.totalCash) : null}
          icon={Wallet}
          tone="neutral"
          loading={kpisQ.isLoading}
        />
        <KpiCard
          label="Pending COD"
          value={k ? formatBDT(k.pendingCod) : null}
          icon={Clock}
          tone="pending"
          loading={kpisQ.isLoading}
        />
        <KpiCard
          label="Month Profit"
          value={k ? formatBDT(k.monthProfit) : null}
          sub={k ? `${k.monthOrders} orders` : undefined}
          icon={TrendingUp}
          tone={k && k.monthProfit < 0 ? "loss" : "profit"}
          loading={kpisQ.isLoading}
        />
        <KpiCard
          label="Return Rate"
          value={k ? `${k.returnRatePct.toFixed(1)}%` : null}
          icon={TrendingDown}
          tone={k && k.returnRatePct > 10 ? "loss" : "neutral"}
          loading={kpisQ.isLoading}
        />
      </div>

      {/* Charts + accounts grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Revenue vs Expense — Last 30 days</h3>
            <Badge variant="outline" className="text-[10px]">Ledger</Badge>
          </div>
          {seriesQ.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={seriesQ.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <ReTooltip
                  formatter={(v: number) => formatBDT(v)}
                  labelClassName="text-xs"
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expense" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Cash Accounts</h3>
            <Link to="/admin/finance/accounts" className="text-xs text-primary hover:underline">
              Manage →
            </Link>
          </div>
          <div className="space-y-2">
            {accountsQ.isLoading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
              : (accountsQ.data ?? []).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {accountTypeLabel(a.type)}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "font-mono text-sm tabular-nums",
                        Number(a.current_balance) < 0 ? "text-destructive" : "text-foreground",
                      )}
                    >
                      {formatBDT(a.current_balance)}
                    </span>
                  </div>
                ))}
          </div>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent Transactions</h3>
          <Link to="/admin/finance/transactions" className="text-xs text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Description</th>
                <th className="py-2 pl-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentQ.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={5} className="py-2"><Skeleton className="h-5 w-full" /></td>
                  </tr>
                ))
              ) : (recentQ.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No transactions yet. Record manual entries from the Transactions tab.
                  </td>
                </tr>
              ) : (
                (recentQ.data ?? []).map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {new Date(t.transaction_date).toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant="outline" className="text-[10px] uppercase">{t.type.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-xs">{t.category.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{t.description ?? "—"}</td>
                    <td
                      className={cn(
                        "py-2 pl-3 text-right font-mono tabular-nums",
                        t.direction === "in" ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {t.direction === "in" ? "+" : "-"}{formatBDT(t.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: string | null;
  sub?: string;
  icon: typeof Wallet;
  tone: "profit" | "loss" | "pending" | "neutral";
  loading?: boolean;
}) {
  const toneClass = {
    profit: "text-green-600",
    loss: "text-red-600",
    pending: "text-blue-600",
    neutral: "text-foreground",
  }[tone];
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", toneClass)} />
      </div>
      {loading || value === null ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <div className={cn("mt-1 font-mono text-lg font-bold tabular-nums", toneClass)}>{value}</div>
      )}
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </Card>
  );
}
