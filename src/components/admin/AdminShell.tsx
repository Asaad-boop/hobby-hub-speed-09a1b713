import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import OrdersPlaceholder from "./OrdersPlaceholder";

export default function AdminShell() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50 font-sans text-foreground">
        <AppSidebar />
        <SidebarInset className="flex flex-col bg-gray-50">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur-md md:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="hidden h-5 w-px bg-gray-200 md:block" />
              <h1 className="text-base font-semibold tracking-tight">HobbyShop OPS</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:block">
                Internal Dashboard
              </span>
              <div className="h-8 w-8 rounded-full bg-[#1D9E75]/10 ring-1 ring-[#1D9E75]/20" />
            </div>
          </header>
          <main className="flex-1 px-4 pb-10 pt-6 md:px-8">
            <OrdersPlaceholder />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
