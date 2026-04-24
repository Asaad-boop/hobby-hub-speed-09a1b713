import { supabase } from "@/integrations/supabase/client";

export type Period = "daily" | "weekly" | "monthly" | "yearly";

export type RevenueRow = { date: string; revenue: number; orders: number };
export type ExpenseRow = { date: string; amount: number };
export type CategoryTotal = { category: string; amount: number };

export type MonthlyPnL = {
  month: string; // YYYY-MM
  revenue: number;
  expenses: number;
  profit: number;
};

const REVENUE_STATUSES = [
  "confirmed",
  "packaging",
  "packed",
  "ready_to_ship",
  "shipped",
  "in_transit",
  "delivered",
  "partial_delivered",
] as const;

/** Fetch revenue rows (sum totals from non-cancelled orders) within a date range. */
export async function fetchRevenueByDay(from: string, to: string): Promise<RevenueRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("created_at, total, status")
    .gte("created_at", from)
    .lte("created_at", `${to}T23:59:59`)
    .in("status", [...REVENUE_STATUSES])
    .limit(1000);

  if (error) throw error;

  const map = new Map<string, { revenue: number; orders: number }>();
  for (const o of data ?? []) {
    const day = (o.created_at as string).slice(0, 10);
    const cur = map.get(day) ?? { revenue: 0, orders: 0 };
    cur.revenue += Number(o.total ?? 0);
    cur.orders += 1;
    map.set(day, cur);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));
}

export async function fetchExpensesByDay(from: string, to: string): Promise<ExpenseRow[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("transaction_date, amount, direction")
    .eq("direction", "out")
    .gte("transaction_date", from)
    .lte("transaction_date", `${to}T23:59:59`)
    .limit(1000);

  if (error) throw error;

  const map = new Map<string, number>();
  for (const e of data ?? []) {
    const day = (e.transaction_date as string).slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + Number(e.amount ?? 0));
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));
}

export async function fetchExpensesByCategory(from: string, to: string): Promise<CategoryTotal[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, category, direction")
    .eq("direction", "out")
    .gte("transaction_date", from)
    .lte("transaction_date", `${to}T23:59:59`)
    .limit(1000);

  if (error) throw error;

  const map = new Map<string, number>();
  for (const e of data ?? []) {
    const name = e.category ?? "other";
    map.set(name, (map.get(name) ?? 0) + Number(e.amount ?? 0));
  }

  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount }));
}

/** Build monthly P&L for the last N months (inclusive of current). */
export async function fetchMonthlyPnL(months = 12): Promise<MonthlyPnL[]> {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - (months - 1), 1);
  const fromStr = start.toISOString().slice(0, 10);
  const toStr = end.toISOString().slice(0, 10);

  const [rev, exp] = await Promise.all([
    fetchRevenueByDay(fromStr, toStr),
    fetchExpensesByDay(fromStr, toStr),
  ]);

  const monthly = new Map<string, MonthlyPnL>();
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly.set(key, { month: key, revenue: 0, expenses: 0, profit: 0 });
  }

  for (const r of rev) {
    const key = r.date.slice(0, 7);
    const cur = monthly.get(key);
    if (cur) cur.revenue += r.revenue;
  }

  for (const e of exp) {
    const key = e.date.slice(0, 7);
    const cur = monthly.get(key);
    if (cur) cur.expenses += e.amount;
  }

  for (const m of monthly.values()) m.profit = m.revenue - m.expenses;
  return [...monthly.values()];
}

export async function fetchPnLSummary(from: string, to: string) {
  const [rev, exp] = await Promise.all([
    fetchRevenueByDay(from, to),
    fetchExpensesByDay(from, to),
  ]);
  const revenue = rev.reduce((s, r) => s + r.revenue, 0);
  const expenses = exp.reduce((s, e) => s + e.amount, 0);
  const orders = rev.reduce((s, r) => s + r.orders, 0);
  return {
    revenue,
    expenses,
    profit: revenue - expenses,
    orders,
    margin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0,
  };
}
