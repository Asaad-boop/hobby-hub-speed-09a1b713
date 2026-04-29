// Shared admin UI primitives.
import * as React from "react";
import { STAGE_COLOR, STAGE_LABEL, type WorkflowStage } from "@/lib/oms";

export const BRAND = "#1D9E75";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white/95 px-6 py-4 backdrop-blur print:hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className = "", ...props }: DivProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-white shadow-sm ${className}`}
      {...props}
    />
  );
}

export function MetricCard({
  label,
  value,
  hint,
  accent = false,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
        accent ? "border-[#1D9E75]/30 ring-1 ring-[#1D9E75]/10" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div
            className={`mt-1 text-2xl font-semibold tracking-tight ${
              accent ? "text-[#1D9E75]" : "text-foreground"
            }`}
          >
            {value}
          </div>
          {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {icon && (
          <div className={`shrink-0 rounded-lg p-2 ${accent ? "bg-[#1D9E75]/10 text-[#1D9E75]" : "bg-muted text-muted-foreground"}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function StageBadge({ stage }: { stage: WorkflowStage }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STAGE_COLOR[stage]}`}
    >
      {STAGE_LABEL[stage]}
    </span>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
};
export function Btn({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: BtnProps) {
  const sz = size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-[#1D9E75] text-white hover:bg-[#178A65] disabled:bg-[#1D9E75]/50",
    secondary: "border border-border bg-white text-foreground hover:bg-muted",
    outline: "border border-border bg-white text-foreground hover:bg-muted",
    ghost: "text-foreground hover:bg-muted",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${sz} ${variants[variant]} ${className}`}
    />
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
      <span className="ml-2">{label}</span>
    </div>
  );
}

export function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
