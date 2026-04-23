import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  BookOpen,
  Receipt,
  Ship,
  Warehouse,
  BarChart3,
  Users,
  ShieldCheck,
  Plug,
  FileBarChart,
  LogOut,
  Store,
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
};

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ title: "ERP Home", url: "/erp", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Finance",
    items: [
      { title: "Finance", url: "/admin/finance", icon: Wallet },
      { title: "Accounting", url: "/admin/accounting", icon: BookOpen },
      { title: "Expenses", url: "/admin/expenses", icon: Receipt },
      { title: "Profit & Loss", url: "/admin/reports/profit-loss", icon: FileBarChart },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "China Sourcing", url: "/admin/china-sourcing", icon: Ship },
      { title: "Inventory", url: "/admin/inventory", icon: Warehouse },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
      { title: "Customers", url: "/admin/customers", icon: Users },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Staff", url: "/admin/staff", icon: Users },
      { title: "Security", url: "/admin/security", icon: ShieldCheck },
      { title: "Integrations", url: "/admin/settings/integrations", icon: Plug },
    ],
  },
];

export default function ErpSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/erp" className="flex items-center gap-2 px-2 py-1.5">
          <img src={logo} alt="HobbyShop ERP" className="h-8 w-8 shrink-0 object-contain" />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold">HobbyShop</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Enterprise ERP
              </span>
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
                        </Link>
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
            <SidebarMenuButton asChild tooltip={collapsed ? "Storefront admin" : undefined}>
              <Link to="/admin" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                {!collapsed && <span>Storefront admin</span>}
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
