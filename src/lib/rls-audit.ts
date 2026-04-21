import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PolicyRow = {
  table: string;
  policyname: string;
  cmd: string;
  permissive: string;
  roles: string[];
  qual: string | null;
  with_check: string | null;
};

export type TableAudit = {
  table: string;
  rlsEnabled: boolean;
  policies: PolicyRow[];
  commands: { SELECT: number; INSERT: number; UPDATE: number; DELETE: number; ALL: number };
  coverage: { SELECT: boolean; INSERT: boolean; UPDATE: boolean; DELETE: boolean };
  flags: string[];
  severity: "ok" | "warn" | "error";
};

export const fetchRlsAudit = createServerFn({ method: "GET" }).handler(async () => {
  // Tables in public schema with RLS status
  const { data: tablesData, error: tablesErr } = await supabaseAdmin.rpc("exec_sql_audit" as never, {} as never).then(
    () => ({ data: null, error: { message: "rpc-missing" } as { message: string } }),
    () => ({ data: null, error: { message: "rpc-missing" } as { message: string } }),
  );
  // Fallback: query via from() on a custom view we create — but simpler: use raw SQL via PostgREST is not possible.
  // We'll query pg_catalog using the service role through the SQL HTTP endpoint.
  void tablesData;
  void tablesErr;

  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  async function runSql<T = unknown>(sql: string): Promise<T[]> {
    // Use Supabase's Postgres meta endpoint via PostgREST — not available by default.
    // Instead use the SQL via the supabase-js .rpc to a helper function we'll create.
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/run_audit_sql`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });
    if (!res.ok) throw new Error(`SQL failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as T[];
  }

  const tables = await runSql<{ tablename: string; rowsecurity: boolean }>(
    `select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename`,
  );
  const policies = await runSql<{
    tablename: string;
    policyname: string;
    cmd: string;
    permissive: string;
    roles: string[];
    qual: string | null;
    with_check: string | null;
  }>(
    `select tablename, policyname, cmd, permissive, roles, qual, with_check from pg_policies where schemaname = 'public'`,
  );

  const result: TableAudit[] = tables.map((t) => {
    const tablePolicies = policies
      .filter((p) => p.tablename === t.tablename)
      .map<PolicyRow>((p) => ({
        table: p.tablename,
        policyname: p.policyname,
        cmd: p.cmd,
        permissive: p.permissive,
        roles: p.roles,
        qual: p.qual,
        with_check: p.with_check,
      }));

    const commands = { SELECT: 0, INSERT: 0, UPDATE: 0, DELETE: 0, ALL: 0 };
    for (const p of tablePolicies) {
      const k = p.cmd.toUpperCase() as keyof typeof commands;
      if (k in commands) commands[k]++;
    }
    const coverage = {
      SELECT: commands.SELECT > 0 || commands.ALL > 0,
      INSERT: commands.INSERT > 0 || commands.ALL > 0,
      UPDATE: commands.UPDATE > 0 || commands.ALL > 0,
      DELETE: commands.DELETE > 0 || commands.ALL > 0,
    };

    const flags: string[] = [];
    let severity: TableAudit["severity"] = "ok";

    if (!t.rowsecurity) {
      flags.push("RLS DISABLED — table is fully open via PostgREST");
      severity = "error";
    }
    if (tablePolicies.length === 0 && t.rowsecurity) {
      flags.push("RLS enabled but ZERO policies — table is locked (no access)");
      severity = "warn";
    }
    if (t.rowsecurity && tablePolicies.length > 0) {
      const missing = (Object.keys(coverage) as (keyof typeof coverage)[]).filter((k) => !coverage[k]);
      if (missing.length > 0) {
        flags.push(`Missing policy for: ${missing.join(", ")}`);
        if (severity === "ok") severity = "warn";
      }
    }
    for (const p of tablePolicies) {
      const expr = `${p.qual ?? ""} ${p.with_check ?? ""}`.trim();
      if (expr === "true" || expr === "true true") {
        flags.push(`Policy "${p.policyname}" uses USING (true) — fully permissive`);
        severity = "error";
      }
    }

    return {
      table: t.tablename,
      rlsEnabled: t.rowsecurity,
      policies: tablePolicies,
      commands,
      coverage,
      flags,
      severity,
    };
  });

  return result;
});
