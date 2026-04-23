import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil, Trash2, Receipt, FileImage } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AdminTableSkeletonRows } from "@/components/admin/TableSkeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  fetchExpenseCategories,
  fetchExpenses,
  deleteExpense,
  type Expense,
} from "@/lib/expenses";
import { ExpenseFormDialog } from "@/components/admin/ExpenseFormDialog";
import { ExpenseCategoryManager } from "@/components/admin/ExpenseCategoryManager";

export const Route = createFileRoute("/admin/expenses")({
  head: () => ({ meta: [{ title: "Expenses — Admin" }] }),
  component: AdminExpensesPage,
});

function fmt(n: number) {
  return `৳${n.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AdminExpensesPage() {
  const qc = useQueryClient();
  const [categoryId, setCategoryId] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "expense_categories"],
    queryFn: () => fetchExpenseCategories(true),
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["admin", "expenses", categoryId, from, to],
    queryFn: () =>
      fetchExpenses({
        categoryId: categoryId === "all" ? null : categoryId,
        from: from || null,
        to: to || null,
      }),
  });

  const total = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const del = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      toast.success("Expense deleted");
      qc.invalidateQueries({ queryKey: ["admin", "expenses"] });
      qc.invalidateQueries({ queryKey: ["admin", "accounting"] });
      setDeletingId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Receipt className="h-6 w-6" />
            Expenses
          </h1>
          <p className="text-sm text-muted-foreground">Track all business expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <ExpenseCategoryManager />
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add expense
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4">
        <div className="grid gap-1.5">
          <Label className="text-xs">Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end justify-end">
          <div className="rounded-xl bg-muted px-4 py-2 text-right">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Filtered total</div>
            <div className="text-lg font-bold">{fmt(total)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <AdminTableSkeletonRows rows={5} columns={7} />
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No expenses yet
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{e.expense_date}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{e.category?.name ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{e.description ?? "—"}</TableCell>
                  <TableCell className="text-xs">{e.payment_method ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(Number(e.amount))}</TableCell>
                  <TableCell>
                    {e.receipt_url ? (
                      <a href={e.receipt_url} target="_blank" rel="noreferrer" className="inline-flex">
                        <FileImage className="h-4 w-4 text-primary" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(e); setFormOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeletingId(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        expense={editing}
        categories={categories.filter((c) => c.is_active || c.id === editing?.category_id)}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && del.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground"
            >
              {del.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
