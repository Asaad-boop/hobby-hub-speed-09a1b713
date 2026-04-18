import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from "react";
import type { Product } from "./products";

type WishlistCtx = {
  ids: string[];
  count: number;
  has: (id: string) => boolean;
  toggle: (p: Product) => boolean; // returns new state (true = added)
  add: (p: Product) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const Ctx = createContext<WishlistCtx | null>(null);
const STORAGE_KEY = "hobbyshop:wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount (client only)
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setIds(parsed.filter((x): x is string => typeof x === "string"));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }, [ids, hydrated]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const parsed = e.newValue ? JSON.parse(e.newValue) : [];
        if (Array.isArray(parsed)) setIds(parsed);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const add = useCallback((p: Product) => {
    setIds((cur) => (cur.includes(p.id) ? cur : [p.id, ...cur]));
  }, []);
  const remove = useCallback((id: string) => {
    setIds((cur) => cur.filter((x) => x !== id));
  }, []);
  const toggle = useCallback((p: Product) => {
    let nowAdded = false;
    setIds((cur) => {
      if (cur.includes(p.id)) {
        nowAdded = false;
        return cur.filter((x) => x !== p.id);
      }
      nowAdded = true;
      return [p.id, ...cur];
    });
    return nowAdded;
  }, []);
  const clear = useCallback(() => setIds([]), []);

  const value = useMemo<WishlistCtx>(
    () => ({ ids, count: ids.length, has, toggle, add, remove, clear }),
    [ids, has, toggle, add, remove, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWishlist must be used within WishlistProvider");
  return c;
}
