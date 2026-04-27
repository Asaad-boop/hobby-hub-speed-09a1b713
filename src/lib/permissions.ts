import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/lib/admin";

export type PermissionKey =
  | "can_view_orders"
  | "can_manage_products"
  | "can_manage_customers"
  | "can_view_reports";

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  can_view_orders: "Can view orders",
  can_manage_products: "Can manage products",
  can_manage_customers: "Can manage customers",
  can_view_reports: "Can view reports",
};

export const ALL_PERMISSIONS: PermissionKey[] = [
  "can_view_orders",
  "can_manage_products",
  "can_manage_customers",
  "can_view_reports",
];

export type PermissionMap = Partial<Record<PermissionKey, boolean>>;

/** Fetch a single user's permissions row. Admins see anyone; users see own. */
export async function fetchUserPermissions(userId: string): Promise<PermissionMap> {
  const { data, error } = await supabase
    .from("staff_permissions")
    .select("permissions")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return {};
  return ((data?.permissions ?? {}) as PermissionMap) || {};
}

/** Upsert permissions for a staff user. Admin only (enforced by RLS). */
export async function saveUserPermissions(
  userId: string,
  permissions: PermissionMap,
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const updatedBy = sessionData.session?.user?.id ?? null;
  const { error } = await supabase
    .from("staff_permissions")
    .upsert(
      {
        user_id: userId,
        permissions: permissions as Record<string, boolean>,
        updated_by: updatedBy,
      },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(error.message);
}

/** Hook: current user's permissions (admins implicitly have all). */
export function useMyPermissions() {
  const { user, isAdmin } = useAdminAuth();
  const qc = useQueryClient();

  const { data = {}, isLoading } = useQuery({
    queryKey: ["my_permissions", user?.id ?? null],
    queryFn: () => (user ? fetchUserPermissions(user.id) : Promise.resolve({})),
    enabled: !!user,
    staleTime: 60_000,
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      qc.invalidateQueries({ queryKey: ["my_permissions"] });
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const has = (key: PermissionKey): boolean => {
    if (isAdmin) return true;
    return data[key] === true;
  };

  return { permissions: data as PermissionMap, has, isAdmin, loading: isLoading };
}
