import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { OptionType, OptionValue, ProductVariant } from "@/lib/variants";
import { findVariantByValues } from "@/lib/variants";

type Props = {
  optionTypes: OptionType[];
  optionValues: OptionValue[];
  variants: ProductVariant[];
  selected: Record<string, string>; // option_type_id -> option_value_id
  onChange: (next: Record<string, string>) => void;
};

/**
 * Renders one chip group per option type. Chips representing combinations that
 * have no in-stock variant are rendered disabled.
 */
export default function VariantSelector({
  optionTypes,
  optionValues,
  variants,
  selected,
  onChange,
}: Props) {
  // For each (typeId, valueId), compute whether picking it leaves any in-stock variant reachable
  const reachability = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const t of optionTypes) {
      const valuesForType = optionValues.filter((v) => v.option_type_id === t.id);
      for (const v of valuesForType) {
        const trial: Record<string, string> = { ...selected, [t.id]: v.id };
        const valueIds = optionTypes
          .map((tt) => trial[tt.id])
          .filter((x): x is string => !!x);
        // If not all types are picked yet, treat as reachable if ANY variant contains v.id and is in-stock
        const fullyPicked = valueIds.length === optionTypes.length;
        if (fullyPicked) {
          const variant = findVariantByValues(variants, valueIds);
          map.set(`${t.id}:${v.id}`, !!variant && variant.is_active && variant.stock > 0);
        } else {
          const ok = variants.some(
            (variant) =>
              variant.is_active &&
              variant.stock > 0 &&
              variant.value_ids.includes(v.id) &&
              valueIds.every((id) => variant.value_ids.includes(id)),
          );
          map.set(`${t.id}:${v.id}`, ok);
        }
      }
    }
    return map;
  }, [optionTypes, optionValues, variants, selected]);

  if (optionTypes.length === 0) return null;

  return (
    <div className="mt-5 space-y-4">
      {optionTypes.map((t) => {
        const valuesForType = optionValues.filter((v) => v.option_type_id === t.id);
        if (valuesForType.length === 0) return null;
        const selectedValueId = selected[t.id];
        const selectedLabel = valuesForType.find((v) => v.id === selectedValueId)?.value;
        return (
          <div key={t.id}>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t.name}
              </span>
              {selectedLabel && (
                <span className="text-sm font-semibold text-foreground">{selectedLabel}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {valuesForType.map((v) => {
                const reachable = reachability.get(`${t.id}:${v.id}`) ?? false;
                const isSelected = selectedValueId === v.id;
                const isSwatch = !!v.swatch_hex;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={!reachable && !isSelected}
                    onClick={() => onChange({ ...selected, [t.id]: v.id })}
                    className={cn(
                      "relative inline-flex items-center justify-center rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition",
                      isSelected
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : reachable
                          ? "border-border bg-card hover:border-primary/50"
                          : "cursor-not-allowed border-dashed border-border bg-muted text-muted-foreground line-through opacity-60",
                      isSwatch && "pl-2",
                    )}
                    title={!reachable ? `${v.value} — out of stock` : v.value}
                  >
                    {isSwatch && (
                      <span
                        className="mr-2 inline-block h-4 w-4 rounded-full border border-border"
                        style={{ backgroundColor: v.swatch_hex ?? undefined }}
                      />
                    )}
                    {v.value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
