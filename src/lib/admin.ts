import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AdminAuthState = {
  loading: boolean;
  user: User | null;
  isAdmin: boolean;
};

export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({
    loading: true,
    user: null,
    isAdmin: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function check(user: User | null) {
      if (!user) {
        if (!cancelled) setState({ loading: false, user: null, isAdmin: false });
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      setState({ loading: false, user, isAdmin: !error && !!data });
    }

    // Listener first, then getSession (per Supabase auth pattern)
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      check(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => check(data.session?.user ?? null));

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
