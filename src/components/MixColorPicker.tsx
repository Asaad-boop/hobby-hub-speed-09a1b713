import { Minus, Plus } from "lucide-react";
import type { OptionValue } from "@/lib/variants";
import { cn } from "@/lib/utils";

type Props = {
  colors: OptionValue[];
  /** Total pieces the customer must allocate across colors. */
  totalQty: number;
  /** Increment step — buckle is sold in pairs so this is 2. */
  step?: number;
  /** current per-color allocation (color id -> qty) */
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
};

/**
 * Pair-based multi-color picker. User can distribute `totalQty` pieces
 * across any subset of colors, in increments of `step` (default 2).
 * Example: 4 pcs → 2 Beige + 2 Brown, or 4 Beige + 0 Brown.
 */
export default function MixColorPicker({
  colors,
  totalQty,
  step = 2,
  value,
  onChange,
}: Props) {
  const allocated = Object.values(value).reduce((s, n) => s + (n || 0), 0);
  const remaining = totalQty - allocated;

  const setQty = (id: string, next: number) => {
    const clamped = Math.max(0, next);
    const others = allocated - (value[id] || 0);
    const capped = Math.min(clamped, totalQty - others);
    onChange({ ...value, [id]: capped });
  };

  return (
    <div className="mt-5 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
            Mix Colors
          </p>
          <p className="text-[11px] text-muted-foreground">
            Pair kore select korun ({step} pcs per pair) — total {totalQty} pcs
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-extrabold",
            remaining === 0
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground border border-border",
          )}
        >
          {remaining === 0 ? "Ready ✓" : `${remaining} baki`}
        </span>
      </div>

      <div className="space-y-2">
        {colors.map((c) => {
          const q = value[c.id] || 0;
          return (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
            >
              <div className="flex items-center gap-2.5">
                {c.swatch_hex && (
                  <span
                    className="inline-block h-6 w-6 rounded-full border border-border"
                    style={{ backgroundColor: c.swatch_hex }}
                  />
                )}
                <span className="text-sm font-bold">{c.value}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQty(c.id, q - step)}
                  disabled={q <= 0}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Decrease ${c.value}`}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[2.5rem] text-center text-sm font-extrabold">
                  {q} pcs
                </span>
                <button
                  type="button"
                  onClick={() => setQty(c.id, q + step)}
                  disabled={remaining < step}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Increase ${c.value}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Build a friendly label like "Mix: Beige×2, Brown×2" from an allocation. */
export function buildMixLabel(
  colors: OptionValue[],
  allocation: Record<string, number>,
): string {
  const parts = colors
    .map((c) => ({ name: c.value, q: allocation[c.id] || 0 }))
    .filter((p) => p.q > 0)
    .map((p) => `${p.name}×${p.q}`);
  return parts.length ? `Mix: ${parts.join(", ")}` : "";
}
