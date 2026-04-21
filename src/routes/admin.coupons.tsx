import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil, Trash2, Tag, Search, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Coupon, CouponType } from "@/lib/coupons";

export const Route = createFileRoute("/admin/coupons")({
  head: () => ({ meta: [{ title: "Coupons — Admin" }] }),
  component: AdminCouponsPage,
});

type FormState = {
  code: string;
  description: string;
  type: CouponType;
  value: string;
  min_order_amount: string;
  max_discount: string;
  usage_limit: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  code: "",
  description: "",
  type: "percentage",
  value: "",
  min_order_amount: "0",
  max_discount: "",
  usage_limit: "",
  valid_from: "",
  valid_until: "",
  is_active: true,
};

function AdminCouponsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statsId, setStatsId] = useState<string | null>(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Coupon[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    );
  }, [coupons, search]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description ?? "",
      type: c.type,
      value: String(c.value),
      min_order_amount: String(c.min_order_amount),
      max_discount: c.max_discount != null ? String(c.max_discount) : "",
      usage_limit: c.usage_limit != null ? String(c.usage_limit) : "",
      valid_from: c.valid_from ? c.valid_from.slice(0, 16) : "",
      valid_until: c.valid_until ? c.valid_until.slice(0, 16) : "",
      is_active: c.is_active,
    });
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const code = form.code.trim().toUpperCase();
      if (!code) throw new Error("Code is required");
      const value = Number(form.value);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Value must be > 0");
      if (form.type === "percentage" && value > 100)
        throw new Error("Percentage cannot exceed 100");

      const payload = {
        code,
        description: form.description.trim() || null,
        type: form.type,
        value,
        min_order_amount: Number(form.min_order_amount) || 0,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        valid_from: form.valid_from
          ? new Date(form.valid_from).toISOString()
          : new Date().toISOString(),
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        is_active: form.is_active,
      };

      if (editing) {
        const { error } = await supabase
          .from("coupons")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Coupon updated" : "Coupon created");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Coupon deleted");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "coupons"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Tag className="h-6 w-6" /> Coupons
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage discount codes for your store.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> New coupon
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code or description"
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No coupons yet. Click "New coupon" to create one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Min order</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-mono font-bold">{c.code}</div>
                    {c.description && (
                      <div className="text-xs text-muted-foreground">{c.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {c.type === "percentage" ? `${c.value}%` : `৳${c.value}`}
                    </Badge>
                    {c.max_discount && c.type === "percentage" && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        max ৳{c.max_discount}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>৳{c.min_order_amount}</TableCell>
                  <TableCell>
                    {c.used_count}
                    {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                    <button
                      type="button"
                      onClick={() => setStatsId(c.id)}
                      className="ml-2 inline-flex items-center text-muted-foreground hover:text-foreground"
                      title="View usage"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.valid_until
                      ? new Date(c.valid_until).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={(v) =>
                        toggleActive.mutate({ id: c.id, active: v })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(c.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit / create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit coupon" : "New coupon"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder="SAVE10"
                className="font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Eid sale 10% off"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: CouponType) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed amount (৳)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Value</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === "percentage" ? "10" : "100"}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Min order amount (৳)</Label>
                <Input
                  type="number"
                  value={form.min_order_amount}
                  onChange={(e) =>
                    setForm({ ...form, min_order_amount: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Max discount (৳, optional)</Label>
                <Input
                  type="number"
                  value={form.max_discount}
                  onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                  placeholder="No cap"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Usage limit (optional)</Label>
              <Input
                type="number"
                value={form.usage_limit}
                onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Valid from</Label>
                <Input
                  type="datetime-local"
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Valid until</Label>
                <Input
                  type="datetime-local"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Customers can use it at checkout
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the code. Existing usage records remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Usage stats */}
      <UsageDialog id={statsId} onClose={() => setStatsId(null)} />
    </div>
  );
}

function UsageDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "coupon-usage", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("coupon_usage")
        .select("id, user_id, order_id, discount_amount, created_at")
        .eq("coupon_id", id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const totalDiscount = (data ?? []).reduce(
    (s, r) => s + Number(r.discount_amount ?? 0),
    0,
  );

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Coupon usage</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (data ?? []).length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No redemptions yet.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Total redemptions</p>
                <p className="text-xl font-bold">{data!.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total discount given</p>
                <p className="text-xl font-bold text-primary">৳{totalDiscount}</p>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data!.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.order_id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ৳{r.discount_amount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
