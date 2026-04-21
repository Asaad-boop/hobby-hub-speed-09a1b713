import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchProductVariantData,
  createOptionType,
  deleteOptionType,
  createOptionValue,
  deleteOptionValue,
  upsertVariant,
  deleteVariant,
  cartesian,
  type OptionType,
  type OptionValue,
  type ProductVariant,
} from "@/lib/variants";

export function VariantManager({
  open,
  onOpenChange,
  productId,
  productTitle,
  productPrice,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string | null;
  productTitle: string;
  productPrice: number;
}) {
  const qc = useQueryClient();
  const enabled = open && !!productId;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "variants", productId],
    queryFn: () => fetchProductVariantData(productId!),
    enabled,
  });

  const optionTypes = data?.optionTypes ?? [];
  const optionValues = data?.optionValues ?? [];
  const variants = data?.variants ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "variants", productId] });

  // ---- option type / value forms ----
  const [newTypeName, setNewTypeName] = useState("");
  const addType = useMutation({
    mutationFn: async () => {
      if (!productId || !newTypeName.trim()) throw new Error("Name required");
      await createOptionType({
        product_id: productId,
        name: newTypeName.trim(),
        display_order: optionTypes.length,
      });
    },
    onSuccess: () => {
      setNewTypeName("");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const removeType = useMutation({
    mutationFn: deleteOptionType,
    onSuccess: refresh,
  });

  const [newValue, setNewValue] = useState<Record<string, { value: string; swatch: string }>>({});
  const addValue = useMutation({
    mutationFn: async ({ typeId, value, swatch }: { typeId: string; value: string; swatch: string }) => {
      if (!value.trim()) throw new Error("Value required");
      await createOptionValue({
        option_type_id: typeId,
        value: value.trim(),
        swatch_hex: swatch ? swatch : null,
        display_order: optionValues.filter((v) => v.option_type_id === typeId).length,
      });
    },
    onSuccess: (_d, vars) => {
      setNewValue((s) => ({ ...s, [vars.typeId]: { value: "", swatch: "" } }));
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const removeValue = useMutation({
    mutationFn: deleteOptionValue,
    onSuccess: refresh,
  });

  // ---- variant generation ----
  const generate = useMutation({
    mutationFn: async () => {
      if (!productId) return;
      const valuesByType = optionTypes.map((t) =>
        optionValues.filter((v) => v.option_type_id === t.id),
      );
      if (valuesByType.some((arr) => arr.length === 0)) {
        throw new Error("Each option type must have at least one value");
      }
      const combos = cartesian(valuesByType);
      const existingKeys = new Set(
        variants.map((v) => [...v.value_ids].sort().join(",")),
      );
      let added = 0;
      for (const combo of combos) {
        const ids = combo.map((v) => v.id).sort();
        const key = ids.join(",");
        if (existingKeys.has(key)) continue;
        await upsertVariant({
          product_id: productId,
          value_ids: ids,
          stock: 0,
          is_active: true,
        });
        added++;
      }
      return added;
    },
    onSuccess: (added) => {
      toast.success(added ? `${added} variant${added > 1 ? "s" : ""} created` : "All combinations exist");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Variants — {productTitle}</DialogTitle>
          <DialogDescription>
            Define option types (e.g. Size, Color), add values, then generate the variant matrix.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Option types */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">1. Option types</h3>
              <div className="flex gap-2">
                <Input
                  placeholder='e.g. "Size" or "Color"'
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addType.mutate())}
                />
                <Button onClick={() => addType.mutate()} disabled={addType.isPending}>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
              {optionTypes.length === 0 && (
                <p className="text-xs text-muted-foreground">No option types yet.</p>
              )}
              {optionTypes.map((t) => (
                <OptionTypeCard
                  key={t.id}
                  type={t}
                  values={optionValues.filter((v) => v.option_type_id === t.id)}
                  newValue={newValue[t.id] ?? { value: "", swatch: "" }}
                  setNewValue={(nv) => setNewValue((s) => ({ ...s, [t.id]: nv }))}
                  onAddValue={() =>
                    addValue.mutate({
                      typeId: t.id,
                      value: (newValue[t.id]?.value ?? "").trim(),
                      swatch: newValue[t.id]?.swatch ?? "",
                    })
                  }
                  onRemoveValue={(vid) => removeValue.mutate(vid)}
                  onRemoveType={() => removeType.mutate(t.id)}
                />
              ))}
            </section>

            {/* Generate */}
            {optionTypes.length > 0 && (
              <section className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">2. Generate variant matrix</h3>
                    <p className="text-xs text-muted-foreground">
                      Creates one variant for every combination not yet present.
                    </p>
                  </div>
                  <Button onClick={() => generate.mutate()} disabled={generate.isPending} variant="secondary">
                    {generate.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="mr-1 h-4 w-4" />
                    )}
                    Generate
                  </Button>
                </div>
              </section>
            )}

            {/* Variants table */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">3. Variants ({variants.length})</h3>
              {variants.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No variants yet. Add option values and click Generate.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Combo</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Price (৳)</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((v) => (
                        <VariantRow
                          key={v.id}
                          variant={v}
                          optionTypes={optionTypes}
                          optionValues={optionValues}
                          productPrice={productPrice}
                          onSaved={refresh}
                          onDelete={() => deleteVariant(v.id).then(refresh)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OptionTypeCard({
  type,
  values,
  newValue,
  setNewValue,
  onAddValue,
  onRemoveValue,
  onRemoveType,
}: {
  type: OptionType;
  values: OptionValue[];
  newValue: { value: string; swatch: string };
  setNewValue: (v: { value: string; swatch: string }) => void;
  onAddValue: () => void;
  onRemoveValue: (id: string) => void;
  onRemoveType: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{type.name}</span>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onRemoveType}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {values.length === 0 ? (
          <span className="text-xs text-muted-foreground">No values yet.</span>
        ) : (
          values.map((v) => (
            <Badge key={v.id} variant="secondary" className="gap-1.5 pr-1">
              {v.swatch_hex && (
                <span
                  className="inline-block h-3 w-3 rounded-full border border-border"
                  style={{ backgroundColor: v.swatch_hex }}
                />
              )}
              {v.value}
              <button
                type="button"
                onClick={() => onRemoveValue(v.id)}
                className="ml-0.5 rounded-full hover:bg-destructive/20"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder='e.g. "Small"'
          value={newValue.value}
          onChange={(e) => setNewValue({ ...newValue, value: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAddValue())}
          className="flex-1"
        />
        <Input
          type="color"
          value={newValue.swatch || "#000000"}
          onChange={(e) => setNewValue({ ...newValue, swatch: e.target.value })}
          className="w-14 cursor-pointer p-1"
          title="Optional swatch color"
        />
        <Button size="sm" onClick={onAddValue}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function VariantRow({
  variant,
  optionTypes,
  optionValues,
  productPrice,
  onSaved,
  onDelete,
}: {
  variant: ProductVariant;
  optionTypes: OptionType[];
  optionValues: OptionValue[];
  productPrice: number;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [sku, setSku] = useState(variant.sku ?? "");
  const [price, setPrice] = useState(variant.price_override?.toString() ?? "");
  const [stock, setStock] = useState(variant.stock.toString());
  const [active, setActive] = useState(variant.is_active);
  const [saving, setSaving] = useState(false);

  const label = useMemo(() => {
    return optionTypes
      .map((t) => optionValues.find((v) => v.option_type_id === t.id && variant.value_ids.includes(v.id))?.value)
      .filter(Boolean)
      .join(" / ");
  }, [optionTypes, optionValues, variant.value_ids]);

  const dirty =
    sku !== (variant.sku ?? "") ||
    price !== (variant.price_override?.toString() ?? "") ||
    stock !== variant.stock.toString() ||
    active !== variant.is_active;

  const save = async () => {
    setSaving(true);
    try {
      await upsertVariant({
        id: variant.id,
        product_id: variant.product_id,
        value_ids: variant.value_ids,
        sku: sku || null,
        price_override: price.trim() === "" ? null : Number(price),
        stock: Number(stock) || 0,
        is_active: active,
      });
      toast.success("Variant saved");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const lowStock = Number(stock) > 0 && Number(stock) <= 3;

  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell>
        <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="h-8 w-32" />
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={productPrice.toString()}
          className="h-8 w-24 text-right"
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {lowStock && <Badge variant="destructive" className="h-5 text-[10px]">Low</Badge>}
          <Input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="h-8 w-20 text-right"
          />
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Switch checked={active} onCheckedChange={setActive} />
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          {dirty && (
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
