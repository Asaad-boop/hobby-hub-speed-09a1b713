import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Wallet, ArrowRightLeft, Truck, AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { fetchAccounts, formatBDT } from "@/lib/finance";
import { fetchPendingCodShipments, recordCodSettlement, findDefaultAccount, type PendingShipment } from "@/lib/cod-settlement";

export const Route = createFileRoute("/admin/finance/settlements")({
  component: SettlementsPage,
});

function netForShipment(s: PendingShipment) {
  return Math.max(0, s.cod_amount_expected - s.actual_delivery_charge - s.actual_cod_charge);
}

function SettlementsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fromAcc, setFromAcc] = useState("");
  const [toAcc, setToAcc] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [reference, setReference] = useState("");
  const [settlementDate, setSettlementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  const { data: accounts = [] } = useQuery({ queryKey: ["finance", "accounts"], queryFn: fetchAccounts });
  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["finance", "pending-cod"],
    queryFn: fetchPendingCodShipments,
  });

  const selectedShipments = useMemo(
    () => shipments.filter((s) => selected[s.id]),
    [shipments, selected]
  );
  const expectedTotal = useMemo(
    () => selectedShipments.reduce((sum, s) => sum + netForShipment(s), 0),
    [selectedShipments]
  );
  const grossExpected = useMemo(
    () => selectedShipments.reduce((sum, s) => sum + s.cod_amount_expected, 0),
    [selectedShipments]
  );
  const courierCharges = useMemo(
    () => selectedShipments.reduce((sum, s) => sum + s.actual_delivery_charge + s.actual_cod_charge, 0),
    [selectedShipments]
  );

  const totalPendingCount = shipments.length;
  const totalPendingExpected = useMemo(
    () => shipments.reduce((sum, s) => sum + netForShipment(s), 0),
    [shipments]
  );

  function openDialog() {
    if (selectedShipments.length === 0) {
      toast.error("Select at least one shipment to settle");
      return;
    }
    const pathao = findDefaultAccount(accounts, "pathao_pending");
    const bkash = findDefaultAccount(accounts, "bkash") ?? findDefaultAccount(accounts, "bank");
    setFromAcc(pathao?.id ?? "");
    setToAcc(bkash?.id ?? "");
    setAmountReceived(expectedTotal.toFixed(2));
    setDialogOpen(true);
  }

  const settleMutation = useMutation({
    mutationFn: async () => {
      return recordCodSettlement({
        shipmentIds: selectedShipments.map((s) => s.id),
        fromAccountId: fromAcc,
        toAccountId: toAcc,
        amountReceived: Number(amountReceived),
        expectedAmount: expectedTotal,
        settlementDate,
        reference: reference || undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: (batchId) => {
      toast.success(`Settlement recorded — batch ${batchId.slice(0, 8)}`);
      setDialogOpen(false);
      setSelected({});
      setReference("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allChecked = shipments.length > 0 && shipments.every((s) => selected[s.id]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">COD Settlements</h1>
          <p className="text-sm text-muted-foreground">
            Reconcile Pathao COD payouts against delivered shipments and your cash account balances.
          </p>
        </div>
        <Button onClick={openDialog} disabled={selectedShipments.length === 0}>
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Record settlement ({selectedShipments.length})
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={Truck} label="Pending shipments" value={String(totalPendingCount)} />
        <KpiCard icon={Wallet} label="Expected COD (net)" value={formatBDT(totalPendingExpected)} />
        <KpiCard icon={CheckCircle2} label="Selected total (net)" value={formatBDT(expectedTotal)} accent />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Awaiting settlement</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : shipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <p className="font-medium">All caught up</p>
              <p className="text-sm">No delivered shipments are awaiting COD settlement.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allChecked}
                        onCheckedChange={(v) => {
                          const next: Record<string, boolean> = {};
                          if (v) shipments.forEach((s) => (next[s.id] = true));
                          setSelected(next);
                        }}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">COD expected</TableHead>
                    <TableHead className="text-right">Courier fees</TableHead>
                    <TableHead className="text-right">Net payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((s) => {
                    const net = netForShipment(s);
                    const fees = s.actual_delivery_charge + s.actual_cod_charge;
                    return (
                      <TableRow key={s.id} data-state={selected[s.id] ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={!!selected[s.id]}
                            onCheckedChange={(v) =>
                              setSelected((prev) => ({ ...prev, [s.id]: !!v }))
                            }
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {s.tracking_id || s.consignment_id || s.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{s.customer_name ?? "—"}</TableCell>
                        <TableCell>
                          {s.delivered_at ? format(new Date(s.delivered_at), "dd MMM yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.status === "delivered" ? "default" : "secondary"}>
                            {s.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatBDT(s.cod_amount_expected)}</TableCell>
                        <TableCell className="text-right text-red-600">−{formatBDT(fees)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatBDT(net)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record COD settlement</DialogTitle>
            <DialogDescription>
              Move the actual amount Pathao deposited from "Pathao Pending COD" into your bKash or Bank account.
              Any difference vs. the expected net is auto-recorded as a reconciliation adjustment.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From account</Label>
                <Select value={fromAcc} onValueChange={setFromAcc}>
                  <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} · {formatBDT(a.current_balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To account</Label>
                <Select value={toAcc} onValueChange={setToAcc}>
                  <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Settlement date</Label>
                <Input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} />
              </div>
              <div>
                <Label>Batch reference (optional)</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Pathao payout ID" />
              </div>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between"><span>Selected shipments</span><span>{selectedShipments.length}</span></div>
              <div className="flex justify-between"><span>Gross COD</span><span>{formatBDT(grossExpected)}</span></div>
              <div className="flex justify-between text-red-600"><span>Courier fees</span><span>−{formatBDT(courierCharges)}</span></div>
              <div className="flex justify-between font-semibold pt-1 border-t mt-1"><span>Expected net payout</span><span>{formatBDT(expectedTotal)}</span></div>
            </div>

            <div>
              <Label>Amount actually received</Label>
              <Input
                type="number"
                step="0.01"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
              />
              {Math.abs(Number(amountReceived || 0) - expectedTotal) > 0.01 && (
                <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  Variance of {formatBDT(Number(amountReceived || 0) - expectedTotal, { sign: true })} will be recorded as an adjustment.
                </div>
              )}
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => settleMutation.mutate()}
              disabled={settleMutation.isPending || !fromAcc || !toAcc || !amountReceived}
            >
              {settleMutation.isPending ? "Recording…" : "Confirm settlement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: typeof Wallet; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-primary/40" : ""}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-md p-2 ${accent ? "bg-primary/10 text-primary" : "bg-muted"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
