import { useMemo, useState } from "react";
import { Search, Printer, Truck, Plus, FileText, History, Send } from "lucide-react";
import { useOpsStore } from "@/lib/ops-store";
import {
  COURIERS, DIVISIONS, formatBDT, formatDate,
  type CourierName, type District, type Order, type OrderItem, type OrderStatus, type PaymentMethod,
} from "@/lib/mock-data";
import { calculateFraudScore } from "@/lib/fraud-engine";
import { Btn, FraudBadge, Input, Modal, PageHeader, Select, StatusBadge, Textarea } from "@/components/admin/ui";

const STATUSES: ("All" | OrderStatus)[] = ["All", "Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

export default function OrdersPage() {
  const orders = useOpsStore((s) => s.orders);
  const products = useOpsStore((s) => s.products);
  const customers = useOpsStore((s) => s.customers);
  const selected = useOpsStore((s) => s.selectedOrderIds);
  const toggle = useOpsStore((s) => s.toggleSelectOrder);
  const setSel = useOpsStore((s) => s.setSelectedOrderIds);
  const clearSel = useOpsStore((s) => s.clearSelection);
  const bulkAssignCourier = useOpsStore((s) => s.bulkAssignCourier);
  const addOrder = useOpsStore((s) => s.addOrder);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | OrderStatus>("All");
  const [showNew, setShowNew] = useState(false);
  const [showPicking, setShowPicking] = useState(false);
  const [showCourier, setShowCourier] = useState(false);
  const [invoiceFor, setInvoiceFor] = useState<Order | null>(null);
  const [historyFor, setHistoryFor] = useState<Order | null>(null);
  const [quickCourierFor, setQuickCourierFor] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "All" && o.status !== statusFilter) return false;
      if (!q) return true;
      return o.id.toLowerCase().includes(q) || o.phone.toLowerCase().includes(q);
    });
  }, [orders, search, statusFilter]);

  const allSelected = filtered.length > 0 && filtered.every((o) => selected.includes(o.id));
  const toggleAll = () => {
    if (allSelected) clearSel();
    else setSel(filtered.map((o) => o.id));
  };

  const pendingSelected = orders.filter((o) => selected.includes(o.id) && o.status === "Pending");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title="Orders"
        subtitle={`${filtered.length} of ${orders.length} orders · ${selected.length} selected`}
        actions={
          <>
            <Btn onClick={() => setShowPicking(true)} disabled={selected.length === 0}>
              <Printer className="h-4 w-4" /> Picking List Print
            </Btn>
            <Btn onClick={() => setShowCourier(true)} disabled={pendingSelected.length === 0}>
              <Truck className="h-4 w-4" /> 1-Click Courier Entry
            </Btn>
            <Btn variant="primary" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4" /> New Order
            </Btn>
          </>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-6 py-3 print:hidden">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by Order ID or phone…" className="pl-8" />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-44">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-[#1D9E75]" />
              </th>
              <th className="px-3 py-2.5 text-left">Order ID</th>
              <th className="px-3 py-2.5 text-left">Customer</th>
              <th className="px-3 py-2.5 text-left">Phone</th>
              <th className="px-3 py-2.5 text-left">Items</th>
              <th className="px-3 py-2.5 text-right">Total</th>
              <th className="px-3 py-2.5 text-left">Courier</th>
              <th className="px-3 py-2.5 text-left">Status</th>
              <th className="px-3 py-2.5 text-left">Fraud</th>
              <th className="px-3 py-2.5 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">No orders match.</td></tr>
            ) : filtered.map((o) => (
              <tr key={o.id} className={selected.includes(o.id) ? "bg-[#1D9E75]/5" : "hover:bg-gray-50"}>
                <td className="px-4 py-2.5">
                  <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} className="h-4 w-4 accent-[#1D9E75]" />
                </td>
                <td className="px-3 py-2.5 font-mono text-xs">{o.id}</td>
                <td className="px-3 py-2.5 font-medium text-foreground">{o.customerName}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{o.phone}</td>
                <td className="px-3 py-2.5 max-w-[260px]">
                  <div className="truncate text-xs text-muted-foreground" title={o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}>
                    {o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold">{formatBDT(o.total)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{o.courier}</td>
                <td className="px-3 py-2.5"><StatusBadge status={o.status} /></td>
                <td className="px-3 py-2.5"><FraudBadge score={o.fraudScore} /></td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <Btn size="sm" onClick={() => setInvoiceFor(o)}><FileText className="h-3.5 w-3.5" />Invoice</Btn>
                    <Btn size="sm" onClick={() => setHistoryFor(o)}><History className="h-3.5 w-3.5" />History</Btn>
                    <Btn size="sm" onClick={() => setQuickCourierFor(o)}><Send className="h-3.5 w-3.5" />Quick Courier</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showNew && (
        <NewOrderModal
          onClose={() => setShowNew(false)}
          products={products}
          customers={customers}
          onCreate={(o) => { addOrder(o); setShowNew(false); }}
        />
      )}
      {showPicking && (
        <PickingListModal
          orders={orders.filter((o) => selected.includes(o.id))}
          products={products}
          onClose={() => setShowPicking(false)}
        />
      )}
      {showCourier && (
        <BulkCourierModal
          orders={pendingSelected}
          onClose={() => setShowCourier(false)}
          onAssign={(courier) => { bulkAssignCourier(pendingSelected.map((o) => o.id), courier); clearSel(); setShowCourier(false); }}
        />
      )}
      {invoiceFor && <InvoiceModal order={invoiceFor} onClose={() => setInvoiceFor(null)} />}
      {historyFor && <HistoryModal order={historyFor} onClose={() => setHistoryFor(null)} />}
      {quickCourierFor && (
        <QuickCourierModal
          order={quickCourierFor}
          onClose={() => setQuickCourierFor(null)}
          onAssign={(courier) => { bulkAssignCourier([quickCourierFor.id], courier); setQuickCourierFor(null); }}
        />
      )}
    </div>
  );
}

// ---------------- New Order ----------------
function NewOrderModal({
  onClose, products, customers, onCreate,
}: {
  onClose: () => void;
  products: ReturnType<typeof useOpsStore.getState>["products"];
  customers: ReturnType<typeof useOpsStore.getState>["customers"];
  onCreate: (o: Order) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState<District>("Dhaka");
  const [payment, setPayment] = useState<PaymentMethod>("COD");
  const [courier, setCourier] = useState<CourierName>("Pathao");
  const [qty, setQty] = useState<Record<string, number>>({});

  const items: OrderItem[] = products
    .filter((p) => (qty[p.sku] ?? 0) > 0)
    .map((p) => ({ sku: p.sku, name: p.name, quantity: qty[p.sku], price: p.price }));
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const courierObj = COURIERS.find((c) => c.name === courier)!;
  const delivery = district === "Dhaka" ? courierObj.rate : Math.max(courierObj.rate, 80);
  const total = subtotal + delivery;

  // Live fraud pre-check on phone
  const customer = customers.find((c) => c.phone === phone) ?? null;
  const fraud = phone.length >= 11 ? calculateFraudScore(
    { phone, paymentMethod: payment, orderValue: total, orderHour: new Date().getHours() },
    customer,
    [],
  ) : null;

  const canSubmit = name && phone.length >= 11 && address && items.length > 0;

  const submit = () => {
    if (!canSubmit) return;
    const order: Order = {
      id: `FLR-${Math.floor(Math.random() * 9000) + 1000}`,
      customerName: name,
      phone,
      address,
      district,
      items,
      subtotal,
      deliveryCharge: delivery,
      total,
      paymentMethod: payment,
      courier,
      status: "Pending",
      fraudScore: fraud?.score ?? 0,
      fraudReasons: fraud?.reasons ?? [],
      createdAt: new Date().toISOString(),
    };
    onCreate(order);
  };

  return (
    <Modal open onClose={onClose} title="New Order" size="xl"
      footer={
        <div className="flex items-center justify-between">
          <div className="text-sm">Total: <span className="font-bold text-[#1D9E75]">{formatBDT(total)}</span></div>
          <div className="flex gap-2">
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" disabled={!canSubmit} onClick={submit}>Confirm Order</Btn>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Field label="Customer Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="017XXXXXXXX" />
            {fraud && (
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                <FraudBadge score={fraud.score} blacklisted={fraud.label === "BLACKLISTED"} />
                <span className="text-muted-foreground">{fraud.label}</span>
              </div>
            )}
          </Field>
          <Field label="Address"><Textarea value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="District">
              <Select value={district} onChange={(e) => setDistrict(e.target.value as District)}>
                {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Payment">
              <Select value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod)}>
                {(["COD", "bKash", "Nagad", "Card"] as PaymentMethod[]).map((p) => <option key={p}>{p}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Courier">
            <div className="grid grid-cols-2 gap-2">
              {COURIERS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCourier(c.name)}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                    courier === c.name
                      ? "border-[#1D9E75] bg-[#1D9E75]/5 text-foreground ring-2 ring-[#1D9E75]/20"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.coverage}</div>
                  </div>
                  <div className="text-xs font-semibold">{formatBDT(c.rate)}</div>
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Products</div>
          <div className="max-h-[420px] space-y-1.5 overflow-y-auto rounded-md border border-gray-200 p-2">
            {products.map((p) => (
              <div key={p.sku} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.sku} · {formatBDT(p.price)} · stock {p.stock}</div>
                </div>
                <Input
                  type="number" min={0} max={p.stock} value={qty[p.sku] ?? 0}
                  onChange={(e) => setQty((q) => ({ ...q, [p.sku]: Math.max(0, Number(e.target.value) || 0) }))}
                  className="h-8 w-20 text-right"
                />
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 rounded-md bg-gray-50 p-3 text-sm">
            <Row label="Subtotal" value={formatBDT(subtotal)} />
            <Row label="Delivery" value={formatBDT(delivery)} />
            <div className="flex justify-between border-t border-gray-200 pt-1.5 text-sm font-semibold">
              <span>Total</span><span className="text-[#1D9E75]">{formatBDT(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

// ---------------- Invoice ----------------
function InvoiceModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Invoice" size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Btn onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Btn>
        </div>
      }
    >
      <div className="print-area space-y-4 text-sm">
        <div className="flex items-start justify-between border-b pb-3">
          <div>
            <div className="text-xl font-bold tracking-tight text-[#1D9E75]">BrandOMS</div>
            <div className="text-xs text-muted-foreground">Florencia · Dhaka, Bangladesh</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm">{order.id}</div>
            <div className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-[11px] font-semibold uppercase text-muted-foreground">Bill To</div>
            <div className="mt-1 font-medium">{order.customerName}</div>
            <div className="text-muted-foreground">{order.phone}</div>
            <div className="text-muted-foreground">{order.address}, {order.district}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground">Payment</div>
            <div className="mt-1 font-medium">{order.paymentMethod}</div>
            <div className="text-muted-foreground">Courier: {order.courier}</div>
          </div>
        </div>
        <table className="w-full border-t border-b text-sm">
          <thead className="text-[11px] font-semibold uppercase text-muted-foreground">
            <tr><th className="py-2 text-left">Item</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((i, k) => (
              <tr key={k}>
                <td className="py-2">{i.name} <span className="text-[11px] text-muted-foreground">({i.sku})</span></td>
                <td className="text-right">{i.quantity}</td>
                <td className="text-right">{formatBDT(i.price)}</td>
                <td className="text-right font-medium">{formatBDT(i.price * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ml-auto w-64 space-y-1">
          <Row label="Subtotal" value={formatBDT(order.subtotal)} />
          <Row label="Delivery" value={formatBDT(order.deliveryCharge)} />
          <div className="flex justify-between border-t pt-1.5 text-base font-bold">
            <span>Grand Total</span><span className="text-[#1D9E75]">{formatBDT(order.total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------------- History ----------------
function HistoryModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const events = [
    { t: order.createdAt, label: "Order placed" },
    ...(order.status !== "Pending" ? [{ t: order.createdAt, label: "Confirmed by ops" }] : []),
    ...(["Shipped", "Delivered"].includes(order.status) ? [{ t: order.createdAt, label: `Handed to ${order.courier}` }] : []),
    ...(order.status === "Delivered" ? [{ t: order.createdAt, label: "Delivered to customer" }] : []),
    ...(order.status === "Cancelled" ? [{ t: order.createdAt, label: "Cancelled" }] : []),
  ];
  return (
    <Modal open onClose={onClose} title={`History · ${order.id}`}>
      <ol className="space-y-2.5">
        {events.map((e, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#1D9E75]" />
            <div>
              <div className="text-sm font-medium">{e.label}</div>
              <div className="text-[11px] text-muted-foreground">{formatDate(e.t)}</div>
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  );
}

// ---------------- Quick & Bulk Courier ----------------
function QuickCourierModal({ order, onClose, onAssign }: { order: Order; onClose: () => void; onAssign: (c: CourierName) => void }) {
  const [c, setC] = useState<CourierName>(order.courier);
  return (
    <Modal open onClose={onClose} title={`Quick Courier · ${order.id}`}
      footer={<div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={() => onAssign(c)}>Assign & Ship</Btn></div>}>
      <div className="grid grid-cols-2 gap-2">
        {COURIERS.map((opt) => (
          <button key={opt.name} type="button" onClick={() => setC(opt.name)}
            className={`rounded-md border px-3 py-2 text-left text-sm ${c === opt.name ? "border-[#1D9E75] bg-[#1D9E75]/5 ring-2 ring-[#1D9E75]/20" : "border-gray-200 hover:bg-gray-50"}`}>
            <div className="font-medium">{opt.name}</div>
            <div className="text-[11px] text-muted-foreground">{opt.coverage} · {formatBDT(opt.rate)}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function BulkCourierModal({ orders, onClose, onAssign }: { orders: Order[]; onClose: () => void; onAssign: (c: CourierName) => void }) {
  const [c, setC] = useState<CourierName>("Pathao");
  return (
    <Modal open onClose={onClose} title={`1-Click Courier Entry · ${orders.length} pending orders`}
      footer={<div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={() => onAssign(c)}>Assign to {c}</Btn></div>}>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {COURIERS.map((opt) => (
          <button key={opt.name} type="button" onClick={() => setC(opt.name)}
            className={`rounded-md border px-3 py-2 text-left text-sm ${c === opt.name ? "border-[#1D9E75] bg-[#1D9E75]/5 ring-2 ring-[#1D9E75]/20" : "border-gray-200 hover:bg-gray-50"}`}>
            <div className="font-medium">{opt.name}</div>
            <div className="text-[11px] text-muted-foreground">{opt.coverage} · {formatBDT(opt.rate)}</div>
          </button>
        ))}
      </div>
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs">
        <div className="mb-1 font-semibold">Will assign tracking + ship status to:</div>
        <ul className="list-disc pl-4 text-muted-foreground">
          {orders.map((o) => <li key={o.id}>{o.id} · {o.customerName} · {o.phone}</li>)}
        </ul>
      </div>
    </Modal>
  );
}

// ---------------- Picking List ----------------
function PickingListModal({
  orders, products, onClose,
}: {
  orders: Order[];
  products: ReturnType<typeof useOpsStore.getState>["products"];
  onClose: () => void;
}) {
  const pending = orders.filter((o) => o.status === "Pending");
  const lookup = (sku: string) => products.find((p) => p.sku === sku);

  return (
    <Modal open onClose={onClose} title={`Picking List · ${pending.length} pending orders`} size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Btn onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Btn>
        </div>
      }
    >
      <div className="print-area">
        <div className="mb-3 flex items-center justify-between border-b pb-2">
          <div className="text-lg font-bold text-[#1D9E75]">BrandOMS — Picking List</div>
          <div className="text-xs text-muted-foreground">{formatDate(new Date().toISOString())}</div>
        </div>
        {pending.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">No pending orders selected.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="w-8"></th>
                <th className="py-2 text-left">Order</th>
                <th className="text-left">Customer</th>
                <th className="text-left">Product</th>
                <th className="text-left">SKU</th>
                <th className="text-right">Qty</th>
                <th className="text-left">Shelf</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pending.flatMap((o) =>
                o.items.map((it, idx) => (
                  <tr key={`${o.id}-${idx}`}>
                    <td className="py-2"><input type="checkbox" className="h-4 w-4 accent-[#1D9E75]" /></td>
                    <td className="font-mono text-xs">{o.id}</td>
                    <td>{o.customerName}</td>
                    <td>{it.name}</td>
                    <td className="font-mono text-xs">{it.sku}</td>
                    <td className="text-right font-semibold">{it.quantity}</td>
                    <td className="text-muted-foreground">{lookup(it.sku)?.category ?? "—"}-{it.sku.slice(-3)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}
