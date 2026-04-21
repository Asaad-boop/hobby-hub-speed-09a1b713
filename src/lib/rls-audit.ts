import { supabase } from "@/integrations/supabase/client";

export type PolicyRow = {
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

type RawRow = {
  tablename: string;
  rowsecurity: boolean;
  policyname: string | null;
  cmd: string | null;
  permissive: string | null;
  roles: string[] | null;
  qual: string | null;
  with_check: string | null;
};

export async function fetchRlsAudit(): Promise<TableAudit[]> {
  const { data, error } = await supabase.rpc("admin_rls_audit" as never);
  if (error) throw error;
  const rows = (data as unknown as RawRow[]) ?? [];

  const byTable = new Map<string, { rls: boolean; policies: PolicyRow[] }>();
  for (const r of rows) {
    if (!byTable.has(r.tablename)) {
      byTable.set(r.tablename, { rls: r.rowsecurity, policies: [] });
    }
    if (r.policyname && r.cmd) {
      byTable.get(r.tablename)!.policies.push({
        policyname: r.policyname,
        cmd: r.cmd,
        permissive: r.permissive ?? "PERMISSIVE",
        roles: r.roles ?? [],
        qual: r.qual,
        with_check: r.with_check,
      });
    }
  }

  const result: TableAudit[] = [];
  for (const [table, info] of byTable) {
    const commands = { SELECT: 0, INSERT: 0, UPDATE: 0, DELETE: 0, ALL: 0 };
    for (const p of info.policies) {
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

    if (!info.rls) {
      flags.push("RLS DISABLED — table is fully open via PostgREST");
      severity = "error";
    }
    if (info.policies.length === 0 && info.rls) {
      flags.push("RLS enabled but ZERO policies — table is locked (no access)");
      if (severity === "ok") severity = "warn";
    }
    if (info.rls && info.policies.length > 0) {
      const missing = (Object.keys(coverage) as (keyof typeof coverage)[]).filter((k) => !coverage[k]);
      if (missing.length > 0) {
        flags.push(`No policy for: ${missing.join(", ")}`);
        if (severity === "ok") severity = "warn";
      }
    }
    for (const p of info.policies) {
      const expr = `${p.qual ?? ""} ${p.with_check ?? ""}`.trim();
      if (expr === "true") {
        flags.push(`Policy "${p.policyname}" is fully permissive (USING true)`);
        severity = "error";
      }
    }

    result.push({
      table,
      rlsEnabled: info.rls,
      policies: info.policies,
      commands,
      coverage,
      flags,
      severity,
    });
  }

  return result.sort((a, b) => {
    const order = { error: 0, warn: 1, ok: 2 } as const;
    if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
    return a.table.localeCompare(b.table);
  });
}
