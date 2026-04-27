import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, RefreshCw, Printer, Truck, Package, CheckCircle2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PageHeader, Card, Loading, Empty, Badge, Btn, Input, Modal, Select,
  fmtBDT, fmtDate,
} from "@/components/admin/ui";

export const Route = createFileRoute("/admin/orders-pipeline")({
  component: PipelinePage,
});

type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_district: string | null;
  total: number;
  courier_name: string | null;
  tracking_number: string | null;
  delivery_method: string | null;
};

const TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: "pending", label: "Pending", statuses: ["confirmed"] },
  { key: "ready_to_pack", label: "Ready to Pack", statuses: ["ready_to_pack", "packaging"] },
  { key: "packed", label: "Packed", statuses: ["packed"] },
  { key: "courier", label: "Courier Entry", statuses: ["courier_entry", "ready_to_ship"] },
  { key: "shipped", label: "Shipped", statuses: ["shipped", "in_transit"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered", "partial_delivered"] },
  { key: "returned", label: "Returned", statuses: ["returned", "paid_return", "unpaid_return", "partial_return", "exchanged"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled", "fake"] },
];

function statusTone(s: string): "gray" | "green" | "red" | "yellow" | "blue" | "purple" {
  if (["delivered", "partial_delivered"].includes(s)) return "green";
  if (["cancelled", "fake", "returned", "paid_return", "unpaid_return"].includes(s)) return "red";
  if (["shipped", "in_transit"].includes(s)) return "blue";
  if (["packed", "ready_to_ship", "courier_entry"].includes(s)) return "purple";
  if (["packaging", "ready_to_pack"].includes(s)) return "yellow";
  return "gray";
}

function PipelinePage() {
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [courierModal, setCourierModal] = useState<OrderRow | null>(null);
  const qc = useQueryClient();

  const tabConfig = TABS.find((t) => t.key === tab)!;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "pipeline", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,created_at,status,shipping_name,shipping_phone,shipping_address,shipping_city,shipping_district,total,courier_name,tracking_number,delivery_method")
        .in("status", tabConfig.statuses as any)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as OrderRow[];
    },
  });

  useEffect(() => {
    const ch = supabase.channel("pipeline-rt").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
      qc.invalidateQueries({ queryKey: ["admin", "pipeline"] });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  useEffect(() => { setSelected(new Set()); }, [tab]);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        (r.shipping_name ?? "").toLowerCase().includes(q) ||
        (r.shipping_phone ?? "").includes(q) ||
        (r.tracking_number ?? "").toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [data, search]);

  async function bulkUpdate(updates: Record<string, any>) {
    if (selected.size === 0) return toast.error("Select orders first");
    const ids = Array.from(selected);
    const { error } = await supabase.from("orders").update(updates as any).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Updated ${ids.length} orders`);
    setSelected(new Set());
    refetch();
  }

  async function singleUpdate(id: string, updates: Record<string, any>, msg: string) {
    const { error } = await supabase.from("orders").update(updates as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(msg);
    refetch();
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(filtered.map((r) => r.id)) : new Set());
  }

  function actionsForTab(o: OrderRow) {
    switch (tab) {
      case "pending":
        return (
          <Btn variant="primary" onClick={() => singleUpdate(o.id, { status: "ready_to_pack" }, "Marked ready to pack")}>
            <Package className="h-3 w-3" /> Ready to pack
          </Btn>
        );
      case "ready_to_pack":
        return (
          <Btn variant="primary" onClick={() => singleUpdate(o.id, { status: "packed", packaged_at: new Date().toISOString() }, "Packed")}>
            <CheckCircle2 className="h-3 w-3" /> Mark packed
          </Btn>
        );
      case "packed":
        return (
          <Btn variant="primary" onClick={() => setCourierModal(o)}>
            <Truck className="h-3 w-3" /> Courier entry
          </Btn>
        );
      case "courier":
        return (
          <Btn variant="primary" onClick={() => singleUpdate(o.id, { status: "shipped", shipped_at: new Date().toISOString() }, "Shipped")}>
            <Truck className="h-3 w-3" /> Mark shipped
          </Btn>
        );
      case "shipped":
        return (
          <div className="flex gap-1">
            <Btn onClick={() => singleUpdate(o.id, { status: "in_transit", in_transit_at: new Date().toISOString() }, "In transit")}>In transit</Btn>
            <Btn variant="primary" onClick={() => singleUpdate(o.id, { status: "delivered", delivered_at: new Date().toISOString() }, "Delivered")}>
              <CheckCircle2 className="h-3 w-3" /> Delivered
            </Btn>
            <Btn variant="danger" onClick={() => {
              const note = prompt("Return note?") ?? "";
              singleUpdate(o.id, { status: "returned", return_type: "unpaid_return", return_note: note }, "Returned");
            }}><RotateCcw className="h-3 w-3" /> Return</Btn>
          </div>
        );
      default:
        return null;
    }
  }

  function bulkBar() {
    if (selected.size === 0) return null;
    return (
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white">
        <span>{selected.size} selected</span>
        <div className="flex flex-wrap gap-1.5">
          {tab === "pending" && (
            <Btn variant="primary" onClick={() => bulkUpdate({ status: "ready_to_pack" })}>Mark ready to pack</Btn>
          )}
          {tab === "ready_to_pack" && (
            <Btn variant="primary" onClick={() => bulkUpdate({ status: "packed", packaged_at: new Date().toISOString() })}>Mark packed</Btn>
          )}
          {tab === "courier" && (
            <Btn variant="primary" onClick={() => bulkUpdate({ status: "shipped", shipped_at: new Date().toISOString() })}>Mark shipped</Btn>
          )}
          {tab === "shipped" && (
            <Btn variant="primary" onClick={() => bulkUpdate({ status: "delivered", delivered_at: new Date().toISOString() })}>Mark delivered</Btn>
          )}
          <Btn onClick={() => printHandover(filtered.filter((r) => selected.has(r.id)))}>
            <Printer className="h-3 w-3" /> Handover sheet
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Orders Pipeline"
        description="Process confirmed orders through packing, courier and delivery."
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-7 w-64" />
            </div>
            <Btn onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5" /></Btn>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {bulkBar()}

      <Card>
        {isLoading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Empty title="No orders" description="Orders matching this stage will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 w-8"><input type="checkbox" onChange={(e) => toggleAll(e.target.checked)} checked={selected.size === filtered.length && filtered.length > 0} /></th>
                  <th className="px-4 py-2 text-left font-medium">Order</th>
                  <th className="px-4 py-2 text-left font-medium">Customer</th>
                  <th className="px-4 py-2 text-left font-medium">Address</th>
                  <th className="px-4 py-2 text-left font-medium">Total</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Courier</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2.5"><input type="checkbox" checked={selected.has(o.id)} onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(o.id); else next.delete(o.id);
                      setSelected(next);
                    }} /></td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">
                      <div>#{o.id.slice(0, 8)}</div>
                      <div className="text-[10px] text-gray-400">{fmtDate(o.created_at)}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{o.shipping_name ?? "—"}</div>
                      <div className="text-xs text-gray-500">{o.shipping_phone}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[220px] truncate">
                      {[o.shipping_address, o.shipping_city, o.shipping_district].filter(Boolean).join(", ")}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{fmtBDT(o.total)}</td>
                    <td className="px-4 py-2.5"><Badge tone={statusTone(o.status)}>{o.status.replace(/_/g, " ")}</Badge></td>
                    <td className="px-4 py-2.5 text-xs">
                      {o.courier_name ? (
                        <>
                          <div>{o.courier_name}</div>
                          <div className="text-gray-400">{o.tracking_number}</div>
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Btn onClick={() => printInvoice(o)}><Printer className="h-3 w-3" /> Invoice</Btn>
                        {actionsForTab(o)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {courierModal && (
        <CourierModal
          order={courierModal}
          onClose={() => setCourierModal(null)}
          onDone={() => { setCourierModal(null); refetch(); }}
        />
      )}
    </div>
  );
}

function CourierModal({ order, onClose, onDone }: { order: OrderRow; onClose: () => void; onDone: () => void }) {
  const [courier, setCourier] = useState(order.courier_name ?? "pathao");
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("orders").update({
      courier_name: courier,
      tracking_number: tracking,
      status: "ready_to_ship",
      courier_assigned_at: new Date().toISOString(),
    } as any).eq("id", order.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Courier assigned · ready to ship");
    onDone();
  }

  return (
    <Modal open onClose={onClose} title={`Courier entry · #${order.id.slice(0, 8)}`}>
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-xs font-medium text-gray-600">Courier</div>
          <Select value={courier} onChange={(e) => setCourier(e.target.value)}>
            <option value="pathao">Pathao</option>
            <option value="steadfast">Steadfast</option>
            <option value="redx">RedX</option>
            <option value="manual">Manual / Other</option>
          </Select>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-gray-600">Tracking / Consignment ID</div>
          <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Enter tracking number" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save · Ready to ship"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

function printHTML(html: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return toast.error("Pop-ups blocked");
  w.document.write(`<html><head><title>Print</title>
    <style>
      body{font-family:Inter,system-ui,sans-serif;padding:24px;color:#111827;font-size:12px}
      h1{font-size:18px;margin:0 0 8px}
      h2{font-size:14px;margin:16px 0 8px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th,td{border-bottom:0.5px solid #e5e7eb;padding:6px 8px;text-align:left}
      th{background:#f9fafb;font-weight:600}
      .row{display:flex;justify-content:space-between;gap:16px;margin-bottom:4px}
      .box{border:0.5px solid #e5e7eb;padding:12px;border-radius:8px;margin-bottom:12px}
      @media print{button{display:none}}
    </style></head><body>${html}<script>window.print()</script></body></html>`);
  w.document.close();
}

function printInvoice(o: OrderRow) {
  printHTML(`
    <h1>INVOICE</h1>
    <div class="row"><span>Order</span><strong>#${o.id.slice(0, 8)}</strong></div>
    <div class="row"><span>Date</span><span>${fmtDate(o.created_at)}</span></div>
    <div class="box">
      <strong>${o.shipping_name ?? "—"}</strong><br/>
      ${o.shipping_phone ?? ""}<br/>
      ${[o.shipping_address, o.shipping_city, o.shipping_district].filter(Boolean).join(", ")}
    </div>
    <div class="row"><span>Total</span><strong>${fmtBDT(o.total)}</strong></div>
    ${o.courier_name ? `<div class="row"><span>Courier</span><span>${o.courier_name} · ${o.tracking_number ?? ""}</span></div>` : ""}
  `);
}

function printHandover(rows: OrderRow[]) {
  const html = `
    <h1>Courier Handover Sheet</h1>
    <div>${new Date().toLocaleString()} · ${rows.length} parcels</div>
    <table>
      <thead><tr><th>#</th><th>Order</th><th>Customer</th><th>Phone</th><th>Address</th><th>Courier</th><th>Tracking</th><th>Total</th></tr></thead>
      <tbody>
      ${rows.map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>#${r.id.slice(0, 8)}</td>
          <td>${r.shipping_name ?? "—"}</td>
          <td>${r.shipping_phone ?? ""}</td>
          <td>${[r.shipping_address, r.shipping_city, r.shipping_district].filter(Boolean).join(", ")}</td>
          <td>${r.courier_name ?? ""}</td>
          <td>${r.tracking_number ?? ""}</td>
          <td>${fmtBDT(r.total)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  `;
  printHTML(html);
}
