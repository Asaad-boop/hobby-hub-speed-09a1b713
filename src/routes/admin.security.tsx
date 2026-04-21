import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { fetchRlsAudit, type TableAudit } from "@/lib/rls-audit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/security")({
  head: () => ({
    meta: [
      { title: "Security Audit — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SecurityAuditPage,
});

const sevColor: Record<TableAudit["severity"], string> = {
  error: "text-destructive",
  warn: "text-amber-500",
  ok: "text-emerald-500",
};

const sevIcon = {
  error: ShieldX,
  warn: ShieldAlert,
  ok: ShieldCheck,
} as const;

function SecurityAuditPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "rls-audit"],
    queryFn: fetchRlsAudit,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const counts = {
    error: data?.filter((d) => d.severity === "error").length ?? 0,
    warn: data?.filter((d) => d.severity === "warn").length ?? 0,
    ok: data?.filter((d) => d.severity === "ok").length ?? 0,
    total: data?.length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">RLS Security Audit</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Per-table row-level security policies in the <code className="text-xs">public</code> schema.
            Tables with disabled RLS, missing CRUD coverage, or fully permissive policies are flagged.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {!isLoading && !isError && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Tables" value={counts.total} tone="neutral" />
          <SummaryCard label="Healthy" value={counts.ok} tone="ok" />
          <SummaryCard label="Warnings" value={counts.warn} tone="warn" />
          <SummaryCard label="Critical" value={counts.error} tone="error" />
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load audit: {(error as Error)?.message}
        </div>
      )}

      {data && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Table</TableHead>
                <TableHead>RLS</TableHead>
                <TableHead>Policies</TableHead>
                <TableHead>Coverage (S / I / U / D)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((t) => {
                const Icon = sevIcon[t.severity];
                const isOpen = expanded[t.table];
                return (
                  <>
                    <TableRow
                      key={t.table}
                      className="cursor-pointer"
                      onClick={() => setExpanded((s) => ({ ...s, [t.table]: !s[t.table] }))}
                    >
                      <TableCell>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{t.table}</TableCell>
                      <TableCell>
                        {t.rlsEnabled ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-600/30">
                            ON
                          </Badge>
                        ) : (
                          <Badge variant="destructive">OFF</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{t.policies.length}</TableCell>
                      <TableCell>
                        <div className="flex gap-1.5 text-[10px] font-mono">
                          <CovDot ok={t.coverage.SELECT} label="S" />
                          <CovDot ok={t.coverage.INSERT} label="I" />
                          <CovDot ok={t.coverage.UPDATE} label="U" />
                          <CovDot ok={t.coverage.DELETE} label="D" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={cn("flex items-center gap-1.5 text-xs font-medium", sevColor[t.severity])}>
                          <Icon className="h-4 w-4" />
                          {t.severity === "ok" ? "OK" : t.severity === "warn" ? "Review" : "Critical"}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow key={t.table + "-d"} className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={6} className="p-4 space-y-3">
                          {t.flags.length > 0 && (
                            <div className="space-y-1">
                              {t.flags.map((f, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "text-xs rounded px-2 py-1.5 border",
                                    t.severity === "error"
                                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                                      : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                                  )}
                                >
                                  ⚠ {f}
                                </div>
                              ))}
                            </div>
                          )}
                          {t.policies.length === 0 ? (
                            <div className="text-xs text-muted-foreground">No policies defined.</div>
                          ) : (
                            <div className="rounded border border-border bg-background overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-muted/50">
                                  <tr>
                                    <th className="text-left p-2 font-medium">Policy</th>
                                    <th className="text-left p-2 font-medium">Cmd</th>
                                    <th className="text-left p-2 font-medium">Roles</th>
                                    <th className="text-left p-2 font-medium">USING</th>
                                    <th className="text-left p-2 font-medium">WITH CHECK</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {t.policies.map((p) => (
                                    <tr key={p.policyname} className="border-t border-border">
                                      <td className="p-2 font-mono">{p.policyname}</td>
                                      <td className="p-2">
                                        <Badge variant="secondary" className="text-[10px]">{p.cmd}</Badge>
                                      </td>
                                      <td className="p-2 font-mono text-[10px]">{p.roles.join(", ") || "—"}</td>
                                      <td className="p-2 font-mono text-[10px] max-w-[280px] truncate" title={p.qual ?? ""}>
                                        {p.qual ?? "—"}
                                      </td>
                                      <td className="p-2 font-mono text-[10px] max-w-[280px] truncate" title={p.with_check ?? ""}>
                                        {p.with_check ?? "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "ok" | "warn" | "error";
}) {
  const toneClass = {
    neutral: "text-foreground",
    ok: "text-emerald-500",
    warn: "text-amber-500",
    error: "text-destructive",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-bold mt-1", toneClass)}>{value}</div>
    </div>
  );
}

function CovDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
        ok ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive",
      )}
      title={ok ? `${label} covered` : `${label} missing`}
    >
      {label}
    </span>
  );
}
