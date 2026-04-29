import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { TopBar } from "@/components/admin/TopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
});

function AdminLayout() {
  const [email, setEmail] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) {
        setAuthorized(false);
        window.location.href = "/auth";
        return;
      }
      setEmail(session.user.email ?? null);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const roles = (data ?? []).map((r) => r.role as string);
      const ok = roles.includes("admin") || roles.includes("customer_service") || roles.includes("operations");
      setAuthorized(ok);
    })();
    return () => { mounted = false; };
  }, []);

  if (authorized === false) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm max-w-md">
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have permission to access the admin console. Contact an administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  if (authorized === null) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-muted/30">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <TopBar userEmail={email} />
            <main className="flex-1 p-6">
              <div className="mx-auto max-w-[1400px] space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-80" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <TopBar userEmail={email} />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
