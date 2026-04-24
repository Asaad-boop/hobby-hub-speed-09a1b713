import { supabase } from "@/integrations/supabase/client";

const ledgerSupabase = supabase as any;

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export type ChartAccount = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parent_id: string | null;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
};

export type LedgerEntry = {
  id: string;
  entry_no: number;
  entry_date: string;
  description: string;
  source_type: "order" | "expense" | "capital" | "shipment" | "manual" | "adjustment";
  source_id: string | null;
  is_posted: boolean;
  created_at: string;
};

export type LedgerLine = {
  id: string;
  entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  memo: string | null;
};

export async function listChartOfAccounts(): Promise<ChartAccount[]> {
  const { data, error } = await ledgerSupabase
    .from("chart_of_accounts")
    .select("*")
    .order("code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChartAccount[];
}

export async function listLedgerEntries(opts: {
  from?: string;
  to?: string;
  limit?: number;
} = {}) {
  let q = ledgerSupabase
    .from("general_ledger")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("entry_no", { ascending: false });
  if (opts.from) q = q.gte("entry_date", opts.from);
  if (opts.to) q = q.lte("entry_date", opts.to);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LedgerEntry[];
}

export async function getAccountActivity(from: string, to: string) {
  const { data, error } = await ledgerSupabase
    .from("ledger_lines")
    .select(
      "debit, credit, account_id, chart_of_accounts!inner(code, name, type), general_ledger!inner(entry_date)",
    )
    .gte("general_ledger.entry_date", from)
    .lte("general_ledger.entry_date", to);
  if (error) throw error;

  const map = new Map<
    string,
    { code: string; name: string; type: AccountType; debit: number; credit: number }
  >();
  for (const row of (data ?? []) as any[]) {
    const acct = row.chart_of_accounts;
    const key = acct.code;
    const cur = map.get(key) ?? {
      code: acct.code,
      name: acct.name,
      type: acct.type,
      debit: 0,
      credit: 0,
    };
    cur.debit += Number(row.debit) || 0;
    cur.credit += Number(row.credit) || 0;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
}

export type PnLRow = { code: string; name: string; amount: number };
export type PnLReport = {
  from: string;
  to: string;
  revenue: PnLRow[];
  expenses: PnLRow[];
  totalRevenue: number;
  totalExpenses: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
  margin: number;
};

export async function getProfitLoss(from: string, to: string): Promise<PnLReport> {
  const activity = await getAccountActivity(from, to);

  const revenue: PnLRow[] = [];
  const expenses: PnLRow[] = [];
  let totalRevenue = 0;
  let totalExpenses = 0;
  let cogs = 0;

  for (const a of activity) {
    if (a.type === "revenue") {
      const amt = a.credit - a.debit;
      revenue.push({ code: a.code, name: a.name, amount: amt });
      totalRevenue += amt;
    } else if (a.type === "expense") {
      const amt = a.debit - a.credit;
      expenses.push({ code: a.code, name: a.name, amount: amt });
      totalExpenses += amt;
      if (a.code.startsWith("5")) cogs += amt;
    }
  }

  const grossProfit = totalRevenue - cogs;
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    from,
    to,
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    cogs,
    grossProfit,
    netProfit,
    margin,
  };
}

export function bdt(n: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(n || 0);
}
