import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Admin-only diagnostics. Reports which server env vars are present (boolean only,
 * never their values) so admins can confirm Vercel/Cloud configuration without
 * leaking secrets. Requires admin role.
 */
export const getAdminEnvDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Verify admin role
    const { data: rolesRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin");
    if (!rolesRow || rolesRow.length === 0) {
      return { ok: false as const, error: "Forbidden" };
    }

    const has = (k: string) => Boolean(process.env[k] && process.env[k]!.length > 0);

    return {
      ok: true as const,
      checkedAt: new Date().toISOString(),
      runtime: {
        node: typeof process !== "undefined" ? process.version : "unknown",
        platform: typeof process !== "undefined" ? process.platform : "unknown",
      },
      env: {
        SUPABASE_URL: has("SUPABASE_URL"),
        SUPABASE_PUBLISHABLE_KEY: has("SUPABASE_PUBLISHABLE_KEY"),
        SUPABASE_SERVICE_ROLE_KEY:
          has("SUPABASE_SERVICE_ROLE_KEY") || has("ADMIN_SERVICE_ROLE_KEY"),
        VITE_SUPABASE_URL: has("VITE_SUPABASE_URL"),
        VITE_SUPABASE_PUBLISHABLE_KEY: has("VITE_SUPABASE_PUBLISHABLE_KEY"),
        VITE_SUPABASE_PROJECT_ID: has("VITE_SUPABASE_PROJECT_ID"),
        GITHUB_TOKEN: has("GITHUB_TOKEN"),
        GITHUB_REPO: has("GITHUB_REPO"),
      },
    };
  });
