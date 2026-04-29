import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Users,
  BarChart3,
  TrendingUp,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/admin/dashboard", title: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/orders", title: "Orders", icon: ShoppingCart },
  { to: "/admin/inventory", title: "Inventory", icon: Boxes },
  { to: "/admin/customers", title: "Customers", icon: Users },
  { to: "/admin/reports", title: "Reports", icon: BarChart3 },
  { to: "/admin/analytics", title: "Analytics", icon: TrendingUp },
  { to: "/admin/settings", title: "Settings", icon: SettingsIcon },
] as const;

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  const isActive = (to: string) => path === to || path.startsWith(to + "/");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-white">
      <SidebarHeader className="border-b border-border bg-white">
        <div className="flex items-center gap-2.5 px-2 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#1D9E75] text-sm font-bold text-white">
            B
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">BrandOMS</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#1D9E75]">
                Order Manager
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active = isActive(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="transition-colors hover:bg-[#1D9E75]/10 data-[active=true]:bg-[#1D9E75]/10 data-[active=true]:font-medium data-[active=true]:text-[#1D9E75]"
                    >
                      <Link to={item.to} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              onClick={handleLogout}
              className="text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
