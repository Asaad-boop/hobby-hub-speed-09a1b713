import { supabase } from "@/integrations/supabase/client";

export type ExpenseCategory = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  category_id: string;
  amount: number;
  description: string | null;
  expense_date: string;
  receipt_url: string | null;
  payment_method: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  category?: ExpenseCategory | null;
};

export const PAYMENT_METHODS = ["Cash", "bKash", "Nagad", "Bank Transfer", "Card", "Other"] as const;

const expenseSupabase = supabase as any;

export async function fetchExpenseCategories(includeInactive = false): Promise<ExpenseCategory[]> {
  let q = expenseSupabase.from("expense_categories").select("*").order("display_order").order("name");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ExpenseCategory[];
}

export async function fetchExpenses(filters?: {
  categoryId?: string | null;
  from?: string | null;
  to?: string | null;
}): Promise<Expense[]> {
  let q = expenseSupabase
    .from("expenses")
    .select("*, category:expense_categories(*)")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (filters?.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters?.from) q = q.gte("expense_date", filters.from);
  if (filters?.to) q = q.lte("expense_date", filters.to);
  const { data, error } = await q.limit(1000);
  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function createExpense(input: {
  category_id: string;
  amount: number;
  description?: string | null;
  expense_date: string;
  receipt_url?: string | null;
  payment_method?: string | null;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await expenseSupabase.from("expenses").insert({
    ...input,
    created_by: user.id,
  });
  if (error) throw error;
}

export async function updateExpense(
  id: string,
  patch: Partial<Pick<Expense, "category_id" | "amount" | "description" | "expense_date" | "receipt_url" | "payment_method">>,
) {
  const { error } = await expenseSupabase.from("expenses").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteExpense(id: string) {
  const { error } = await expenseSupabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertExpenseCategory(input: { id?: string; name: string; is_active?: boolean }) {
  const slug = input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (input.id) {
    const { error } = await expenseSupabase
      .from("expense_categories")
      .update({ name: input.name, slug, is_active: input.is_active ?? true })
      .eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await expenseSupabase
      .from("expense_categories")
      .insert({ name: input.name, slug, is_active: input.is_active ?? true });
    if (error) throw error;
  }
}
