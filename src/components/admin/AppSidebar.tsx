import { LayoutDashboard, ShoppingCart, Boxes, ShieldAlert, BarChart3, Settings as SettingsIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import logo from "@/assets/logo.webp";
import { useOpsStore, type OpsNavKey } from "@/lib/ops-store";

type NavItem = { key: OpsNavKey; title: string; icon: typeof LayoutDashboard };

const ITEMS: NavItem[] = [
  { key: "dashboard", title: "Dashboard", icon: LayoutDashboard },
  { key: "orders", title: "Orders", icon: ShoppingCart },
  { key: "inventory", title: "Inventory", icon: Boxes },
  { key: "courier", title: "Courier & Fraud", icon: ShieldAlert },
  { key: "reports", title: "Reports", icon: BarChart3 },
  { key: "settings", title: "Settings", icon: SettingsIcon },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const active = useOpsStore((s) => s.active);
  const setActive = useOpsStore((s) => s.setActive);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-white">
      <SidebarHeader className="border-b border-sidebar-border bg-white">
        <div className="flex items-center gap-2.5 px-2 py-2.5">
          <img
            src={logo}
            alt="HobbyShop"
            className="h-8 w-8 shrink-0 rounded-md object-contain"
          />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">BrandOMS</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1D9E75]">
                Florencia
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map((item) => {
                const isActive = active === item.key;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      onClick={() => setActive(item.key)}
                      className={
                        "transition-colors hover:bg-[#1D9E75]/8 " +
                        "data-[active=true]:bg-[#1D9E75]/10 data-[active=true]:text-[#1D9E75] data-[active=true]:font-medium"
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function getCurrentTitle(_pathname: string): string {
  return "HobbyShop OPS";
}
