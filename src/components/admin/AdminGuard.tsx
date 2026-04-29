import { Navigate, useLocation } from "@tanstack/react-router";
import { useAdminAuth } from "@/lib/admin";
import { Loading } from "./ui";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { loading, user, isAdmin } = useAdminAuth();
  const location = useLocation();
  const redirectTo = location.href?.startsWith("/") ? location.href : "/admin/orders";

  if (loading) {
    return (
      <div className="grid h-screen w-full place-items-center bg-gray-50">
        <Loading label="Checking access…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" search={{ redirect: redirectTo }} replace />;
  if (!isAdmin) {
    return (
      <div className="grid h-screen w-full place-items-center bg-gray-50 px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-semibold text-foreground">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tomar account a admin role nai. Admin role lagbe OMS access korte.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
