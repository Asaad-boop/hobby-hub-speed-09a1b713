import { useEffect, useState } from "react";
import { ShoppingCart, Loader2, RefreshCw, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOpsStore } from "@/lib/ops-store";

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  inventory: "Inventory",
  courier: "Courier & Fraud",
  reports: "Reports",
};

type OrderRow = {
  id: string;
  created_at: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_city: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  total: number;
  status: string;
  payment_method: string | null;
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

const formatBDT = (n: number) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 })
    .format(n)
    .replace("BDT", "৳");

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function OrdersView() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, created_at, shipping_name, shipping_phone, shipping_city, guest_name, guest_phone, total, status, payment_method",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) setError(error.message);
    else setOrders((data ?? []) as OrderRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "new").length,
    shipped: orders.filter((o) => o.status === "shipped" || o.status === "ready_to_ship").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Orders</h2>
          <p className="text-sm text-muted-foreground">
            Live data from your store — {stats.total} orders loaded.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Orders", value: stats.total },
          { label: "New / Pending", value: stats.pending },
          { label: "Shipped", value: stats.shipped },
          { label: "Delivered", value: stats.delivered },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
        </div>

        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="px-6 py-12 text-center text-sm text-rose-600">{error}</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1D9E75]/10 text-[#1D9E75]">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">City</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => {
                  const name = o.shipping_name || o.guest_name || "—";
                  const phone = o.shipping_phone || o.guest_phone || "";
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                        #{o.id.slice(0, 8)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-foreground">{name}</div>
                        {phone && (
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {phone}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {o.shipping_city || "—"}
                      </td>
                      <td className="px-5 py-3 font-semibold text-foreground">
                        {formatBDT(Number(o.total) || 0)}
                      </td>
                      <td className="px-5 py-3 text-xs uppercase tracking-wide text-muted-foreground">
                        {o.payment_method || "—"}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {formatDate(o.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ComingSoonView({ title }: { title: string }) {
  return (
    <div className="space-y-6">
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
  if (active === "orders") return <OrdersView />;
  return <ComingSoonView title={TITLES[active] ?? "Coming soon"} />;
}
