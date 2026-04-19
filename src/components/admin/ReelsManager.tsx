import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, ImageOff, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { VideoUploader } from "./VideoUploader";
import { useAdminProductList } from "./ProductPicker";
import type { ReelItem } from "@/lib/site-settings";

function uid() {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function ReelsManager({
  value,
  onChange,
  max = 10,
}: {
  value: ReelItem[];
  onChange: (reels: ReelItem[]) => void;
  max?: number;
}) {
  const { data: products = [] } = useAdminProductList();
  const productMap = useMemo(() => {
    const m = new Map<string, (typeof products)[number]>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const update = (idx: number, patch: Partial<ReelItem>) => {
    const next = value.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };
  const addReel = () => {
    if (value.length >= max) return;
    onChange([
      ...value,
      { id: uid(), video_url: "", caption: "", product_id: "" },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {value.length} / {max} reels
        </p>
        <Button type="button" size="sm" onClick={addReel} disabled={value.length >= max}>
          <Plus className="h-4 w-4" /> Add reel
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Koi reel add kora hoy ni. "Add reel" button click koro.
        </div>
      ) : (
        <ul className="space-y-3">
          {value.map((reel, idx) => {
            const product = reel.product_id ? productMap.get(reel.product_id) : undefined;
            return (
              <li
                key={reel.id}
                className="rounded-xl border border-border bg-background p-3"
              >
                <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
                  <div className="shrink-0">
                    <VideoUploader
                      value={reel.video_url}
                      onChange={(url) => update(idx, { video_url: url })}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Reel #{idx + 1}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => move(idx, -1)}
                          disabled={idx === 0}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => move(idx, 1)}
                          disabled={idx === value.length - 1}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => remove(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Caption
                      </Label>
                      <Input
                        value={reel.caption}
                        onChange={(e) => update(idx, { caption: e.target.value })}
                        placeholder="e.g. Cozy vibes only ✨"
                        className="mt-1 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Linked product
                      </Label>
                      <ProductSelect
                        value={reel.product_id}
                        onChange={(id) => update(idx, { product_id: id })}
                        products={products}
                      />
                      {product && (
                        <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-muted/30 p-1.5">
                          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-muted">
                            {product.image ? (
                              <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
                            ) : (
                              <ImageOff className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <p className="truncate text-xs font-medium">{product.title}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ProductSelect({
  value,
  onChange,
  products,
}: {
  value: string;
  onChange: (id: string) => void;
  products: { id: string; title: string; slug: string; image: string; price: number; is_active: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 50);
    return products
      .filter((p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
      .slice(0, 50);
  }, [products, query]);
  const selected = products.find((p) => p.id === value);

  return (
    <div className="relative mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm"
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {selected ? selected.title : "Select a product…"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover p-2 shadow-lg">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-8 pl-7 text-sm"
            />
          </div>
          <ul className="max-h-56 space-y-0.5 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="py-4 text-center text-xs text-muted-foreground">No matches</li>
            )}
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-2 rounded p-1.5 text-left transition hover:bg-muted"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                    {p.image ? (
                      <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                    ) : (
                      <ImageOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <span className="truncate text-sm">{p.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
