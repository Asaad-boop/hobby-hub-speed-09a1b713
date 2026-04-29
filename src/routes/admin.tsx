import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminGuard } from "@/components/admin/AdminGuard";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — BrandOMS" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminGuard>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-gray-50 font-sans text-foreground">
          <AdminSidebar />
          <SidebarInset className="flex h-screen flex-col bg-gray-50 print:h-auto">
            <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-white/90 px-4 backdrop-blur md:px-6 print:hidden">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                <div className="hidden h-5 w-px bg-border md:block" />
                <h1 className="text-base font-semibold tracking-tight">BrandOMS</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-muted-foreground sm:block">
                  Internal Dashboard
                </span>
                <div className="h-8 w-8 rounded-full bg-[#1D9E75]/10 ring-1 ring-[#1D9E75]/20" />
              </div>
            </header>
            <main className="flex-1 overflow-hidden">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
        <Toaster position="bottom-right" richColors closeButton />
      </SidebarProvider>
    </AdminGuard>
  );
}
