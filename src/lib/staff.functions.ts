import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const STAFF_ROLES: AppRole[] = [
  "admin",
  "moderator",
  "customer_service",
  "operations",
  "packer",
  "accountant",
];

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (!data || data.length === 0) throw new Error("Forbidden: admin only");
}

/** List all staff (users with any non-customer role) with email + name + roles. */
export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { data: roleRows, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, role, created_at")
      .in("role", STAFF_ROLES)
      .order("created_at", { ascending: false });
    if (rolesErr) throw new Error(rolesErr.message);

    const userIds = [...new Set((roleRows ?? []).map((r) => r.user_id))];

    // Fetch profiles
    const profileMap = new Map<string, string | null>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      for (const p of profiles ?? []) profileMap.set(p.id, p.display_name);
    }

    // Fetch auth emails
    const emailMap = new Map<string, string | null>();
    for (const uid of userIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      if (u?.user) emailMap.set(uid, u.user.email ?? null);
    }

    // Group by user
    const byUser = new Map<
      string,
      {
        user_id: string;
        email: string | null;
        display_name: string | null;
        roles: { id: string; role: AppRole; created_at: string }[];
      }
    >();
    for (const r of roleRows ?? []) {
      const entry =
        byUser.get(r.user_id) ?? {
          user_id: r.user_id,
          email: emailMap.get(r.user_id) ?? null,
          display_name: profileMap.get(r.user_id) ?? null,
          roles: [],
        };
      entry.roles.push({ id: r.id, role: r.role as AppRole, created_at: r.created_at });
      byUser.set(r.user_id, entry);
    }

    return { staff: Array.from(byUser.values()) };
  });

/** Find user by email (case-insensitive). */
export const findUserByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("Valid email required");
    return { email };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    // Paginate through users (admin API)
    let page = 1;
    const perPage = 200;
    while (page <= 20) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) throw new Error(error.message);
      const found = list.users.find(
        (u) => (u.email ?? "").toLowerCase() === data.email,
      );
      if (found) return { found: true as const, user_id: found.id, email: found.email };
      if (list.users.length < perPage) break;
      page += 1;
    }
    return { found: false as const };
  });

/** Create a new user (with email + password) and assign a role. */
export const createStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { email: string; password: string; display_name?: string; role: AppRole }) => {
      const email = String(input?.email ?? "").trim().toLowerCase();
      const password = String(input?.password ?? "");
      const display_name = input?.display_name?.trim() || null;
      const role = input?.role;
      if (!email || !email.includes("@")) throw new Error("Valid email required");
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
      if (!STAFF_ROLES.includes(role)) throw new Error("Invalid role");
      return { email, password, display_name, role };
    },
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: data.display_name ? { display_name: data.display_name } : {},
      });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Failed to create user");
    }

    // Profile is auto-created via trigger; ensure display_name is set.
    if (data.display_name) {
      await supabaseAdmin
        .from("profiles")
        .update({ display_name: data.display_name })
        .eq("id", created.user.id);
    }

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.role });
    if (roleErr) throw new Error(roleErr.message);

    return { success: true as const, user_id: created.user.id };
  });

/** Assign a role to an existing user (by email). */
export const assignRoleByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; role: AppRole }) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    const role = input?.role;
    if (!email || !email.includes("@")) throw new Error("Valid email required");
    if (!STAFF_ROLES.includes(role)) throw new Error("Invalid role");
    return { email, role };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    // Find user
    let userId: string | null = null;
    let page = 1;
    const perPage = 200;
    while (page <= 20) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) throw new Error(error.message);
      const found = list.users.find(
        (u) => (u.email ?? "").toLowerCase() === data.email,
      );
      if (found) {
        userId = found.id;
        break;
      }
      if (list.users.length < perPage) break;
      page += 1;
    }
    if (!userId) throw new Error("No user found with that email. Create one first.");

    // Check if already has this role
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", data.role)
      .maybeSingle();
    if (existing) throw new Error("User already has this role");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (error) throw new Error(error.message);

    return { success: true as const, user_id: userId };
  });

/** Remove a role assignment by its row id. */
export const removeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { role_id: string }) => {
    const role_id = String(input?.role_id ?? "");
    if (!role_id) throw new Error("role_id required");
    return { role_id };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("id", data.role_id);
    if (error) throw new Error(error.message);
    return { success: true as const };
  });

/** Reset a staff user's password. */
export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; password: string }) => {
    const user_id = String(input?.user_id ?? "");
    const password = String(input?.password ?? "");
    if (!user_id) throw new Error("user_id required");
    if (password.length < 8) throw new Error("Password must be at least 8 characters");
    return { user_id, password };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { success: true as const };
  });
