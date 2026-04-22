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
  PhoneCall,
  XOctagon,
  UserCog,
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
import { useAdminAuth, type AppRole } from "@/lib/admin";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  /** Roles that can see this item. Admin always sees everything. */
  roles?: AppRole[];
};

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true, roles: ["admin"] }],
  },
  {
    label: "Catalog",
    items: [
      { title: "Products", url: "/admin/products", icon: Package, roles: ["admin"] },
      { title: "Categories", url: "/admin/categories", icon: Tags, roles: ["admin"] },
      { title: "Inventory", url: "/admin/inventory", icon: Boxes, roles: ["admin", "operations"] },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Web Orders", url: "/admin/web-orders", icon: PhoneCall, roles: ["admin", "customer_service"] },
      { title: "Order List", url: "/admin/orders", icon: ShoppingBag, roles: ["admin", "operations"] },
      { title: "Cancelled Orders", url: "/admin/cancelled-orders", icon: XOctagon, roles: ["admin"] },
      { title: "Customers", url: "/admin/customers", icon: Users, roles: ["admin", "customer_service", "operations"] },
      { title: "Reviews", url: "/admin/reviews", icon: MessageSquare, roles: ["admin"] },
      { title: "Coupons", url: "/admin/coupons", icon: Tag, roles: ["admin"] },
      { title: "Analytics", url: "/admin/analytics", icon: BarChart3, roles: ["admin"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Finance Dashboard", url: "/admin/finance", icon: TrendingUp, exact: true, roles: ["admin"] },
      { title: "Cash Accounts", url: "/admin/finance/accounts", icon: Wallet, roles: ["admin"] },
      { title: "Transactions", url: "/admin/finance/transactions", icon: Receipt, roles: ["admin"] },
      { title: "COD Settlements", url: "/admin/finance/settlements", icon: ArrowRightLeft, roles: ["admin"] },
      { title: "Orders P&L", url: "/admin/finance/orders-pnl", icon: TrendingUp, roles: ["admin"] },
      { title: "Expenses", url: "/admin/expenses", icon: Receipt, roles: ["admin"] },
      { title: "Accounting", url: "/admin/accounting", icon: TrendingUp, roles: ["admin"] },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Staff Management", url: "/admin/staff", icon: UserCog, roles: ["admin"] },
      { title: "Homepage", url: "/admin/homepage", icon: Home, roles: ["admin"] },
      { title: "Site Settings", url: "/admin/settings", icon: Settings, exact: true, roles: ["admin"] },
      { title: "Integrations", url: "/admin/settings/integrations", icon: Activity, roles: ["admin"] },
      { title: "Security Audit", url: "/admin/security", icon: ShieldCheck, roles: ["admin"] },
    ],
  },
];

export default function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { hasRole } = useAdminAuth();

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

  const { data: pendingWebOrders = 0 } = useQuery({
    queryKey: ["admin", "web-orders", "pendingCount"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "new")
        .eq("confirmation_status", "pending");
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 30_000,
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
        {groups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.roles || hasRole(item.roles));
          if (visibleItems.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const active = isActive(item.url, item.exact);
                    const badgeCount =
                      item.url === "/admin/reviews"
                        ? pendingReviews
                        : item.url === "/admin/web-orders"
                          ? pendingWebOrders
                          : 0;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={collapsed ? item.title : undefined}
                        >
                          <Link to={item.url} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                            {!collapsed && badgeCount > 0 && (
                              <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-extrabold text-destructive-foreground">
                                {badgeCount}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
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
