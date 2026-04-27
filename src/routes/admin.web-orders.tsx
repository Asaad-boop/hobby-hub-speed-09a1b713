import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, RefreshCw, Phone, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PageHeader, Card, Loading, Empty, Badge, Btn, Input, Modal, Textarea, Select,
  fmtBDT, fmtDate,
} from "@/components/admin/ui";

export const Route = createFileRoute("/admin/web-orders")({
  component: WebOrdersPage,
});

type Order = {
  id: string;
  created_at: string;
  status: string;
  web_status: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_district: string | null;
  total: number;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  notes: string | null;
  admin_notes: string | null;
  call_status: string;
  source: string | null;
  is_guest_order: boolean;
};

const WEB_STATUSES = ["processing", "incomplete", "good_but_no_response", "no_response", "advance_payment", "on_hold", "complete", "cancelled"];

function WebOrdersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Order | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "web-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Order[];
    },
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("web-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: ["admin", "web-orders"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (filter !== "all") rows = rows.filter((r) => (r.web_status ?? "processing") === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        (r.shipping_name ?? r.guest_name ?? "").toLowerCase().includes(q) ||
        (r.shipping_phone ?? r.guest_phone ?? "").includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [data, filter, search]);

  async function confirmToPipeline(orderId: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status: "confirmed", confirmation_status: "confirmed", web_status: "complete", confirmed_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) return toast.error(error.message);
    toast.success("Order confirmed → moved to Pipeline");
    refetch();
  }

  async function markCancelled(orderId: string, reason: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled", web_status: "cancelled", cancellation_reason: reason, cancelled_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) return toast.error(error.message);
    toast.success("Order cancelled");
    refetch();
  }

  return (
    <div>
      <PageHeader
        title="Web Orders"
        description="Raw inbox — review, edit and confirm to send into the order pipeline."
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search name, phone, ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 w-64"
              />
            </div>
            <Btn onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5" /> Refresh</Btn>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap gap-1">
        {["all", ...WEB_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === s ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Empty title="No web orders" description="New orders from the website will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Order</th>
                  <th className="px-4 py-2 text-left font-medium">Customer</th>
                  <th className="px-4 py-2 text-left font-medium">Phone</th>
                  <th className="px-4 py-2 text-left font-medium">Total</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Created</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">#{o.id.slice(0, 8)}</td>
                    <td className="px-4 py-2.5">{o.shipping_name ?? o.guest_name ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      {o.shipping_phone || o.guest_phone ? (
                        <a href={`tel:${o.shipping_phone ?? o.guest_phone}`} className="text-blue-600 hover:underline">
                          {o.shipping_phone ?? o.guest_phone}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{fmtBDT(o.total)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={o.web_status === "complete" ? "green" : o.web_status === "cancelled" ? "red" : "blue"}>
                        {(o.web_status ?? "processing").replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(o.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Btn onClick={() => setEditing(o)}><ExternalLink className="h-3 w-3" /> Open</Btn>
                        <Btn variant="primary" onClick={() => confirmToPipeline(o.id)}>
                          <CheckCircle2 className="h-3 w-3" /> Confirm
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <OrderEditModal
          order={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(); }}
          onConfirm={() => confirmToPipeline(editing.id).then(() => setEditing(null))}
          onCancel={(reason) => markCancelled(editing.id, reason).then(() => setEditing(null))}
        />
      )}
    </div>
  );
}

function OrderEditModal({
  order, onClose, onSaved, onConfirm, onCancel,
}: {
  order: Order;
  onClose: () => void;
  onSaved: () => void;
  onConfirm: () => void;
  onCancel: (reason: string) => void;
}) {
  const [form, setForm] = useState({
    shipping_name: order.shipping_name ?? "",
    shipping_phone: order.shipping_phone ?? "",
    shipping_address: order.shipping_address ?? "",
    shipping_city: order.shipping_city ?? "",
    shipping_district: order.shipping_district ?? "",
    web_status: order.web_status ?? "processing",
    admin_notes: order.admin_notes ?? "",
    call_status: order.call_status ?? "not_called",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("orders").update(form).eq("id", order.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={`Order #${order.id.slice(0, 8)}`} width="max-w-2xl">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Customer Name"><Input value={form.shipping_name} onChange={(e) => setForm({ ...form, shipping_name: e.target.value })} /></Field>
        <Field label="Phone"><Input value={form.shipping_phone} onChange={(e) => setForm({ ...form, shipping_phone: e.target.value })} /></Field>
        <Field label="District"><Input value={form.shipping_district} onChange={(e) => setForm({ ...form, shipping_district: e.target.value })} /></Field>
        <Field label="City / Thana"><Input value={form.shipping_city} onChange={(e) => setForm({ ...form, shipping_city: e.target.value })} /></Field>
        <Field label="Address" full><Textarea rows={2} value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} /></Field>
        <Field label="Web Status">
          <Select value={form.web_status} onChange={(e) => setForm({ ...form, web_status: e.target.value })}>
            {WEB_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </Select>
        </Field>
        <Field label="Call Status">
          <Select value={form.call_status} onChange={(e) => setForm({ ...form, call_status: e.target.value })}>
            {["not_called","attempting","reached","no_response","wrong_number","customer_confirmed","customer_cancelled","needs_followup"].map((s) =>
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            )}
          </Select>
        </Field>
        <Field label="Admin Notes" full><Textarea rows={3} value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} /></Field>
      </div>

      <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs" style={{ borderWidth: "0.5px" }}>
        <div className="flex justify-between"><span>Subtotal</span><span>{fmtBDT(order.subtotal)}</span></div>
        <div className="flex justify-between"><span>Shipping</span><span>{fmtBDT(order.shipping_fee)}</span></div>
        <div className="flex justify-between"><span>Discount</span><span>-{fmtBDT(order.discount_amount)}</span></div>
        <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 font-semibold"><span>Total</span><span>{fmtBDT(order.total)}</span></div>
      </div>

      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <Btn variant="danger" onClick={() => {
          const reason = prompt("Cancel reason?") ?? "";
          if (reason) onCancel(reason);
        }}>
          <XCircle className="h-3.5 w-3.5" /> Cancel order
        </Btn>
        <div className="flex gap-2">
          <Btn onClick={onClose}>Close</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
          <Btn variant="primary" onClick={onConfirm}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Confirm to pipeline
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>
      {children}
    </div>
  );
}
