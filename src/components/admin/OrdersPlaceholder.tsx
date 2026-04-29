import { ShoppingCart } from "lucide-react";
import { useOpsStore } from "@/lib/ops-store";

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  inventory: "Inventory",
  courier: "Courier & Fraud",
  reports: "Reports",
};

export default function OrdersPlaceholder() {
  const active = useOpsStore((s) => s.active);
  const title = TITLES[active] ?? "Orders";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {active === "orders"
              ? "Manage and track all customer orders."
              : "This section is coming soon."}
          </p>
        </div>
        {active === "orders" && (
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#1D9E75] px-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#178A65]">
            <ShoppingCart className="h-4 w-4" />
            New Order
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Orders", value: "—" },
          { label: "Pending", value: "—" },
          { label: "Shipped", value: "—" },
          { label: "Delivered", value: "—" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1D9E75]/10 text-[#1D9E75]">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">No data yet</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Order data will appear here once business logic is wired up.
          </p>
        </div>
      </div>
    </div>
  );
}
