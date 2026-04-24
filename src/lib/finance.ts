import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CashAccountType =
  | "cash"
  | "bkash"
  | "nagad"
  | "rocket"
  | "bank"
  | "pathao_pending"
  | "meta_ads_wallet"
  | "other";

export type CashAccount = {
  id: string;
  name: string;
  type: CashAccountType;
  current_balance: number;
  is_active: boolean;
  display_order: number;
  account_number: string | null;
  provider: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type TxnType = Database["public"]["Enums"]["transaction_type"];
export type TxnCategory = Database["public"]["Enums"]["transaction_category"];
export type TxnDirection = Database["public"]["Enums"]["transaction_direction"];
export type TxnRefType = Database["public"]["Enums"]["transaction_reference_type"];

const financeSupabase = supabase as any;

/** Format BDT with Bangladeshi (Indian-style) lakh comma grouping. */
export function formatBDT(amount: number | string | null | undefined, opts: { sign?: boolean } = {}): string {
  const n = Number(amount ?? 0);
  const abs = Math.abs(n);
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  let formatted: string;
  if (intPart.length <= 3) {
    formatted = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const restGrouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    formatted = `${restGrouped},${last3}`;
  }
  const prefix = n < 0 ? "-" : opts.sign && n > 0 ? "+" : "";
  return `${prefix}৳${formatted}.${decPart}`;
}

export function accountTypeLabel(t: CashAccountType): string {
  switch (t) {
    case "cash":
      return "Cash";
    case "bkash":
      return "bKash";
    case "nagad":
      return "Nagad";
    case "rocket":
      return "Rocket";
    case "bank":
      return "Bank";
    case "pathao_pending":
      return "Pathao Pending";
    case "meta_ads_wallet":
      return "Meta Ads";
    default:
      return "Other";
  }
}

export const TRANSACTION_CATEGORIES: { value: TxnCategory; label: string }[] = [
  { value: "product_sale", label: "Product Sale" },
  { value: "product_purchase", label: "Product Purchase" },
  { value: "meta_ads", label: "Meta / Facebook Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "tiktok_ads", label: "TikTok Ads" },
  { value: "courier_delivery_charge", label: "Courier — Delivery Charge" },
  { value: "courier_cod_charge", label: "Courier — COD Charge" },
  { value: "courier_return_charge", label: "Courier — Return Charge" },
  { value: "packaging", label: "Packaging" },
  { value: "salary", label: "Salary" },
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "return_loss", label: "Return Loss" },
  { value: "damage_loss", label: "Damage Loss" },
  { value: "owner_drawing", label: "Owner Drawing" },
  { value: "owner_investment", label: "Owner Investment" },
  { value: "bank_charge", label: "Bank Charge" },
  { value: "other", label: "Other" },
];

export const TRANSACTION_TYPES: { value: TxnType; label: string }[] = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer_in", label: "Transfer In" },
  { value: "transfer_out", label: "Transfer Out" },
  { value: "cod_collection", label: "COD Collection" },
  { value: "cod_settlement", label: "COD Settlement" },
  { value: "ads_spend", label: "Ads Spend" },
  { value: "refund", label: "Refund" },
  { value: "adjustment", label: "Adjustment" },
  { value: "reversal", label: "Reversal" },
];

export async function fetchAccounts(): Promise<CashAccount[]> {
  const { data, error } = await financeSupabase.from("cash_accounts").select("*").order("display_order");
  if (error) throw error;
  return (data ?? []) as CashAccount[];
}

export async function fetchTotalCashBalance(): Promise<number> {
  const { data, error } = await financeSupabase.from("cash_accounts").select("current_balance, is_active");
  if (error) throw error;
  return (data ?? []).filter((a: any) => a.is_active).reduce((s: number, a: any) => s + Number(a.current_balance ?? 0), 0);
}

export type TxnFilters = {
  accountId?: string;
  type?: TxnType;
  category?: TxnCategory;
  direction?: TxnDirection;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
};

export async function fetchTransactions(filters: TxnFilters = {}): Promise<Transaction[]> {
  let q = supabase
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: false })
    .limit(filters.limit ?? 200);
  if (filters.accountId) q = q.eq("account_id", filters.accountId);
  if (filters.type) q = q.eq("type", filters.type);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.direction) q = q.eq("direction", filters.direction);
  if (filters.from) q = q.gte("transaction_date", filters.from);
  if (filters.to) q = q.lte("transaction_date", `${filters.to}T23:59:59`);
  if (filters.search) q = q.ilike("description", `%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export type ManualTxnInput = {
  account_id: string;
  type: TxnType;
  category: TxnCategory;
  direction: TxnDirection;
  amount: number;
  description?: string;
  transaction_date?: string;
  reference_type?: TxnRefType;
  reference_id?: string | null;
};

export async function createTransaction(input: ManualTxnInput): Promise<Transaction> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      account_id: input.account_id,
      type: input.type,
      category: input.category,
      direction: input.direction,
      amount: input.amount,
      description: input.description ?? null,
      transaction_date: input.transaction_date ?? new Date().toISOString(),
      reference_type: input.reference_type ?? "manual",
      reference_id: input.reference_id ?? null,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function transferBetween(args: {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description?: string;
}): Promise<void> {
  if (args.from_account_id === args.to_account_id) throw new Error("Cannot transfer to same account");
  if (args.amount <= 0) throw new Error("Amount must be positive");
  const desc = args.description?.trim() || "Inter-account transfer";
  await createTransaction({
    account_id: args.from_account_id,
    type: "transfer_out",
    category: "other",
    direction: "out",
    amount: args.amount,
    description: desc,
  });
  await createTransaction({
    account_id: args.to_account_id,
    type: "transfer_in",
    category: "other",
    direction: "in",
    amount: args.amount,
    description: desc,
  });
}

export async function reverseTransaction(txnId: string): Promise<void> {
  const { data: orig, error } = await supabase.from("transactions").select("*").eq("id", txnId).single();
  if (error) throw error;
  if (orig.reversed_at) throw new Error("Already reversed");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const oppositeDirection: TxnDirection = orig.direction === "in" ? "out" : "in";
  const { data: rev, error: insErr } = await supabase
    .from("transactions")
    .insert({
      account_id: orig.account_id,
      type: "reversal",
      category: orig.category,
      direction: oppositeDirection,
      amount: orig.amount,
      description: `Reversal of ${orig.id.slice(0, 8)} — ${orig.description ?? ""}`.trim(),
      reference_type: "manual",
      reference_id: orig.id,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  const { error: updErr } = await supabase
    .from("transactions")
    .update({ reversed_at: new Date().toISOString(), reversed_by: rev.id })
    .eq("id", txnId);
  if (updErr) throw updErr;
}

export type DashboardKpis = {
  todayRevenue: number;
  todayProfit: number;
  totalCash: number;
  pendingCod: number;
  monthRevenue: number;
  monthProfit: number;
  monthOrders: number;
  returnRatePct: number;
};

export async function fetchDashboardKpis(): Promise<DashboardKpis> {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

  const [accounts, todayFin, monthFin, monthOrders] = await Promise.all([
    financeSupabase.from("cash_accounts").select("current_balance, type, is_active"),
    financeSupabase.from("order_financials").select("revenue, net_profit, created_at").gte("created_at", todayStr),
    financeSupabase.from("order_financials").select("revenue, net_profit, finalization_status").gte("created_at", monthStart),
    supabase.from("orders").select("id, status").gte("created_at", monthStart).limit(1000),
  ]);

  const totalCash = (accounts.data ?? []).filter((a: any) => a.is_active).reduce((s: number, a: any) => s + Number(a.current_balance ?? 0), 0);
  const pendingCod = (accounts.data ?? []).filter((a: any) => a.type === "pathao_pending").reduce((s: number, a: any) => s + Number(a.current_balance ?? 0), 0);

  const todayRevenue = (todayFin.data ?? []).reduce((s: number, r: any) => s + Number(r.revenue ?? 0), 0);
  const todayProfit = (todayFin.data ?? []).reduce((s: number, r: any) => s + Number(r.net_profit ?? 0), 0);
  const monthRevenue = (monthFin.data ?? []).reduce((s: number, r: any) => s + Number(r.revenue ?? 0), 0);
  const monthProfit = (monthFin.data ?? []).reduce((s: number, r: any) => s + Number(r.net_profit ?? 0), 0);

  const totalOrders = (monthOrders.data ?? []).length;
  const returned = (monthOrders.data ?? []).filter((o) => o.status === "cancelled").length;
  const returnRatePct = totalOrders > 0 ? (returned / totalOrders) * 100 : 0;

  return {
    todayRevenue,
    todayProfit,
    totalCash,
    pendingCod,
    monthRevenue,
    monthProfit,
    monthOrders: totalOrders,
    returnRatePct,
  };
}

export async function fetchRevenueExpenseSeries(days = 30): Promise<{ date: string; revenue: number; expense: number }[]> {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
  const fromStr = start.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, direction, transaction_date, type")
    .gte("transaction_date", fromStr)
    .limit(5000);
  if (error) throw error;
  const map = new Map<string, { revenue: number; expense: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { revenue: 0, expense: 0 });
  }
  for (const t of data ?? []) {
    const key = (t.transaction_date as string).slice(0, 10);
    const cur = map.get(key);
    if (!cur) continue;
    const amt = Number(t.amount ?? 0);
    if (t.direction === "in" && t.type !== "transfer_in") cur.revenue += amt;
    else if (t.direction === "out" && t.type !== "transfer_out") cur.expense += amt;
  }
  return [...map.entries()].map(([date, v]) => ({ date, ...v }));
}
