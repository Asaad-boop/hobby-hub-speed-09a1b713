import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowDown, ArrowUp, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

type Movement = {
  id: string;
  delta: number;
  stock_before: number;
  stock_after: number;
  reason: string;
  note: string | null;
  user_id: string;
  created_at: string;
};

export function StockHistoryDrawer({
  open,
  onOpenChange,
  productId,
  productTitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string | null;
  productTitle: string | null;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["stock_movements", productId],
    queryFn: async () => {
      if (!productId) return { movements: [] as Movement[], names: new Map<string, string | null>() };
      const { data: moves, error } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const list = (moves ?? []) as Movement[];
      const userIds = Array.from(new Set(list.map((m) => m.user_id)));
      const names = new Map<string, string | null>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        (profiles ?? []).forEach((p) => names.set(p.id, p.display_name));
      }
      return { movements: list, names };
    },
    enabled: !!productId && open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Stock history
          </SheetTitle>
          <SheetDescription className="line-clamp-2">{productTitle ?? "—"}</SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.movements.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No stock movements recorded yet for this product.
            </div>
          ) : (
            <ul className="space-y-3">
              {data.movements.map((m) => {
                const isIncrease = m.delta > 0;
                const adminName = data.names.get(m.user_id) ?? m.user_id.slice(0, 8) + "…";
                return (
                  <li
                    key={m.id}
                    className="flex gap-3 rounded-lg border border-border bg-card p-3 text-sm"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isIncrease
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {isIncrease ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold">
                          {isIncrease ? "+" : ""}
                          {m.delta} units
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(m.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {m.reason}
                        </Badge>
                        <span>
                          {m.stock_before} → {m.stock_after}
                        </span>
                        <span>•</span>
                        <span className="truncate">by {adminName}</span>
                      </div>
                      {m.note && (
                        <p className="mt-1.5 line-clamp-2 text-xs italic text-muted-foreground">
                          “{m.note}”
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
