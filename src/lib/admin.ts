import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type AdminAuthState = {
  loading: boolean;
  user: User | null;
  isAdmin: boolean;
  roles: AppRole[];
  hasRole: (role: AppRole | AppRole[]) => boolean;
};

type AuthData = { user: User | null; roles: AppRole[] };

async function fetchAuthData(): Promise<AuthData> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user ?? null;
  if (!user) return { user: null, roles: [] };
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (error) return { user, roles: [] };
  return { user, roles: (data ?? []).map((r) => r.role as AppRole) };
}

export function useAdminAuth(): AdminAuthState {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin_auth"],
    queryFn: fetchAuthData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      qc.invalidateQueries({ queryKey: ["admin_auth"] });
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  const roles = data?.roles ?? [];
  const isAdmin = roles.includes("admin");

  const hasRole = (role: AppRole | AppRole[]) => {
    const want = Array.isArray(role) ? role : [role];
    if (isAdmin) return true; // admin implies all
    return want.some((r) => roles.includes(r));
  };

  return {
    loading: isLoading,
    user: data?.user ?? null,
    isAdmin,
    roles,
    hasRole,
  };
}

export function useHasRole(role: AppRole | AppRole[]): boolean {
  const { hasRole } = useAdminAuth();
  return hasRole(role);
}
