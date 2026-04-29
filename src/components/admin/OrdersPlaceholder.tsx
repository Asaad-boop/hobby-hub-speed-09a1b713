import { useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  Loader2,
  RefreshCw,
  Phone,
  Search,
  MapPin,
  User,
  Package,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Truck,
  PhoneCall,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOpsStore } from "@/lib/ops-store";

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  inventory: "Inventory",
  courier: "Courier & Fraud",
  reports: "Reports",
};

type OrderItem = {
  id?: string;
  name: string;
  image: string | null;
  quantity: number;
  price: number;
  unit_price?: number | null;
  variant_label?: string | null;
  line_total?: number | null;
};

type OrderRow = {
  id: string;
  created_at: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_district: string | null;
  shipping_thana: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  total: number;
  subtotal: number | null;
  shipping_fee: number | null;
  discount_amount: number | null;
  status: string;
  payment_method: string | null;
  order_items: OrderItem[] | null;
};

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 ring-blue-200",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  packaging: "bg-amber-50 text-amber-700 ring-amber-200",
  packed: "bg-amber-50 text-amber-700 ring-amber-200",
  ready_to_ship: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  shipped: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  delivered: "bg-[#1D9E75]/10 text-[#1D9E75] ring-[#1D9E75]/20",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  fake: "bg-gray-100 text-gray-600 ring-gray-200",
  returned: "bg-orange-50 text-orange-700 ring-orange-200",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700 ring-gray-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${cls}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

const formatBDT = (n: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  })
    .format(n)
    .replace("BDT", "৳");

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

// Deterministic placeholder fraud score from order id
function fraudScoreFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 100;
}

function fraudTone(score: number) {
  if (score < 30) return { label: "Low risk", color: "text-[#1D9E75]", bg: "bg-[#1D9E75]/10", ring: "ring-[#1D9E75]/20" };
  if (score < 65) return { label: "Medium risk", color: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200" };
  return { label: "High risk", color: "text-rose-700", bg: "bg-rose-50", ring: "ring-rose-200" };
}

function OrdersWorkspace() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("orders")
      .select(
        `id, created_at, shipping_name, shipping_phone, shipping_address, shipping_city,
         shipping_district, shipping_thana, guest_name, guest_phone, guest_email,
         total, subtotal, shipping_fee, discount_amount, status, payment_method,
         order_items ( id, name, image, quantity, price, unit_price, variant_label, line_total )`,
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) setError(error.message);
    else {
      const rows = (data ?? []) as OrderRow[];
      setOrders(rows);
      if (!selectedId && rows.length) setSelectedId(rows[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const name = (o.shipping_name || o.guest_name || "").toLowerCase();
      const phone = (o.shipping_phone || o.guest_phone || "").toLowerCase();
      return (
        name.includes(q) ||
        phone.includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    });
  }, [orders, search]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Orders</h2>
          <p className="text-xs text-muted-foreground">
            {orders.length} orders loaded from Supabase
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* 3-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Queue */}
        <aside className="flex w-[340px] shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, ID…"
                className="h-9 w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && orders.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="px-4 py-8 text-center text-sm text-rose-600">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-12 text-center text-xs text-muted-foreground">
                No orders match your search.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filtered.map((o) => {
                  const name = o.shipping_name || o.guest_name || "—";
                  const phone = o.shipping_phone || o.guest_phone || "";
                  const isActive = o.id === selectedId;
                  return (
                    <li key={o.id}>
                      <button
                        onClick={() => setSelectedId(o.id)}
                        className={`flex w-full flex-col items-stretch gap-1 px-4 py-3 text-left transition ${
                          isActive
                            ? "bg-[#1D9E75]/8 ring-1 ring-inset ring-[#1D9E75]/20"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            #{o.id.slice(0, 8)}
                          </span>
                          <StatusBadge status={o.status} />
                        </div>
                        <div className="truncate text-sm font-medium text-foreground">
                          {name}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {phone || "—"}
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatBDT(Number(o.total) || 0)}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* CENTER — Workspace */}
        <section className="flex flex-1 flex-col overflow-hidden bg-gray-50">
          {selected ? (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <OrderDetail order={selected} />
              </div>

              {/* BOTTOM — Sticky action bar */}
              <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-3 shadow-[0_-4px_12px_-8px_rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    Order{" "}
                    <span className="font-mono text-foreground">#{selected.id.slice(0, 8)}</span>
                  </span>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="flex items-center gap-2">
                  <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-gray-50">
                    <PhoneCall className="h-4 w-4" />
                    Call
                  </button>
                  <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-gray-50">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </button>
                  <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-rose-50 px-3 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-100">
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                  <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-gray-50">
                    <Truck className="h-4 w-4" />
                    Ship
                  </button>
                  <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#1D9E75] px-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#178A65]">
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm Order
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1D9E75]/10 text-[#1D9E75]">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">Select an order</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Choose an order from the queue to view details.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function OrderDetail({ order }: { order: OrderRow }) {
  const customerName = order.shipping_name || order.guest_name || "—";
  const customerPhone = order.shipping_phone || order.guest_phone || "—";
  const items = order.order_items ?? [];
  const score = fraudScoreFor(order.id);
  const tone = fraudTone(score);

  const subtotal = Number(order.subtotal ?? 0);
  const shippingFee = Number(order.shipping_fee ?? 0);
  const discount = Number(order.discount_amount ?? 0);
  const total = Number(order.total ?? 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Order #{order.id.slice(0, 8)}
            </h3>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Placed on {formatDate(order.created_at)}
          </p>
        </div>
        <div
          className={`flex flex-col items-end rounded-lg px-3 py-2 ring-1 ring-inset ${tone.bg} ${tone.ring}`}
        >
          <div className="flex items-center gap-1.5">
            <ShieldAlert className={`h-3.5 w-3.5 ${tone.color}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${tone.color}`}>
              Fraud Score
            </span>
          </div>
          <div className={`mt-0.5 text-xl font-bold ${tone.color}`}>{score}</div>
          <div className={`text-[10px] ${tone.color}`}>{tone.label} (placeholder)</div>
        </div>
      </div>

      {/* Customer + Address */}
      <div className="grid gap-4 md:grid-cols-2">
        <Section icon={<User className="h-4 w-4" />} title="Customer">
          <Field label="Name" value={customerName} />
          <Field label="Phone" value={customerPhone} />
          {order.guest_email && <Field label="Email" value={order.guest_email} />}
        </Section>

        <Section icon={<MapPin className="h-4 w-4" />} title="Shipping Address">
          <p className="text-sm text-foreground">{order.shipping_address || "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {[order.shipping_thana, order.shipping_city, order.shipping_district]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
        </Section>
      </div>

      {/* Items */}
      <Section icon={<Package className="h-4 w-4" />} title={`Items (${items.length})`}>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No items.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((it, i) => (
              <li key={it.id ?? i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100 ring-1 ring-gray-200">
                  {it.image ? (
                    <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Package className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{it.name}</div>
                  {it.variant_label && (
                    <div className="text-xs text-muted-foreground">{it.variant_label}</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {it.quantity} × {formatBDT(Number(it.unit_price ?? it.price) || 0)}
                  </div>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {formatBDT(Number(it.line_total ?? Number(it.price) * it.quantity) || 0)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Totals */}
      <Section title="Payment Summary">
        <Row label="Subtotal" value={formatBDT(subtotal)} />
        <Row label="Shipping" value={formatBDT(shippingFee)} />
        {discount > 0 && (
          <Row label="Discount" value={`- ${formatBDT(discount)}`} valueClass="text-rose-600" />
        )}
        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-base font-bold text-[#1D9E75]">{formatBDT(total)}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Payment method: {order.payment_method || "—"}
        </div>
      </Section>
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
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium text-foreground ${valueClass}`}>{value}</span>
    </div>
  );
}

function ComingSoonView({ title }: { title: string }) {
  return (
    <div className="space-y-6 px-4 pb-10 pt-6 md:px-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">This section is coming soon.</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">Nothing here yet</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          We'll wire this up next.
        </p>
      </div>
    </div>
  );
}

export default function OrdersPlaceholder() {
  const active = useOpsStore((s) => s.active);
  if (active === "orders") return <OrdersWorkspace />;
  return <ComingSoonView title={TITLES[active] ?? "Coming soon"} />;
}
