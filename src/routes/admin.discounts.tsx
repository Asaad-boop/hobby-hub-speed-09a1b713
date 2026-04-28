import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PageHeader,
  Card,
  Loading,
  Btn,
  Input,
  Select,
  Modal,
  Empty,
  Badge,
  fmtDate,
} from "@/components/admin/ui";

export const Route = createFileRoute("/admin/discounts")({
  component: DiscountsPage,
});

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: "percentage" | "fixed";
  value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
};

const empty: Partial<Coupon> = {
  code: "",
  description: "",
  type: "percentage",
  value: 10,
  min_order_amount: 0,
  max_discount: null,
  usage_limit: null,
  is_active: true,
  valid_until: null,
};

function DiscountsPage() {
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("id,code,description,type,value,min_order_amount,max_discount,usage_limit,used_count,is_active,valid_from,valid_until")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Coupon[];
    },
  });

  async function save() {
    if (!editing) return;
    const code = (editing.code ?? "").trim().toUpperCase();
    if (!code) {
      toast.error("Code required");
      return;
    }
    const payload = {
      code,
      description: editing.description ?? null,
      type: editing.type ?? "percentage",
      value: Number(editing.value ?? 0),
      min_order_amount: Number(editing.min_order_amount ?? 0),
      max_discount: editing.max_discount != null && editing.max_discount !== ("" as any) ? Number(editing.max_discount) : null,
      usage_limit: editing.usage_limit != null && editing.usage_limit !== ("" as any) ? Number(editing.usage_limit) : null,
      is_active: editing.is_active ?? true,
      valid_until: editing.valid_until || null,
    };
    const { error } = editing.id
      ? await supabase.from("coupons").update(payload).eq("id", editing.id)
      : await supabase.from("coupons").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing.id ? "Updated" : "Created");
    setEditing(null);
    refetch();
  }

  async function toggle(c: Coupon) {
    const { error } = await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    refetch();
  }

  async function remove(c: Coupon) {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refetch();
  }

  return (
    <div>
      <PageHeader
        title="Discounts"
        description="Promo codes and coupons"
        actions={
          <Btn variant="primary" onClick={() => setEditing(empty)}>
            <Plus className="h-3.5 w-3.5" /> New code
          </Btn>
        }
      />

      <Card>
        {isLoading ? (
          <Loading />
        ) : !data || data.length === 0 ? (
          <Empty title="No discount codes yet" description="Create your first promo code" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Code</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Value</th>
                  <th className="px-4 py-2.5 font-medium">Min order</th>
                  <th className="px-4 py-2.5 font-medium">Usage</th>
                  <th className="px-4 py-2.5 font-medium">Valid until</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold">{c.code}</div>
                      {c.description && (
                        <div className="text-xs text-muted-foreground">{c.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize">{c.type}</td>
                    <td className="px-4 py-3 font-medium">
                      {c.type === "percentage" ? `${c.value}%` : `৳${c.value}`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">৳{c.min_order_amount}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.used_count}
                      {c.usage_limit != null ? ` / ${c.usage_limit}` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.valid_until ? fmtDate(c.valid_until) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={c.is_active ? "green" : "gray"}>
                        {c.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Btn variant="ghost" onClick={() => toggle(c)}>
                          <Power className="h-3.5 w-3.5" />
                        </Btn>
                        <Btn variant="ghost" onClick={() => setEditing(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Btn>
                        <Btn variant="ghost" onClick={() => remove(c)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
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

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit code" : "New discount code"}>
        {editing && (
          <div className="space-y-3">
            <Field label="Code">
              <Input
                value={editing.code ?? ""}
                onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER20"
              />
            </Field>
            <Field label="Description (optional)">
              <Input
                value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <Select
                  value={editing.type ?? "percentage"}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value as "percentage" | "fixed" })}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed amount (৳)</option>
                </Select>
              </Field>
              <Field label="Value">
                <Input
                  type="number"
                  value={editing.value ?? 0}
                  onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min order amount">
                <Input
                  type="number"
                  value={editing.min_order_amount ?? 0}
                  onChange={(e) => setEditing({ ...editing, min_order_amount: Number(e.target.value) })}
                />
              </Field>
              <Field label="Max discount (optional)">
                <Input
                  type="number"
                  value={editing.max_discount ?? ""}
                  onChange={(e) => setEditing({ ...editing, max_discount: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Usage limit (optional)">
                <Input
                  type="number"
                  value={editing.usage_limit ?? ""}
                  onChange={(e) => setEditing({ ...editing, usage_limit: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </Field>
              <Field label="Valid until (optional)">
                <Input
                  type="datetime-local"
                  value={editing.valid_until ? editing.valid_until.slice(0, 16) : ""}
                  onChange={(e) => setEditing({ ...editing, valid_until: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.is_active ?? true}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              Active
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="default" onClick={() => setEditing(null)}>Cancel</Btn>
              <Btn variant="primary" onClick={save}>Save</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
