// OMS shared types & helpers (status mapping, formatting).
// Frontend-only. No DB calls here.

import type { Database } from "@/integrations/supabase/types";

export type DBOrderStatus = Database["public"]["Enums"]["order_status"];
export type DBConfirmationStatus = Database["public"]["Enums"]["confirmation_status"];
export type DBCallStatus = Database["public"]["Enums"]["call_status"];

// Workflow stages tomar darkar
export type WorkflowStage =
  | "processing"
  | "call_not_received"
  | "on_hold"
  | "advance_payment"
  | "confirmed"
  | "cancelled"
  | "shipped"
  | "delivered"
  | "returned";

export const WORKFLOW_STAGES: WorkflowStage[] = [
  "processing",
  "call_not_received",
  "on_hold",
  "advance_payment",
  "confirmed",
  "cancelled",
  "shipped",
  "delivered",
  "returned",
];

export const STAGE_LABEL: Record<WorkflowStage, string> = {
  processing: "Processing",
  call_not_received: "Call Not Received",
  on_hold: "On Hold",
  advance_payment: "Advance Payment",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  shipped: "Shipped",
  delivered: "Delivered",
  returned: "Returned",
};

export const STAGE_COLOR: Record<WorkflowStage, string> = {
  processing: "bg-slate-100 text-slate-700 ring-slate-200",
  call_not_received: "bg-amber-100 text-amber-800 ring-amber-200",
  on_hold: "bg-orange-100 text-orange-800 ring-orange-200",
  advance_payment: "bg-violet-100 text-violet-800 ring-violet-200",
  confirmed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 ring-rose-200",
  shipped: "bg-sky-100 text-sky-800 ring-sky-200",
  delivered: "bg-green-100 text-green-800 ring-green-200",
  returned: "bg-zinc-200 text-zinc-800 ring-zinc-300",
};

// Derive workflow stage from DB row.
// We look at multiple fields because the schema spreads workflow across status/confirmation_status/call_status/hold_until/advance_amount.
export function deriveStage(o: {
  status: DBOrderStatus | string | null;
  confirmation_status?: DBConfirmationStatus | string | null;
  call_status?: DBCallStatus | string | null;
  hold_until?: string | null;
  advance_amount?: number | null;
}): WorkflowStage {
  const s = (o.status ?? "new") as string;
  if (s === "delivered") return "delivered";
  if (s === "returned") return "returned";
  if (s === "shipped" || s === "in_transit" || s === "ready_to_ship") return "shipped";
  if (s === "cancelled" || s === "fake") return "cancelled";
  if (s === "confirmed" || s === "packaging" || s === "packed") return "confirmed";
  if (o.hold_until && new Date(o.hold_until) > new Date()) return "on_hold";
  if (Number(o.advance_amount ?? 0) > 0) return "advance_payment";
  if (o.call_status === "no_answer" || o.call_status === "busy") return "call_not_received";
  return "processing";
}

// Map a workflow stage back to DB updates.
export function stageToDBUpdate(stage: WorkflowStage): Record<string, unknown> {
  const now = new Date().toISOString();
  switch (stage) {
    case "processing":
      return { status: "new", confirmation_status: "pending", hold_until: null };
    case "call_not_received":
      return { call_status: "no_answer", status: "new" };
    case "on_hold":
      return { hold_until: new Date(Date.now() + 24 * 3600 * 1000).toISOString() };
    case "advance_payment":
      return {}; // advance_amount edited separately
    case "confirmed":
      return { status: "confirmed", confirmation_status: "confirmed", confirmed_at: now };
    case "cancelled":
      return { status: "cancelled", confirmation_status: "cancelled", cancelled_at: now };
    case "shipped":
      return { status: "shipped", shipped_at: now };
    case "delivered":
      return { status: "delivered", delivered_at: now };
    case "returned":
      return { status: "returned" };
  }
}

export function fmtBDT(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return "৳" + v.toLocaleString("en-BD", { maximumFractionDigits: 0 });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return "#" + id.slice(0, 8).toUpperCase();
}
