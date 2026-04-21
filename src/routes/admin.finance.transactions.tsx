import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Plus, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  fetchAccounts,
  fetchTransactions,
  createTransaction,
  reverseTransaction,
  formatBDT,
  TRANSACTION_CATEGORIES,
  TRANSACTION_TYPES,
  type Transaction,
  type TxnType,
  type TxnCategory,
  type TxnDirection,
} from "@/lib/finance";

export const Route = createFileRoute("/admin/finance/transactions")({
  head: () => ({ meta: [{ title: "Transactions — Finance" }, { name: "robots", content: "noindex" }] }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const accountsQ = useQuery({ queryKey: ["finance", "accounts"], queryFn: fetchAccounts });
  const [filters, setFilters] = useState<{
    accountId?: string;
    type?: TxnType;
    category?: TxnCategory;
    direction?: TxnDirection;
    from?: string;
    to?: string;
    search?: string;
  }>({});
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<Transaction | null>(null);

  const txnsQ = useQuery({
    queryKey: ["finance", "txns", "list", filters],
    queryFn: () => fetchTransactions({ ...filters, limit: 500 }),
  });

  const accountMap = useMemo(() => {
    const m = new Map<string, string>();
    (accountsQ.data ?? []).forEach((a) => m.set(a.id, a.name));
    return m;
  }, [accountsQ.data]);

  function exportCsv() {
    const rows = txnsQ.data ?? [];
    const header = ["Date", "Account", "Type", "Category", "Direction", "Amount", "Reference Type", "Description"];
    const csv = [
      header.join(","),
      ...rows.map((t) => [
        new Date(t.transaction_date).toISOString(),
        accountMap.get(t.account_id) ?? t.account_id,
        t.type,
        t.category,
        t.direction,
        Number(t.amount).toFixed(2),
        t.reference_type,
        `"${(t.description ?? "").replace(/"/g, '""')}"`,
      ].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Transactions Ledger</h2>
          <p className="text-xs text-muted-foreground">Single source of truth for all money movements.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!txnsQ.data?.length}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Transaction
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
          <div>
            <Label className="text-[10px] uppercase">Account</Label>
            <Select value={filters.accountId ?? "all"} onValueChange={(v) => setFilters({ ...filters, accountId: v === "all" ? undefined : v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {(accountsQ.data ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase">Type</Label>
            <Select value={filters.type ?? "all"} onValueChange={(v) => setFilters({ ...filters, type: v === "all" ? undefined : v as TxnType })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {TRANSACTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase">Category</Label>
            <Select value={filters.category ?? "all"} onValueChange={(v) => setFilters({ ...filters, category: v === "all" ? undefined : v as TxnCategory })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {TRANSACTION_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase">Direction</Label>
            <Select value={filters.direction ?? "all"} onValueChange={(v) => setFilters({ ...filters, direction: v === "all" ? undefined : v as TxnDirection })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="in">In</SelectItem>
                <SelectItem value="out">Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase">From</Label>
            <Input className="h-8" type="date" value={filters.from ?? ""} onChange={(e) => setFilters({ ...filters, from: e.target.value || undefined })} />
          </div>
          <div>
            <Label className="text-[10px] uppercase">To</Label>
            <Input className="h-8" type="date" value={filters.to ?? ""} onChange={(e) => setFilters({ ...filters, to: e.target.value || undefined })} />
          </div>
          <div>
            <Label className="text-[10px] uppercase">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-8 pl-7" placeholder="Description…" value={filters.search ?? ""} onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })} />
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {txnsQ.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td colSpan={7} className="px-3 py-2"><Skeleton className="h-5 w-full" /></td>
                  </tr>
                ))
              ) : (txnsQ.data ?? []).length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No transactions match these filters.</td></tr>
              ) : (
                (txnsQ.data ?? []).map((t) => (
                  <tr key={t.id} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{new Date(t.transaction_date).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="px-3 py-2 text-xs">{accountMap.get(t.account_id) ?? "—"}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{t.type.replace(/_/g, " ")}</Badge></td>
                    <td className="px-3 py-2 text-xs">{t.category.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[280px] truncate">{t.description ?? "—"}</td>
                    <td className={cn("px-3 py-2 text-right font-mono tabular-nums", t.direction === "in" ? "text-green-600" : "text-red-600")}>
                      {t.direction === "in" ? "+" : "-"}{formatBDT(t.amount)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setDetail(t)}>
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AddTxnDialog open={addOpen} onOpenChange={setAddOpen} accounts={accountsQ.data ?? []} />
      <DetailDialog txn={detail} onClose={() => setDetail(null)} accountName={detail ? accountMap.get(detail.account_id) ?? "" : ""} />
    </div>
  );
}

function AddTxnDialog({
  open, onOpenChange, accounts,
}: { open: boolean; onOpenChange: (v: boolean) => void; accounts: { id: string; name: string }[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    account_id: "",
    direction: "in" as TxnDirection,
    type: "income" as TxnType,
    category: "other" as TxnCategory,
    amount: "",
    description: "",
    transaction_date: new Date().toISOString().slice(0, 16),
  });
  const m = useMutation({
    mutationFn: () => createTransaction({
      account_id: form.account_id,
      type: form.type,
      category: form.category,
      direction: form.direction,
      amount: Number(form.amount),
      description: form.description,
      transaction_date: new Date(form.transaction_date).toISOString(),
    }),
    onSuccess: () => {
      toast.success("Transaction added");
      qc.invalidateQueries({ queryKey: ["finance"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Manual Transaction</DialogTitle>
          <DialogDescription>For adjustments, owner movements, or one-off entries.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Account</Label>
            <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pick account" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Direction</Label>
              <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v as TxnDirection })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">In</SelectItem>
                  <SelectItem value="out">Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as TxnType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TxnCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSACTION_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (BDT)</Label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Date & Time</Label>
            <Input type="datetime-local" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!form.account_id || !form.amount || Number(form.amount) <= 0 || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({ txn, onClose, accountName }: { txn: Transaction | null; onClose: () => void; accountName: string }) {
  const qc = useQueryClient();
  const reverseM = useMutation({
    mutationFn: (id: string) => reverseTransaction(id),
    onSuccess: () => {
      toast.success("Transaction reversed");
      qc.invalidateQueries({ queryKey: ["finance"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!txn} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transaction detail</DialogTitle>
        </DialogHeader>
        {txn && (
          <div className="space-y-2 text-sm">
            <Row label="ID" value={<span className="font-mono text-xs">{txn.id}</span>} />
            <Row label="Account" value={accountName} />
            <Row label="Date" value={new Date(txn.transaction_date).toLocaleString("en-GB")} />
            <Row label="Type" value={txn.type.replace(/_/g, " ")} />
            <Row label="Category" value={txn.category.replace(/_/g, " ")} />
            <Row label="Direction" value={txn.direction.toUpperCase()} />
            <Row label="Amount" value={<span className={cn("font-mono", txn.direction === "in" ? "text-green-600" : "text-red-600")}>{txn.direction === "in" ? "+" : "-"}{formatBDT(txn.amount)}</span>} />
            <Row label="Reference" value={`${txn.reference_type}${txn.reference_id ? ` · ${txn.reference_id.slice(0, 8)}` : ""}`} />
            <Row label="Description" value={txn.description ?? "—"} />
            {txn.reversed_at && <Row label="Reversed" value={new Date(txn.reversed_at).toLocaleString("en-GB")} />}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {txn && !txn.reversed_at && txn.type !== "reversal" && (
            <Button variant="destructive" disabled={reverseM.isPending} onClick={() => reverseM.mutate(txn.id)}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              {reverseM.isPending ? "Reversing…" : "Reverse"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-1.5 text-sm last:border-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
