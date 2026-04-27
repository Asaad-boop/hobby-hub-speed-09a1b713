import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, Copy, Check, Mail } from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminAuth, type AppRole } from "@/lib/admin";

const STAFF_ROLES: AppRole[] = [
  "admin",
  "moderator",
  "customer_service",
  "operations",
  "packer",
  "accountant",
];

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
  const { loading, user, isAdmin, hasRole, roles } = useAdminAuth();
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
    return <AccessDeniedScreen email={user.email ?? ""} roles={roles} />;
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

function AccessDeniedScreen({ email, roles }: { email: string; roles: AppRole[] }) {
  const [copied, setCopied] = useState(false);
  const hasAnyStaffRole = roles.some((r) => STAFF_ROLES.includes(r));
  const hasOnlyCustomer = roles.length > 0 && roles.every((r) => r === "customer");
  const hasNoRoles = roles.length === 0;

  const reason = hasNoRoles
    ? "No roles assigned to this account yet."
    : hasOnlyCustomer
      ? "This account only has the 'customer' role. Staff roles are required to enter the admin panel."
      : hasAnyStaffRole
        ? "Your role doesn't grant admin shell access."
        : "Your roles don't match any admin/staff role.";

  const requiredRoles: AppRole[] = [
    "admin",
    "customer_service",
    "operations",
    "moderator",
    "packer",
    "accountant",
  ];

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast.success("Email copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy email");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">Access denied</h1>
            <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4 rounded-xl bg-muted/50 p-4 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Logged in as
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="break-all font-mono text-sm">{email || "(no email)"}</span>
              {email && (
                <button
                  type="button"
                  onClick={copyEmail}
                  className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-background"
                  aria-label="Copy email"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your current roles
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {roles.length === 0 ? (
                <Badge variant="outline" className="text-muted-foreground">
                  none
                </Badge>
              ) : (
                roles.map((r) => (
                  <Badge key={r} variant="secondary" className="font-mono text-xs">
                    {r}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Required (any one of)
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {requiredRoles.map((r) => (
                <Badge key={r} variant="outline" className="font-mono text-xs">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-background p-4 text-sm">
          <div className="font-semibold">How to fix</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Ask an existing admin to open <span className="font-mono text-foreground">/admin/staff</span>.</li>
            <li>Click <span className="font-medium text-foreground">"Assign existing"</span> and paste your email above.</li>
            <li>Pick a staff role (e.g. <span className="font-mono">customer_service</span>) and save.</li>
            <li>Sign out and sign back in here to refresh your permissions.</li>
          </ol>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to="/">Go home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/account">My account</Link>
          </Button>
          <Button asChild>
            <a href={`mailto:?subject=${encodeURIComponent("Admin access request")}&body=${encodeURIComponent(`Please grant me admin/staff access.\n\nEmail: ${email}\nCurrent roles: ${roles.join(", ") || "none"}`)}`}>
              <Mail className="mr-2 h-4 w-4" />
              Email admin
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
