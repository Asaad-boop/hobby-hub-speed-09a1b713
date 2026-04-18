import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from "react";
import type { Product } from "./products";

export type CartItem = { product: Product; qty: number };

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  open: boolean;
  setOpen: (o: boolean) => void;
  add: (p: Product, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  const add = useCallback((p: Product, qty = 1) => {
    setItems((cur) => {
      const found = cur.find((i) => i.product.id === p.id);
      if (found) return cur.map((i) => (i.product.id === p.id ? { ...i, qty: i.qty + qty } : i));
      return [...cur, { product: p, qty }];
    });
    setOpen(true);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((cur) => cur.filter((i) => i.product.id !== id));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((cur) =>
      cur.map((i) => (i.product.id === id ? { ...i, qty: Math.max(1, qty) } : i)),
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
