import { cn } from "@/lib/utils";

const STATUS_TOKENS: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  new:                  { bg: "bg-status-new/15",       text: "text-status-new",       ring: "ring-status-new/25",       label: "New" },
  confirmed:            { bg: "bg-status-confirmed/15", text: "text-status-confirmed", ring: "ring-status-confirmed/25", label: "Confirmed" },
  packaging:            { bg: "bg-status-packaging/15", text: "text-status-packaging", ring: "ring-status-packaging/25", label: "Packaging" },
  packed:               { bg: "bg-status-packaging/15", text: "text-status-packaging", ring: "ring-status-packaging/25", label: "Packed" },
  ready_to_ship:        { bg: "bg-status-packaging/15", text: "text-status-packaging", ring: "ring-status-packaging/25", label: "Ready" },
  ready_to_pack:        { bg: "bg-status-packaging/15", text: "text-status-packaging", ring: "ring-status-packaging/25", label: "To Pack" },
  shipped:              { bg: "bg-status-shipped/15",   text: "text-status-shipped",   ring: "ring-status-shipped/25",   label: "Shipped" },
  in_transit:           { bg: "bg-status-shipped/15",   text: "text-status-shipped",   ring: "ring-status-shipped/25",   label: "In Transit" },
  courier_entry:        { bg: "bg-status-shipped/15",   text: "text-status-shipped",   ring: "ring-status-shipped/25",   label: "Courier Entry" },
  delivered:            { bg: "bg-status-delivered/15", text: "text-status-delivered", ring: "ring-status-delivered/25", label: "Delivered" },
  partial_delivered:    { bg: "bg-status-delivered/15", text: "text-status-delivered", ring: "ring-status-delivered/25", label: "Partial Delivered" },
  returned:             { bg: "bg-status-returned/15",  text: "text-status-returned",  ring: "ring-status-returned/25",  label: "Returned" },
  exchanged:            { bg: "bg-status-returned/15",  text: "text-status-returned",  ring: "ring-status-returned/25",  label: "Exchanged" },
  exchange:             { bg: "bg-status-returned/15",  text: "text-status-returned",  ring: "ring-status-returned/25",  label: "Exchange" },
  damaged:              { bg: "bg-status-returned/15",  text: "text-status-returned",  ring: "ring-status-returned/25",  label: "Damaged" },
  cancelled:            { bg: "bg-status-cancelled/15", text: "text-status-cancelled", ring: "ring-status-cancelled/25", label: "Cancelled" },
  fake:                 { bg: "bg-status-cancelled/15", text: "text-status-cancelled", ring: "ring-status-cancelled/25", label: "Fake" },
  on_hold:              { bg: "bg-status-hold/15",      text: "text-status-hold",      ring: "ring-status-hold/25",      label: "On Hold" },
  advance_payment_pending: { bg: "bg-status-hold/15",   text: "text-status-hold",      ring: "ring-status-hold/25",      label: "Advance Pending" },
  incomplete:           { bg: "bg-status-hold/15",      text: "text-status-hold",      ring: "ring-status-hold/25",      label: "Incomplete" },
  pending_return:       { bg: "bg-status-returned/15",  text: "text-status-returned",  ring: "ring-status-returned/25",  label: "Pending Return" },
  paid_return:          { bg: "bg-status-returned/15",  text: "text-status-returned",  ring: "ring-status-returned/25",  label: "Paid Return" },
  unpaid_return:        { bg: "bg-status-returned/15",  text: "text-status-returned",  ring: "ring-status-returned/25",  label: "Unpaid Return" },
  partial_return:       { bg: "bg-status-returned/15",  text: "text-status-returned",  ring: "ring-status-returned/25",  label: "Partial Return" },
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const t = STATUS_TOKENS[status] ?? { bg: "bg-muted", text: "text-muted-foreground", ring: "ring-border", label: status };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        t.bg, t.text, t.ring, className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", t.text.replace("text-", "bg-"))} />
      {t.label}
    </span>
  );
}

export const ORDER_STATUS_LABELS = Object.fromEntries(
  Object.entries(STATUS_TOKENS).map(([k, v]) => [k, v.label]),
) as Record<string, string>;
