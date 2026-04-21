import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeftRight, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  fetchAccounts,
  fetchTransactions,
  formatBDT,
  accountTypeLabel,
  transferBetween,
  createTransaction,
  type CashAccount,
} from "@/lib/finance";

export const Route = createFileRoute("/admin/finance/accounts")({
  head: () => ({ meta: [{ title: "Cash Accounts — Finance" }, { name: "robots", content: "noindex" }] }),
  component: AccountsPage,
});

function AccountsPage() {
  const accountsQ = useQuery({ queryKey: ["finance", "accounts"], queryFn: fetchAccounts });
  const [transferOpen, setTransferOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selected, setSelected] = useState<CashAccount | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Cash Accounts</h2>
          <p className="text-xs text-muted-foreground">
            Balance is auto-computed from the transactions ledger. Never edit balances directly.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight className="mr-1.5 h-4 w-4" /> Transfer
          </Button>
          <Button size="sm" onClick={() => setAdjustOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Manual Entry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accountsQ.isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)
          : (accountsQ.data ?? []).map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="rounded-lg border bg-card p-4 text-left transition hover:border-primary"
              >
                <div className="flex items-center justify-between">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                  <Badge variant={a.is_active ? "default" : "secondary"} className="text-[10px]">
                    {accountTypeLabel(a.type)}
                  </Badge>
                </div>
                <div className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {a.name}
                </div>
                <div
                  className={cn(
                    "mt-1 font-mono text-2xl font-bold tabular-nums",
                    Number(a.current_balance) < 0 ? "text-destructive" : "",
                  )}
                >
                  {formatBDT(a.current_balance)}
                </div>
                {a.account_number && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {a.account_number.replace(/.(?=.{4})/g, "•")}
                  </div>
                )}
              </button>
            ))}
      </div>

      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} accounts={accountsQ.data ?? []} />
      <ManualEntryDialog open={adjustOpen} onOpenChange={setAdjustOpen} accounts={accountsQ.data ?? []} />
      <AccountHistoryDialog account={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function TransferDialog({
  open, onOpenChange, accounts,
}: { open: boolean; onOpenChange: (v: boolean) => void; accounts: CashAccount[] }) {
  const qc = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  const m = useMutation({
    mutationFn: () => transferBetween({
      from_account_id: from,
      to_account_id: to,
      amount: Number(amount),
      description: desc,
    }),
    onSuccess: () => {
      toast.success("Transfer recorded");
      qc.invalidateQueries({ queryKey: ["finance"] });
      onOpenChange(false);
      setFrom(""); setTo(""); setAmount(""); setDesc("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer between accounts</DialogTitle>
          <DialogDescription>Creates a paired transfer_out + transfer_in entry.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>From</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger><SelectValue placeholder="Source account" /></SelectTrigger>
              <SelectContent>
                {accounts.filter((a) => a.is_active).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} — {formatBDT(a.current_balance)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>To</Label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger><SelectValue placeholder="Destination account" /></SelectTrigger>
              <SelectContent>
                {accounts.filter((a) => a.is_active && a.id !== from).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount (BDT)</Label>
            <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Reason / Note</Label>
            <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Pathao COD settlement received" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!from || !to || !amount || Number(amount) <= 0 || m.isPending}
            onClick={() => m.mutate()}
          >
            {m.isPending ? "Recording…" : "Record Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualEntryDialog({
  open, onOpenChange, accounts,
}: { open: boolean; onOpenChange: (v: boolean) => void; accounts: CashAccount[] }) {
  const qc = useQueryClient();
  const [accountId, setAccountId] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [category, setCategory] = useState("other");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  const m = useMutation({
    mutationFn: () => createTransaction({
      account_id: accountId,
      type: direction === "in" ? "income" : "expense",
      category: category as never,
      direction,
      amount: Number(amount),
      description: desc,
    }),
    onSuccess: () => {
      toast.success("Transaction recorded");
      qc.invalidateQueries({ queryKey: ["finance"] });
      onOpenChange(false);
      setAccountId(""); setAmount(""); setDesc(""); setCategory("other"); setDirection("in");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual transaction</DialogTitle>
          <DialogDescription>Use for owner deposits, withdrawals, adjustments, or one-off expenses.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Pick account" /></SelectTrigger>
              <SelectContent>
                {accounts.filter((a) => a.is_active).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as "in" | "out")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Money In (Income)</SelectItem>
                  <SelectItem value="out">Money Out (Expense)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (BDT)</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="owner_investment">Owner Investment</SelectItem>
                <SelectItem value="owner_drawing">Owner Drawing</SelectItem>
                <SelectItem value="bank_charge">Bank Charge</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="packaging">Packaging</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!accountId || !amount || Number(amount) <= 0 || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Recording…" : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccountHistoryDialog({ account, onClose }: { account: CashAccount | null; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["finance", "txns", account?.id],
    queryFn: () => fetchTransactions({ accountId: account!.id, limit: 100 }),
    enabled: !!account,
  });

  return (
    <Dialog open={!!account} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{account?.name}</DialogTitle>
          <DialogDescription>
            Current balance: <span className="font-mono font-semibold">{account ? formatBDT(account.current_balance) : ""}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {q.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (q.data ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No transactions yet for this account.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pl-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(q.data ?? []).map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 text-xs">{new Date(t.transaction_date).toLocaleString("en-GB")}</td>
                    <td className="py-2 pr-3 text-xs">{t.type.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{t.description ?? "—"}</td>
                    <td className={cn("py-2 pl-3 text-right font-mono tabular-nums", t.direction === "in" ? "text-green-600" : "text-red-600")}>
                      {t.direction === "in" ? "+" : "-"}{formatBDT(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
