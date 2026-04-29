import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  PackageX,
  Undo2,
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
      <div className="grid grid-cols-2 gap-2 border-b border-border bg-gradient-to-b from-muted/30 to-transparent px-6 py-3 sm:grid-cols-4 lg:grid-cols-5">
        <KpiPill
          label="Total"
          value={stageCounts.all}
          icon={<ListFilter className="h-3.5 w-3.5" />}
        />
        <KpiPill label="Processing" value={stageCounts.processing ?? 0} tone="amber" />
        <KpiPill label="Confirmed" value={stageCounts.confirmed ?? 0} tone="emerald" />
        <KpiPill label="Shipped" value={stageCounts.shipped ?? 0} tone="sky" />
        <KpiPill label="Delivered" value={stageCounts.delivered ?? 0} tone="teal" />
      </div>

      {/* Stage tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-white px-6 py-2.5">
        {(["all", ...WORKFLOW_STAGES] as const).map((s) => {
          const active = stageFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStageFilter(s as never)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                active
                  ? "border-[#1D9E75] bg-[#1D9E75] text-white shadow-sm"
                  : "border-transparent bg-muted text-muted-foreground hover:border-border hover:bg-white"
              }`}
            >
              {s !== "all" && STAGE_ICON[s as WorkflowStage]}
              {s === "all" ? "All" : STAGE_LABEL[s as WorkflowStage]}
              <span
                className={`ml-0.5 rounded-full px-1.5 text-[10px] ${
                  active ? "bg-white/20 text-white" : "bg-white text-foreground"
                }`}
              >
                {stageCounts[s] ?? 0}
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
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto px-6 py-4">
          {ordersQ.isLoading ? (
            <Loading />
          ) : orders.length === 0 ? (
            <Empty label="No orders found" />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-[1] bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                    <tr>
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
                  <tbody className="divide-y divide-border">
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
                      return (
                        <tr
                          key={o.id}
                          className={`group cursor-pointer transition-colors ${
                            isSel
                              ? "bg-[#1D9E75]/5 hover:bg-[#1D9E75]/10"
                              : isOpen
                                ? "bg-muted"
                                : "hover:bg-muted/40"
                          }`}
                          onClick={() => setOpenOrderId(o.id)}
                        >
                          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSel}
                              onCheckedChange={(v) =>
                                setSelected((prev) =>
                                  v ? [...prev, o.id] : prev.filter((x) => x !== o.id),
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-mono text-xs font-semibold text-foreground">
                              #{shortId(o.id)}
                            </div>
                            {o.is_guest_order && (
                              <div className="mt-0.5 inline-block rounded bg-amber-50 px-1 text-[9px] font-medium uppercase tracking-wider text-amber-700">
                                Guest
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarColor(name)}`}
                              >
                                {initials(name)}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">{name}</div>
                                <div className="truncate text-[11px] text-muted-foreground">
                                  {phone}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-xs text-foreground">{o.shipping_city ?? "—"}</div>
                            {o.shipping_district && (
                              <div className="text-[11px] text-muted-foreground">
                                {o.shipping_district}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="font-semibold tabular-nums text-foreground">
                              {fmtBDT(Number(o.total))}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {(o.payment_method ?? "COD").toUpperCase()}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <StageBadge stage={stage} />
                          </td>
                          <td className="px-3 py-2.5">
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
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {fmtDateShort(o.created_at)}
                          </td>
                          <td
                            className="px-3 py-2.5 text-right"
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

        {/* Detail drawer */}
        {openOrderId && (
          <OrderDetailDrawer
            id={openOrderId}
            onClose={() => setOpenOrderId(null)}
            onMoveStage={(stage) => moveStage(openOrderId, stage)}
            onPrintInvoice={() => handlePrintInvoice(openOrderId)}
          />
        )}
      </div>
    </div>
  );
}

function OrderDetailDrawer({
  id,
  onClose,
  onMoveStage,
  onPrintInvoice,
}: {
  id: string;
  onClose: () => void;
  onMoveStage: (stage: WorkflowStage) => void;
  onPrintInvoice: () => void;
}) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const detail = useQuery({
    queryKey: ["oms", "order", id],
    queryFn: () => getOrderDetail({ data: { id } }),
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

  return (
    <aside className="flex w-[420px] shrink-0 flex-col border-l border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Order
          </div>
          <div className="font-mono text-sm font-semibold">{shortId(id)}</div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {detail.isLoading || !detail.data ? (
          <Loading />
        ) : (
          <>
            {/* Stage */}
            <div className="mb-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Current stage
              </div>
              <StageBadge
                stage={deriveStage({
                  status: detail.data.order.status,
                  confirmation_status: detail.data.order.confirmation_status,
                  call_status: detail.data.order.call_status,
                  hold_until: detail.data.order.hold_until,
                  advance_amount: detail.data.order.advance_amount,
                })}
              />
            </div>

            {/* Quick actions */}
            <div className="mb-4 grid grid-cols-3 gap-1.5">
              <Btn variant="secondary" size="sm" onClick={() => onMoveStage("call_not_received")}>
                <Phone className="h-3 w-3" /> No Ans
              </Btn>
              <Btn variant="secondary" size="sm" onClick={() => onMoveStage("on_hold")}>
                <PauseCircle className="h-3 w-3" /> Hold
              </Btn>
              <Btn variant="secondary" size="sm" onClick={() => onMoveStage("advance_payment")}>
                <Package className="h-3 w-3" /> Advance
              </Btn>
              <Btn variant="primary" size="sm" onClick={() => onMoveStage("confirmed")}>
                <CheckCircle2 className="h-3 w-3" /> Confirm
              </Btn>
              <Btn variant="secondary" size="sm" onClick={() => onMoveStage("shipped")}>
                <Truck className="h-3 w-3" /> Ship
              </Btn>
              <Btn variant="secondary" size="sm" onClick={() => onMoveStage("delivered")}>
                <CheckCircle2 className="h-3 w-3" /> Delivered
              </Btn>
              <Btn variant="danger" size="sm" onClick={() => onMoveStage("cancelled")}>
                <XCircle className="h-3 w-3" /> Cancel
              </Btn>
              <Btn variant="secondary" size="sm" onClick={() => onMoveStage("returned")}>
                <RefreshCw className="h-3 w-3" /> Return
              </Btn>
              <Btn variant="ghost" size="sm" onClick={onPrintInvoice}>
                <Printer className="h-3 w-3" /> Invoice
              </Btn>
            </div>

            {/* Customer */}
            <Section title="Customer">
              <Field label="Name" value={detail.data.order.shipping_name ?? detail.data.order.guest_name} />
              <Field label="Phone" value={detail.data.order.shipping_phone ?? detail.data.order.guest_phone} />
              <Field
                label="Address"
                value={[
                  detail.data.order.shipping_address,
                  detail.data.order.shipping_city,
                  detail.data.order.shipping_district,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
            </Section>

            {/* Items */}
            <Section title={`Items (${detail.data.items.length})`}>
              <ul className="divide-y divide-border text-xs">
                {detail.data.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between py-1.5">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="truncate font-medium">{it.name}</div>
                      {it.variant_label && (
                        <div className="text-muted-foreground">{it.variant_label}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div>{it.quantity} ×</div>
                      <div className="font-semibold">{fmtBDT(Number(it.price))}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            {/* Totals */}
            <Section title="Payment">
              <Field label="Subtotal" value={fmtBDT(Number(detail.data.order.subtotal))} />
              <Field label="Shipping" value={fmtBDT(Number(detail.data.order.shipping_fee))} />
              <Field label="Discount" value={fmtBDT(Number(detail.data.order.discount_amount))} />
              <Field label="Advance" value={fmtBDT(Number(detail.data.order.advance_amount))} />
              <Field
                label="Total"
                value={<span className="font-bold">{fmtBDT(Number(detail.data.order.total))}</span>}
              />
              <Field label="Method" value={(detail.data.order.payment_method ?? "COD").toUpperCase()} />
              {detail.data.order.tracking_number && (
                <Field label="Tracking" value={detail.data.order.tracking_number} />
              )}
            </Section>

            {/* Add note */}
            <Section title="Add note">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Internal note…"
                className="w-full resize-none rounded-md border border-border bg-white px-2 py-1.5 text-xs outline-none focus:border-[#1D9E75]"
              />
              <Btn
                variant="primary"
                size="sm"
                className="mt-1.5 w-full"
                disabled={!note.trim() || noteMut.isPending}
                onClick={() => noteMut.mutate(note.trim())}
              >
                Add note
              </Btn>
            </Section>

            {/* Activity */}
            <Section title="Activity">
              {detail.data.logs.length === 0 ? (
                <div className="text-xs text-muted-foreground">No activity yet</div>
              ) : (
                <ul className="space-y-2 text-xs">
                  {detail.data.logs.map((l) => (
                    <li key={l.id} className="border-l-2 border-border pl-2">
                      <div className="font-medium">{l.action}</div>
                      {l.note && <div className="text-muted-foreground">{l.note}</div>}
                      <div className="text-[10px] text-muted-foreground">
                        {fmtDate(l.created_at)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-0.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value || "—"}</span>
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
  tone?: "slate" | "amber" | "emerald" | "sky" | "teal";
  icon?: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
    teal: "bg-teal-50 text-teal-700 ring-teal-200",
  };
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-white px-3 py-2 shadow-sm">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</div>
      </div>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${tones[tone]}`}
      >
        {icon ?? <span className="text-[10px] font-bold">{value > 0 ? "●" : "○"}</span>}
      </div>
    </div>
  );
}
