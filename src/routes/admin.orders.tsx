import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Printer,
  FileText,
  Truck,
  CheckCircle2,
  XCircle,
  Phone,
  PauseCircle,
  Package,
  RefreshCw,
  ListFilter,
  Inbox,
  Wallet,
  PhoneOff,
  PackageCheck,
  Undo2,
  User,
  MapPin,
  CreditCard,
  StickyNote,
  Save,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  listOrders,
  getOrderDetail,
  updateOrder,
  bulkUpdateOrders,
  addOrderNote,
} from "@/server/oms.functions";
import { createPathaoConsignment } from "@/server/pathao.functions";
import { Btn, Card, Loading, PageHeader, StageBadge, Empty } from "@/components/admin/ui";
import {
  WORKFLOW_STAGES,
  STAGE_LABEL,
  deriveStage,
  fmtBDT,
  fmtDate,
  fmtDateShort,
  shortId,
  stageToDBUpdate,
  type WorkflowStage,
} from "@/lib/oms";
import { generateInvoicePDF } from "@/lib/pdf/invoice";
import { generatePickingListPDF } from "@/lib/pdf/picking-list";
import { loadPathaoCreds, isPathaoConfigured } from "@/lib/pathao-settings";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
});

const STAGE_ICON: Record<WorkflowStage, React.ReactNode> = {
  processing: <Inbox className="h-3.5 w-3.5" />,
  call_not_received: <PhoneOff className="h-3.5 w-3.5" />,
  on_hold: <PauseCircle className="h-3.5 w-3.5" />,
  advance_payment: <Wallet className="h-3.5 w-3.5" />,
  confirmed: <CheckCircle2 className="h-3.5 w-3.5" />,
  cancelled: <XCircle className="h-3.5 w-3.5" />,
  shipped: <Truck className="h-3.5 w-3.5" />,
  delivered: <PackageCheck className="h-3.5 w-3.5" />,
  returned: <Undo2 className="h-3.5 w-3.5" />,
};

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function avatarColor(seed: string) {
  const palette = [
    "bg-rose-100 text-rose-700",
    "bg-amber-100 text-amber-700",
    "bg-emerald-100 text-emerald-700",
    "bg-sky-100 text-sky-700",
    "bg-violet-100 text-violet-700",
    "bg-pink-100 text-pink-700",
    "bg-teal-100 text-teal-700",
    "bg-indigo-100 text-indigo-700",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}


function OrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<WorkflowStage | "all">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const ordersQ = useQuery({
    queryKey: ["oms", "orders", search],
    queryFn: () => listOrders({ data: { search: search || undefined, limit: 200 } }),
    refetchInterval: 60_000,
  });

  const orders = useMemo(() => {
    const list = ordersQ.data ?? [];
    if (stageFilter === "all") return list;
    return list.filter(
      (o) =>
        deriveStage({
          status: o.status,
          confirmation_status: o.confirmation_status,
          call_status: o.call_status,
          hold_until: o.hold_until,
          advance_amount: o.advance_amount,
        }) === stageFilter,
    );
  }, [ordersQ.data, stageFilter]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const s of WORKFLOW_STAGES) counts[s] = 0;
    for (const o of ordersQ.data ?? []) {
      counts.all++;
      const stg = deriveStage({
        status: o.status,
        confirmation_status: o.confirmation_status,
        call_status: o.call_status,
        hold_until: o.hold_until,
        advance_amount: o.advance_amount,
      });
      counts[stg]++;
    }
    return counts;
  }, [ordersQ.data]);

  const updateMut = useMutation({
    mutationFn: (input: { id: string; patch: Record<string, unknown> }) =>
      updateOrder({ data: input }),
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["oms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkMut = useMutation({
    mutationFn: (input: { ids: string[]; patch: Record<string, unknown> }) =>
      bulkUpdateOrders({ data: input }),
    onSuccess: (res) => {
      toast.success(`Updated ${res.count} orders`);
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["oms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveStage = (id: string, stage: WorkflowStage) =>
    updateMut.mutate({ id, patch: stageToDBUpdate(stage) });

  const bulkMove = (stage: WorkflowStage) => {
    if (selected.length === 0) return;
    bulkMut.mutate({ ids: selected, patch: stageToDBUpdate(stage) });
  };

  const handlePathao1Click = async () => {
    if (selected.length === 0) {
      toast.error("Select at least 1 order");
      return;
    }
    const creds = loadPathaoCreds();
    if (!isPathaoConfigured(creds)) {
      toast.error("Configure Pathao credentials in Settings first");
      return;
    }
    toast.info(`Sending ${selected.length} order(s) to Pathao…`);
    const list = ordersQ.data ?? [];
    let success = 0;
    let failed = 0;
    for (const id of selected) {
      const o = list.find((x) => x.id === id);
      if (!o) continue;
      const res = await createPathaoConsignment({
        data: {
          creds,
          order: {
            merchantOrderId: o.id.slice(0, 12),
            recipientName: o.shipping_name ?? o.guest_name ?? "Customer",
            recipientPhone: o.shipping_phone ?? o.guest_phone ?? "",
            recipientAddress: [o.shipping_address, o.shipping_city, o.shipping_district]
              .filter(Boolean)
              .join(", "),
            amountToCollect:
              (o.payment_method ?? "cod").toLowerCase() === "cod" ? Number(o.total) : 0,
            itemDescription: `Order ${shortId(o.id)}`,
            itemQuantity: 1,
            itemWeight: 0.5,
          },
        },
      });
      if (res.ok) {
        await updateOrder({
          data: {
            id: o.id,
            patch: {
              tracking_number: res.trackingNumber,
              courier_name: "Pathao",
              status: "shipped",
              shipped_at: new Date().toISOString(),
            },
          },
        });
        success++;
      } else {
        failed++;
        console.error("Pathao failed for", o.id, res.error);
      }
    }
    qc.invalidateQueries({ queryKey: ["oms"] });
    setSelected([]);
    if (success > 0) toast.success(`${success} consignment(s) created`);
    if (failed > 0) toast.error(`${failed} failed — check console`);
  };

  const handlePrintInvoice = async (id: string) => {
    try {
      await generateInvoicePDF(id);
    } catch (e) {
      toast.error("Invoice generate failed: " + (e as Error).message);
    }
  };

  const handlePrintPicking = async () => {
    if (selected.length === 0) {
      toast.error("Select at least 1 order");
      return;
    }
    try {
      await generatePickingListPDF(selected);
    } catch (e) {
      toast.error("Picking list failed: " + (e as Error).message);
    }
  };

  const allChecked = orders.length > 0 && selected.length === orders.length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title="Orders"
        subtitle={`${orders.length} of ${stageCounts.all} orders`}
        actions={
          <>
            <Btn
              variant="secondary"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ["oms"] })}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Btn>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 border-b border-border bg-gradient-to-b from-[#1D9E75]/[0.04] to-transparent px-6 py-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiPill label="Total" value={stageCounts.all} tone="slate" icon={<ListFilter className="h-3.5 w-3.5" />} />
        <KpiPill label="Processing" value={stageCounts.processing ?? 0} tone="amber" icon={<Inbox className="h-3.5 w-3.5" />} />
        <KpiPill label="On Hold" value={stageCounts.on_hold ?? 0} tone="orange" icon={<PauseCircle className="h-3.5 w-3.5" />} />
        <KpiPill label="Confirmed" value={stageCounts.confirmed ?? 0} tone="emerald" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        <KpiPill label="Shipped" value={stageCounts.shipped ?? 0} tone="sky" icon={<Truck className="h-3.5 w-3.5" />} />
        <KpiPill label="Delivered" value={stageCounts.delivered ?? 0} tone="teal" icon={<PackageCheck className="h-3.5 w-3.5" />} />
      </div>

      {/* Stage tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-white px-6 py-3">
        {(["all", ...WORKFLOW_STAGES] as const).map((s) => {
          const active = stageFilter === s;
          const count = stageCounts[s] ?? 0;
          return (
            <button
              key={s}
              onClick={() => setStageFilter(s as never)}
              className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "border-[#1D9E75] bg-[#1D9E75] text-white shadow-sm shadow-[#1D9E75]/20"
                  : "border-border bg-white text-muted-foreground hover:border-[#1D9E75]/40 hover:text-foreground"
              }`}
            >
              {s !== "all" && STAGE_ICON[s as WorkflowStage]}
              <span>{s === "all" ? "All Orders" : STAGE_LABEL[s as WorkflowStage]}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  active
                    ? "bg-white/25 text-white"
                    : "bg-muted text-foreground group-hover:bg-[#1D9E75]/10 group-hover:text-[#1D9E75]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + bulk actions */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-white px-6 py-2.5">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone…"
            className="h-9 w-full rounded-lg border border-border bg-white pl-8 pr-3 text-sm outline-none transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15"
          />
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#1D9E75]/30 bg-[#1D9E75]/5 px-2 py-1">
            <span className="rounded-md bg-[#1D9E75] px-2 py-0.5 text-[11px] font-semibold text-white">
              {selected.length} selected
            </span>
            <Btn variant="secondary" size="sm" onClick={() => bulkMove("confirmed")}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
            </Btn>
            <Btn variant="secondary" size="sm" onClick={() => bulkMove("on_hold")}>
              <PauseCircle className="h-3.5 w-3.5" /> Hold
            </Btn>
            <Btn variant="secondary" size="sm" onClick={() => bulkMove("cancelled")}>
              <XCircle className="h-3.5 w-3.5" /> Cancel
            </Btn>
            <Btn variant="secondary" size="sm" onClick={handlePrintPicking}>
              <FileText className="h-3.5 w-3.5" /> Picking
            </Btn>
            <Btn variant="primary" size="sm" onClick={handlePathao1Click}>
              <Truck className="h-3.5 w-3.5" /> 1-Click Pathao
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => setSelected([])}>
              Clear
            </Btn>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {ordersQ.isLoading ? (
          <Loading />
        ) : orders.length === 0 ? (
          <Empty label="No orders found" />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-[1] bg-gradient-to-b from-muted/80 to-muted/50 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                  <tr className="border-b border-border">
                    <th className="w-10 px-3 py-3">
                      <Checkbox
                        checked={allChecked}
                        onCheckedChange={(v) =>
                          setSelected(v ? orders.map((o) => o.id) : [])
                        }
                      />
                    </th>
                    <th className="px-3 py-3 text-left">Order</th>
                    <th className="px-3 py-3 text-left">Customer</th>
                    <th className="px-3 py-3 text-left">Location</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                    <th className="px-3 py-3 text-left">Stage</th>
                    <th className="px-3 py-3 text-left">Courier</th>
                    <th className="px-3 py-3 text-left">Date</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {orders.map((o) => {
                    const stage = deriveStage({
                      status: o.status,
                      confirmation_status: o.confirmation_status,
                      call_status: o.call_status,
                      hold_until: o.hold_until,
                      advance_amount: o.advance_amount,
                    });
                    const isSel = selected.includes(o.id);
                    const isOpen = openOrderId === o.id;
                    const name = o.shipping_name ?? o.guest_name ?? "—";
                    const phone = o.shipping_phone ?? o.guest_phone ?? "—";
                    const ageHrs = (Date.now() - new Date(o.created_at).getTime()) / 3600_000;
                    const isUrgent = ageHrs > 24 && (stage === "processing" || stage === "call_not_received");
                    return (
                      <tr
                        key={o.id}
                        className={`group relative cursor-pointer transition-colors ${
                          isSel
                            ? "bg-[#1D9E75]/[0.06] hover:bg-[#1D9E75]/[0.10]"
                            : isOpen
                              ? "bg-muted/60"
                              : "hover:bg-muted/30"
                        }`}
                        onClick={() => setOpenOrderId(o.id)}
                      >
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            {isSel && (
                              <span className="absolute -left-3 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-[#1D9E75]" />
                            )}
                            <Checkbox
                              checked={isSel}
                              onCheckedChange={(v) =>
                                setSelected((prev) =>
                                  v ? [...prev, o.id] : prev.filter((x) => x !== o.id),
                                )
                              }
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-mono text-xs font-semibold text-foreground">
                            {shortId(o.id)}
                          </div>
                          <div className="mt-1 flex items-center gap-1">
                            {o.is_guest_order && (
                              <span className="inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-inset ring-amber-200">
                                Guest
                              </span>
                            )}
                            {isUrgent && (
                              <span className="inline-block rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-rose-700 ring-1 ring-inset ring-rose-200">
                                {Math.floor(ageHrs / 24)}d old
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-white shadow-sm ${avatarColor(name)}`}
                            >
                              {initials(name)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">{name}</div>
                              <div className="truncate font-mono text-[11px] text-muted-foreground">
                                {phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-xs font-medium text-foreground">
                            {o.shipping_city ?? "—"}
                          </div>
                          {o.shipping_district && (
                            <div className="text-[11px] text-muted-foreground">
                              {o.shipping_district}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="font-semibold tabular-nums text-foreground">
                            {fmtBDT(Number(o.total))}
                          </div>
                          <div className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                            {(o.payment_method ?? "COD").toUpperCase()}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <StageBadge stage={stage} />
                        </td>
                        <td className="px-3 py-3">
                          {o.courier_name ? (
                            <>
                              <div className="text-xs font-medium">{o.courier_name}</div>
                              {o.tracking_number && (
                                <div className="font-mono text-[10px] text-muted-foreground">
                                  {o.tracking_number}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {fmtDateShort(o.created_at)}
                        </td>
                        <td
                          className="px-3 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Btn
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintInvoice(o.id)}
                            title="Print invoice"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Detail modal */}
      <OrderDetailModal
        id={openOrderId}
        onClose={() => setOpenOrderId(null)}
        onMoveStage={(stage) => openOrderId && moveStage(openOrderId, stage)}
        onPrintInvoice={() => openOrderId && handlePrintInvoice(openOrderId)}
      />
    </div>
  );
}

function OrderDetailModal({
  id,
  onClose,
  onMoveStage,
  onPrintInvoice,
}: {
  id: string | null;
  onClose: () => void;
  onMoveStage: (stage: WorkflowStage) => void;
  onPrintInvoice: () => void;
}) {
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-[96vw] max-w-4xl overflow-hidden p-0 sm:rounded-2xl">
        {id && (
          <OrderDetailModalBody
            id={id}
            onMoveStage={onMoveStage}
            onPrintInvoice={onPrintInvoice}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailModalBody({
  id,
  onMoveStage,
  onPrintInvoice,
}: {
  id: string;
  onMoveStage: (stage: WorkflowStage) => void;
  onPrintInvoice: () => void;
}) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const detail = useQuery({
    queryKey: ["oms", "order", id],
    queryFn: () => getOrderDetail({ data: { id } }),
  });

  // Hydrate form from order
  useEffect(() => {
    if (!detail.data) return;
    const o = detail.data.order;
    setForm({
      shipping_name: (o.shipping_name ?? o.guest_name ?? "") as string,
      shipping_phone: (o.shipping_phone ?? o.guest_phone ?? "") as string,
      alternate_phone: (o.alternate_phone ?? "") as string,
      shipping_address: (o.shipping_address ?? "") as string,
      shipping_city: (o.shipping_city ?? "") as string,
      shipping_district: (o.shipping_district ?? "") as string,
      shipping_thana: (o.shipping_thana ?? "") as string,
      payment_method: (o.payment_method ?? "cod") as string,
      advance_amount: String(o.advance_amount ?? 0),
      shipping_fee: String(o.shipping_fee ?? 0),
      discount_amount: String(o.discount_amount ?? 0),
      courier_name: (o.courier_name ?? "") as string,
      tracking_number: (o.tracking_number ?? "") as string,
      admin_notes: (o.admin_notes ?? "") as string,
    });
    setDirty(false);
  }, [detail.data]);

  const setField = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const isGuest = detail.data?.order.is_guest_order;
      const patch: Record<string, unknown> = {
        // Always update shipping_* (works for both guest & user)
        shipping_name: form.shipping_name || null,
        shipping_phone: form.shipping_phone || null,
        alternate_phone: form.alternate_phone || null,
        shipping_address: form.shipping_address || null,
        shipping_city: form.shipping_city || null,
        shipping_district: form.shipping_district || null,
        shipping_thana: form.shipping_thana || null,
        payment_method: form.payment_method || null,
        advance_amount: Number(form.advance_amount) || 0,
        shipping_fee: Number(form.shipping_fee) || 0,
        discount_amount: Number(form.discount_amount) || 0,
        courier_name: form.courier_name || null,
        tracking_number: form.tracking_number || null,
        admin_notes: form.admin_notes || null,
      };
      if (isGuest) {
        patch.guest_name = form.shipping_name || null;
        patch.guest_phone = form.shipping_phone || null;
      }
      // Recalculate total
      const subtotal = Number(detail.data?.order.subtotal ?? 0);
      patch.total =
        subtotal + (Number(form.shipping_fee) || 0) - (Number(form.discount_amount) || 0);
      return updateOrder({ data: { id, patch } });
    },
    onSuccess: () => {
      toast.success("Order saved");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["oms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const noteMut = useMutation({
    mutationFn: (n: string) => addOrderNote({ data: { orderId: id, note: n } }),
    onSuccess: () => {
      setNote("");
      toast.success("Note added");
      qc.invalidateQueries({ queryKey: ["oms", "order", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detail.isLoading || !detail.data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  const o = detail.data.order;
  const stage = deriveStage({
    status: o.status,
    confirmation_status: o.confirmation_status,
    call_status: o.call_status,
    hold_until: o.hold_until,
    advance_amount: o.advance_amount,
  });
  const name = form.shipping_name || "—";
  const subtotal = Number(o.subtotal ?? 0);
  const liveTotal =
    subtotal + (Number(form.shipping_fee) || 0) - (Number(form.discount_amount) || 0);

  return (
    <div className="flex max-h-[90vh] flex-col">
      {/* Header */}
      <DialogHeader className="shrink-0 border-b border-border bg-gradient-to-br from-[#1D9E75]/[0.08] via-white to-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold ring-2 ring-white shadow-sm ${avatarColor(name)}`}
          >
            {initials(name)}
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <span className="truncate">{name}</span>
              <span className="font-mono text-xs text-muted-foreground">{shortId(id)}</span>
            </DialogTitle>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <StageBadge stage={stage} />
              <span>•</span>
              <span>{fmtDate(o.created_at)}</span>
              {o.is_guest_order && (
                <>
                  <span>•</span>
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-inset ring-amber-200">
                    Guest
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="hidden text-right md:block">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </div>
            <div className="text-xl font-bold text-[#1D9E75] tabular-nums">
              {fmtBDT(liveTotal)}
            </div>
          </div>
        </div>
      </DialogHeader>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-muted/20 px-5 py-4">
        {/* Quick stage actions */}
        <Section title="Workflow" icon={<RefreshCw className="h-3 w-3" />}>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            <Btn variant="primary" size="sm" onClick={() => onMoveStage("confirmed")}>
              <CheckCircle2 className="h-3 w-3" /> Confirm
            </Btn>
            <Btn variant="secondary" size="sm" onClick={() => onMoveStage("call_not_received")}>
              <Phone className="h-3 w-3" /> No Ans
            </Btn>
            <Btn variant="secondary" size="sm" onClick={() => onMoveStage("on_hold")}>
              <PauseCircle className="h-3 w-3" /> Hold
            </Btn>
            <Btn variant="secondary" size="sm" onClick={() => onMoveStage("advance_payment")}>
              <Wallet className="h-3 w-3" /> Advance
            </Btn>
            <Btn variant="secondary" size="sm" onClick={() => onMoveStage("shipped")}>
              <Truck className="h-3 w-3" /> Ship
            </Btn>
            <Btn variant="secondary" size="sm" onClick={() => onMoveStage("delivered")}>
              <PackageCheck className="h-3 w-3" /> Delivered
            </Btn>
            <Btn variant="secondary" size="sm" onClick={() => onMoveStage("returned")}>
              <Undo2 className="h-3 w-3" /> Return
            </Btn>
            <Btn variant="danger" size="sm" onClick={() => onMoveStage("cancelled")}>
              <XCircle className="h-3 w-3" /> Cancel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={onPrintInvoice}>
              <Printer className="h-3 w-3" /> Invoice
            </Btn>
          </div>
        </Section>

        <div className="grid gap-3 md:grid-cols-2">
          {/* Customer (editable) */}
          <Section title="Customer" icon={<User className="h-3 w-3" />}>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Name" value={form.shipping_name ?? ""} onChange={(v) => setField("shipping_name", v)} />
              <Input label="Phone" value={form.shipping_phone ?? ""} onChange={(v) => setField("shipping_phone", v)} />
              <Input
                label="Alt phone"
                value={form.alternate_phone ?? ""}
                onChange={(v) => setField("alternate_phone", v)}
              />
              <Select
                label="Payment"
                value={form.payment_method ?? "cod"}
                onChange={(v) => setField("payment_method", v)}
                options={[
                  { value: "cod", label: "COD" },
                  { value: "bkash", label: "bKash" },
                  { value: "nagad", label: "Nagad" },
                  { value: "rocket", label: "Rocket" },
                  { value: "card", label: "Card" },
                ]}
              />
            </div>
          </Section>

          {/* Address (editable) */}
          <Section title="Shipping Address" icon={<MapPin className="h-3 w-3" />}>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Input
                  label="Address"
                  value={form.shipping_address ?? ""}
                  onChange={(v) => setField("shipping_address", v)}
                />
              </div>
              <Input label="City" value={form.shipping_city ?? ""} onChange={(v) => setField("shipping_city", v)} />
              <Input
                label="District"
                value={form.shipping_district ?? ""}
                onChange={(v) => setField("shipping_district", v)}
              />
              <Input
                label="Thana"
                value={form.shipping_thana ?? ""}
                onChange={(v) => setField("shipping_thana", v)}
              />
            </div>
          </Section>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {/* Payment / amounts (editable) */}
          <Section title="Payment & Charges" icon={<CreditCard className="h-3 w-3" />}>
            <div className="grid grid-cols-2 gap-2">
              <ReadOnly label="Subtotal" value={fmtBDT(subtotal)} />
              <Input
                label="Shipping fee"
                type="number"
                value={form.shipping_fee ?? "0"}
                onChange={(v) => setField("shipping_fee", v)}
              />
              <Input
                label="Discount"
                type="number"
                value={form.discount_amount ?? "0"}
                onChange={(v) => setField("discount_amount", v)}
              />
              <Input
                label="Advance"
                type="number"
                value={form.advance_amount ?? "0"}
                onChange={(v) => setField("advance_amount", v)}
              />
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md border border-[#1D9E75]/20 bg-[#1D9E75]/5 px-2.5 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1D9E75]">
                Total
              </span>
              <span className="text-base font-bold text-[#1D9E75] tabular-nums">
                {fmtBDT(liveTotal)}
              </span>
            </div>
          </Section>

          {/* Courier (editable) */}
          <Section title="Courier" icon={<Truck className="h-3 w-3" />}>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Courier"
                value={form.courier_name ?? ""}
                onChange={(v) => setField("courier_name", v)}
                placeholder="Pathao / Steadfast…"
              />
              <Input
                label="Tracking #"
                value={form.tracking_number ?? ""}
                onChange={(v) => setField("tracking_number", v)}
              />
            </div>
            <Textarea
              label="Internal admin note"
              value={form.admin_notes ?? ""}
              onChange={(v) => setField("admin_notes", v)}
              placeholder="Visible to staff only…"
              rows={2}
            />
          </Section>
        </div>

        {/* Items */}
        <div className="mt-3">
          <Section title={`Items (${detail.data.items.length})`} icon={<Package className="h-3 w-3" />}>
            <ul className="divide-y divide-border text-xs">
              {detail.data.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-2">
                  {it.image && (
                    <img
                      src={it.image}
                      alt=""
                      className="h-10 w-10 rounded-md border border-border object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">{it.name}</div>
                    {it.variant_label && (
                      <div className="text-[11px] text-muted-foreground">{it.variant_label}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-muted-foreground">
                      {it.quantity} × {fmtBDT(Number(it.price))}
                    </div>
                    <div className="font-semibold tabular-nums">
                      {fmtBDT(Number(it.price) * Number(it.quantity))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {/* Add note */}
          <Section title="Add note" icon={<StickyNote className="h-3 w-3" />}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Internal note…"
              className="w-full resize-none rounded-md border border-border bg-white px-2 py-1.5 text-xs outline-none transition focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15"
            />
            <Btn
              variant="primary"
              size="sm"
              className="mt-1.5 w-full"
              disabled={!note.trim() || noteMut.isPending}
              onClick={() => noteMut.mutate(note.trim())}
            >
              <StickyNote className="h-3 w-3" /> Add note
            </Btn>
          </Section>

          {/* Activity */}
          <Section title="Activity" icon={<FileText className="h-3 w-3" />}>
            {detail.data.logs.length === 0 ? (
              <div className="py-2 text-center text-xs text-muted-foreground">No activity yet</div>
            ) : (
              <ul className="space-y-2 text-xs">
                {detail.data.logs.slice(0, 6).map((l) => (
                  <li key={l.id} className="border-l-2 border-[#1D9E75]/40 pl-2">
                    <div className="font-medium capitalize">{l.action.replace(/_/g, " ")}</div>
                    {l.note && <div className="text-muted-foreground">{l.note}</div>}
                    <div className="text-[10px] text-muted-foreground">{fmtDate(l.created_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {/* Sticky save bar */}
      <div
        className={`flex shrink-0 items-center justify-between border-t px-5 py-3 transition-colors ${
          dirty
            ? "border-[#1D9E75]/30 bg-[#1D9E75]/5"
            : "border-border bg-white"
        }`}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {dirty ? (
            <>
              <Pencil className="h-3.5 w-3.5 text-[#1D9E75]" />
              <span className="font-medium text-[#1D9E75]">Unsaved changes</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>All changes saved</span>
            </>
          )}
        </div>
        <Btn
          variant="primary"
          size="sm"
          disabled={!dirty || saveMut.isPending}
          onClick={() => saveMut.mutate()}
        >
          <Save className="h-3.5 w-3.5" />
          {saveMut.isPending ? "Saving…" : "Save changes"}
        </Btn>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 rounded-xl border border-border bg-white p-3 shadow-sm last:mb-0">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon && <span className="text-[#1D9E75]">{icon}</span>}
        {title}
      </div>
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-border bg-white px-2.5 text-xs outline-none transition focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-border bg-white px-2 text-xs outline-none transition focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 2,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="mt-2 block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-md border border-border bg-white px-2.5 py-1.5 text-xs outline-none transition focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15"
      />
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-2.5 text-xs font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

function KpiPill({
  label,
  value,
  tone = "slate",
  icon,
}: {
  label: string;
  value: number;
  tone?: "slate" | "amber" | "orange" | "emerald" | "sky" | "teal";
  icon?: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    orange: "bg-orange-50 text-orange-700 ring-orange-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
    teal: "bg-teal-50 text-teal-700 ring-teal-200",
  };
  return (
    <div className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-3.5 py-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#1D9E75]/30 hover:shadow-md">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-xl font-bold tabular-nums leading-none text-foreground">
          {value}
        </div>
      </div>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-transform group-hover:scale-105 ${tones[tone]}`}
      >
        {icon ?? <span className="text-[10px] font-bold">{value > 0 ? "●" : "○"}</span>}
      </div>
    </div>
  );
}
