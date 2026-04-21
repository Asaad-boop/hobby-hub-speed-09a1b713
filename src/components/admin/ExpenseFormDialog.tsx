import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "@/components/admin/ImageUploader";
import {
  createExpense,
  updateExpense,
  PAYMENT_METHODS,
  type Expense,
  type ExpenseCategory,
} from "@/lib/expenses";

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expense: Expense | null;
  categories: ExpenseCategory[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    category_id: "",
    amount: "",
    description: "",
    expense_date: new Date().toISOString().slice(0, 10),
    receipt_url: "",
    payment_method: "Cash",
  });

  useEffect(() => {
    if (expense) {
      setForm({
        category_id: expense.category_id,
        amount: String(expense.amount),
        description: expense.description ?? "",
        expense_date: expense.expense_date,
        receipt_url: expense.receipt_url ?? "",
        payment_method: expense.payment_method ?? "Cash",
      });
    } else {
      setForm({
        category_id: categories[0]?.id ?? "",
        amount: "",
        description: "",
        expense_date: new Date().toISOString().slice(0, 10),
        receipt_url: "",
        payment_method: "Cash",
      });
    }
  }, [expense, open, categories]);

  const mutation = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount);
      if (!form.category_id) throw new Error("Category select korun");
      if (!Number.isFinite(amount) || amount < 0) throw new Error("Valid amount din");
      if (!form.expense_date) throw new Error("Date select korun");

      const payload = {
        category_id: form.category_id,
        amount,
        description: form.description || null,
        expense_date: form.expense_date,
        receipt_url: form.receipt_url || null,
        payment_method: form.payment_method || null,
      };
      if (expense) {
        await updateExpense(expense.id, payload);
      } else {
        await createExpense(payload);
      }
    },
    onSuccess: () => {
      toast.success(expense ? "Expense updated" : "Expense added");
      qc.invalidateQueries({ queryKey: ["admin", "expenses"] });
      qc.invalidateQueries({ queryKey: ["admin", "accounting"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit expense" : "Add expense"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Amount (৳)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Payment method</Label>
            <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes"
            />
          </div>
          <div className="grid gap-2">
            <Label>Receipt (optional)</Label>
            <ImageUploader
              value={form.receipt_url}
              onChange={(url) => setForm({ ...form, receipt_url: url })}
              folder="receipts"
              label="Receipt"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {expense ? "Save changes" : "Add expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
