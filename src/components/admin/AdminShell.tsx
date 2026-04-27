import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  LayoutDashboard,
  PhoneCall,
  PackageCheck,
  Package,
  Tags,
  UserCircle,
  Boxes,
  BarChart3,
  Settings,
  Star,
  LogOut,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/lib/admin";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; exact?: boolean };

const NAV: NavItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Web Orders", url: "/admin/web-orders", icon: PhoneCall },
  { title: "Orders Pipeline", url: "/admin/orders-pipeline", icon: PackageCheck },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Categories", url: "/admin/categories", icon: Tags },
  { title: "Customers", url: "/admin/customers", icon: UserCircle },
  { title: "Inventory", url: "/admin/inventory", icon: Boxes },
  { title: "Reports", url: "/admin/reports", icon: BarChart3 },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export default function AdminShell() {
  const { loading, user } = useAdminAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const currentTitle = NAV.find((n) => isActive(n.url, n.exact))?.title ?? "Admin";

  return (
    <div
      className="min-h-screen w-full bg-[#f9fafb] font-sans text-gray-900"
      style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
    >
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-[#111827] text-white md:flex">
        <div className="flex h-14 items-center border-b border-white/10 px-5 text-sm font-bold tracking-tight">
          HobbyShop Admin
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {NAV.map((item) => {
            const active = isActive(item.url, item.exact);
            return (
              <Link
                key={item.url}
                to={item.url}
                className={[
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                {active && (
                  <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-white" />
                )}
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
          className="m-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>

      {/* Main column */}
      <div className="md:pl-60">
        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex h-14 items-center justify-between bg-white px-4 md:px-6"
          style={{ borderBottom: "0.5px solid #e5e7eb" }}
        >
          <h1 className="text-base font-semibold text-gray-900">{currentTitle}</h1>
          <div className="hidden text-xs text-gray-500 sm:block">{user.email}</div>
        </header>

        {/* Content */}
        <main className="px-4 pb-24 pt-6 md:px-8 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto bg-[#111827] text-white md:hidden">
        {NAV.map((item) => {
          const active = isActive(item.url, item.exact);
          return (
            <Link
              key={item.url}
              to={item.url}
              className={[
                "flex min-w-[64px] flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[10px]",
                active ? "text-white" : "text-white/60",
              ].join(" ")}
            >
              <item.icon className="h-4 w-4" />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
