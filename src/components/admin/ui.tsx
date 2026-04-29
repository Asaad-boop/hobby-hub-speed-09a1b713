// Shared admin UI primitives.
// Includes both BrandOMS helpers (StatusBadge, FraudBadge, MetricCard) and
// legacy storefront-admin primitives (Card, Btn, Input, Modal, Loading, Empty, Badge, Select, Textarea, fmtBDT, fmtDate).

import * as React from "react";
import { fraudBadgeClasses, fraudLabel, statusBadgeClasses, type OrderStatus } from "@/lib/mock-data";

export const BRAND_GREEN = "#1D9E75";

// ---------------- BrandOMS helpers ----------------
export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${statusBadgeClasses(status)}`}>
      {status}
    </span>
  );
}

export function FraudBadge({ score, blacklisted = false }: { score: number; blacklisted?: boolean }) {
  const label = fraudLabel(score, blacklisted);
  const short = label === "SAFE" ? "Low" : label === "MODERATE RISK" ? "Medium" : label === "HIGH RISK" ? "High" : "Blacklisted";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${fraudBadgeClasses(score, blacklisted)}`}>
      <span className="font-semibold">{short}</span>
      <span className="opacity-70">· {score}</span>
    </span>
  );
}

export function MetricCard({
  label, value, hint, accent = false,
}: { label: string; value: string | number; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${accent ? "border-[#1D9E75]/30 ring-1 ring-[#1D9E75]/10" : "border-gray-200"}`}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight ${accent ? "text-[#1D9E75]" : "text-foreground"}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

// ---------------- Shared primitives ----------------
type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function PageHeader({
  title, subtitle, description, actions,
}: { title: string; subtitle?: string; description?: string; actions?: React.ReactNode }) {
  const sub = subtitle ?? description;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-4 print:hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className = "", ...props }: DivProps) {
  return <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`} {...props} />;
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
};
export function Btn({ variant = "secondary", size = "md", className = "", ...props }: BtnProps) {
  const sz = size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-[#1D9E75] text-white hover:bg-[#178A65]",
    secondary: "border border-gray-200 bg-white text-foreground hover:bg-gray-50",
    ghost: "text-foreground hover:bg-gray-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    outline: "border border-gray-200 bg-white text-foreground hover:bg-gray-50",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${sz} ${variants[variant]} ${className}`}
    />
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15 ${className}`}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`min-h-[80px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15 ${className}`}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => (
    <select
      ref={ref}
      className={`h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15 ${className}`}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Badge({
  children, tone = "gray", className = "",
}: { children: React.ReactNode; tone?: "gray" | "green" | "amber" | "red" | "blue" | "teal"; className?: string }) {
  const tones: Record<string, string> = {
    gray: "bg-gray-100 text-gray-700 ring-gray-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    teal: "bg-teal-50 text-teal-700 ring-teal-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground">
      <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400" />
      {label}
    </div>
  );
}

export function Empty({
  title = "Nothing here yet", description, action,
}: { title?: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Modal({
  open, onClose, title, children, footer, size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      <div className={`relative z-10 w-full ${widths[size]} max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col`}>
        {title && (
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-gray-100 hover:text-foreground">×</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-gray-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function fmtBDT(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? Number(n) : n ?? 0;
  return "৳" + new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(Math.round(v || 0));
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
