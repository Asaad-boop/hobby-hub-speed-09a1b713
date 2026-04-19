import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AdminAuthState = {
  loading: boolean;
  user: User | null;
  isAdmin: boolean;
};

type AuthData = { user: User | null; isAdmin: boolean };

async function fetchAuthData(): Promise<AuthData> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user ?? null;
  if (!user) return { user: null, isAdmin: false };
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  return { user, isAdmin: !error && !!data };
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

  return {
    loading: isLoading,
    user: data?.user ?? null,
    isAdmin: data?.isAdmin ?? false,
  };
}
