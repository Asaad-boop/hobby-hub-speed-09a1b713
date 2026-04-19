import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, X, Plus, Search, Loader2, ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ProductLite = {
  id: string;
  title: string;
  slug: string;
  image: string;
  price: number;
  is_active: boolean;
};

export function useAdminProductList() {
  return useQuery({
    queryKey: ["admin", "products", "lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,title,slug,image,price,is_active")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductLite[];
    },
    staleTime: 60_000,
  });
}

export default function ProductPicker({
  value,
  onChange,
  max,
  emptyHint = "Koi product select kora hoy ni.",
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  emptyHint?: string;
}) {
  const { data: products = [], isLoading } = useAdminProductList();
  const [query, setQuery] = useState("");

  const map = useMemo(() => {
    const m = new Map<string, ProductLite>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const selected = value.map((id) => map.get(id)).filter(Boolean) as ProductLite[];
  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (value.includes(p.id)) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
    });
  }, [products, value, query]);

  const add = (id: string) => {
    if (max && value.length >= max) return;
    onChange([...value, id]);
  };
  const remove = (id: string) => onChange(value.filter((x) => x !== id));
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...value];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Selected */}
      <div className="rounded-xl border border-border bg-muted/20 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Selected ({selected.length}{max ? ` / ${max}` : ""})
          </p>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] font-semibold text-destructive hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
        {selected.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{emptyHint}</p>
        ) : (
          <ul className="space-y-2">
            {selected.map((p, idx) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-background p-2"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {p.image ? (
                    <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">৳{Number(p.price).toLocaleString()}</p>
                </div>
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
                    disabled={idx === selected.length - 1}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => remove(p.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Available */}
      <div className="rounded-xl border border-border bg-background p-3">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="h-8 pl-8 text-sm"
          />
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : available.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No more products to add.</p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {available.map((p) => {
              const disabled = max ? value.length >= max : false;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => add(p.id)}
                    className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {p.image ? (
                        <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                      ) : (
                        <ImageOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {p.title}{" "}
                        {!p.is_active && (
                          <span className="ml-1 text-[10px] text-amber-600">(inactive)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">৳{Number(p.price).toLocaleString()}</p>
                    </div>
                    <Plus className="h-4 w-4 shrink-0 text-primary" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
