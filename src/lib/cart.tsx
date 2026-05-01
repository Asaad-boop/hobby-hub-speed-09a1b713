import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from "react";
import type { Product } from "./products";
import { fbTrack, META_CURRENCY } from "./meta-pixel";
import { clarityEvent, clarityTag, clarityUpgrade } from "./clarity";
import { trackAddToCart } from "./analytics-events";

export type CartItem = {
  product: Product;
  qty: number;
  /** Optional product_variants.id when the product has variants */
  variantId?: string | null;
  /** Frozen human label e.g. "Red / Small" */
  variantLabel?: string | null;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  open: boolean;
  setOpen: (o: boolean) => void;
  add: (
    p: Product,
    qty?: number,
    opts?: { silent?: boolean; variantId?: string | null; variantLabel?: string | null },
  ) => void;
  remove: (lineKey: string) => void;
  setQty: (lineKey: string, qty: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

/** Stable key for a cart line — same product + variant combine, different variants are separate. */
export function cartLineKey(item: CartItem): string {
  return `${item.product.id}::${item.variantId ?? ""}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  const add = useCallback<CartCtx["add"]>((p, qty = 1, opts) => {
    const variantId = opts?.variantId ?? null;
    const variantLabel = opts?.variantLabel ?? null;
    setItems((cur) => {
      const found = cur.find(
        (i) => i.product.id === p.id && (i.variantId ?? null) === variantId,
      );
      if (found) {
        return cur.map((i) =>
          i.product.id === p.id && (i.variantId ?? null) === variantId
            ? { ...i, qty: i.qty + qty }
            : i,
        );
      }
      return [...cur, { product: p, qty, variantId, variantLabel }];
    });
    if (!opts?.silent) setOpen(true);

    // Meta Pixel: AddToCart
    fbTrack("AddToCart", {
      content_ids: [p.id],
      content_name: p.title,
      content_type: "product",
      contents: [{ id: p.id, quantity: qty, item_price: p.price }],
      value: p.price * qty,
      currency: META_CURRENCY,
    });
    // Clarity: mark as a high-intent session and timeline-tag the action.
    clarityEvent("add_to_cart");
    clarityTag("has_cart", "true");
    clarityTag("last_added_product", p.title);
    clarityUpgrade("add_to_cart");
    // GA4-style server log for funnel + traffic-source attribution.
    trackAddToCart({
      id: p.id,
      title: p.title,
      price: p.price,
      quantity: qty,
      variant: variantLabel,
    });
  }, []);

  const remove = useCallback((lineKey: string) => {
    setItems((cur) => cur.filter((i) => cartLineKey(i) !== lineKey));
  }, []);

  const setQty = useCallback((lineKey: string, qty: number) => {
    setItems((cur) =>
      cur.map((i) => (cartLineKey(i) === lineKey ? { ...i, qty: Math.max(1, qty) } : i)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartCtx>(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + i.qty * i.product.price, 0);
    return { items, count, total, open, setOpen, add, remove, setQty, clear };
  }, [items, open, add, remove, setQty, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
