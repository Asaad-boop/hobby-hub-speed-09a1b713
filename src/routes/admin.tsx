import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/lib/admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — HobbyShop" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { loading, user, isAdmin, hasRole } = useAdminAuth();
  const navigate = useNavigate();
  // Customer service and operations can also access the admin shell, but with
  // a restricted sidebar.
  const allowedAccess =
    isAdmin ||
    hasRole(["customer_service", "operations", "moderator", "packer", "accountant"]);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!allowedAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tomar account e admin/staff permission nei. Admin ke bolun role assign korte.
          </p>
          <p className="mt-3 text-xs text-muted-foreground break-all">
            Logged in as: <span className="font-mono">{user.email}</span>
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/">Go home</Link>
            </Button>
            <Button asChild>
              <Link to="/account">My account</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <span className="text-sm font-semibold">Admin Panel</span>
            <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">
              {user.email}
            </span>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
