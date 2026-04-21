import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Package,
  Tags,
  Settings,
  ShoppingBag,
  LogOut,
  Store,
  Home,
  Users,
  BarChart3,
  Boxes,
  Wallet,
  MessageSquare,
  Tag,
  Receipt,
  TrendingUp,
  ArrowRightLeft,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: "soon";
};

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Catalog",
    items: [
      { title: "Products", url: "/admin/products", icon: Package },
      { title: "Categories", url: "/admin/categories", icon: Tags },
      { title: "Inventory", url: "/admin/inventory", icon: Boxes },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Orders", url: "/admin/orders", icon: ShoppingBag },
      { title: "Customers", url: "/admin/customers", icon: Users },
      { title: "Reviews", url: "/admin/reviews", icon: MessageSquare },
      { title: "Coupons", url: "/admin/coupons", icon: Tag },
      { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Finance Dashboard", url: "/admin/finance", icon: TrendingUp, exact: true },
      { title: "Cash Accounts", url: "/admin/finance/accounts", icon: Wallet },
      { title: "Transactions", url: "/admin/finance/transactions", icon: Receipt },
      { title: "COD Settlements", url: "/admin/finance/settlements", icon: ArrowRightLeft },
      { title: "Orders P&L", url: "/admin/finance/orders-pnl", icon: TrendingUp },
      { title: "Expenses", url: "/admin/expenses", icon: Receipt },
      { title: "Accounting", url: "/admin/accounting", icon: TrendingUp },
    ],
  },
  {
    label: "Storefront",
    items: [
      { title: "Homepage", url: "/admin/homepage", icon: Home },
      { title: "Settings", url: "/admin/settings", icon: Settings },
    ],
  },
];

export default function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: pendingReviews = 0 } = useQuery({
    queryKey: ["admin", "reviews", "pendingCount"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("is_approved", false);
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/admin" className="flex items-center gap-2 px-2 py-1.5">
          <img src={logo} alt="HobbyShop" className="h-8 w-8 shrink-0 object-contain" />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold">HobbyShop</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin ERP</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.url, item.exact);
                  const isSoon = item.badge === "soon";
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild={!isSoon}
                        isActive={active}
                        disabled={isSoon}
                        tooltip={collapsed ? item.title : undefined}
                        className={isSoon ? "cursor-not-allowed opacity-60" : ""}
                      >
                        {isSoon ? (
                          <div className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            {!collapsed && (
                              <>
                                <span>{item.title}</span>
                                <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Soon
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <Link to={item.url} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                            {!collapsed && item.url === "/admin/reviews" && pendingReviews > 0 && (
                              <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-extrabold text-primary-foreground">
                                {pendingReviews}
                              </span>
                            )}
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={collapsed ? "View storefront" : undefined}>
              <Link to="/" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                {!collapsed && <span>View storefront</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={collapsed ? "Sign out" : undefined}
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
