import { useOpsStore } from "@/lib/ops-store";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/OrdersPage";
import InventoryPage from "./pages/InventoryPage";
import CourierFraudPage from "./pages/CourierFraudPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";

export default function OrdersPlaceholder() {
  const active = useOpsStore((s) => s.active);
  if (active === "dashboard") return <DashboardPage />;
  if (active === "orders") return <OrdersPage />;
  if (active === "inventory") return <InventoryPage />;
  if (active === "courier") return <CourierFraudPage />;
  if (active === "reports") return <ReportsPage />;
  if (active === "settings") return <SettingsPage />;
  return <DashboardPage />;
}
