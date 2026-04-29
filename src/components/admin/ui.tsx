// Small shared bits used across BrandOMS pages.
import { fraudBadgeClasses, fraudLabel, statusBadgeClasses, type OrderStatus } from "@/lib/mock-data";

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

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-4 print:hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
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

export const BRAND_GREEN = "#1D9E75";
