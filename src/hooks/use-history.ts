import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Undo/redo history hook with automatic deduping and a max stack size.
 * `set` pushes a new state to the past; `undo`/`redo` walk the stack.
 * `replace` updates the present without affecting history (used after server load).
 */
export function useHistory<T>(initial: T, opts: { maxSize?: number } = {}) {
  const max = opts.maxSize ?? 50;
  const [present, setPresent] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  const set = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setPresent((prev) => {
        const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
        if (Object.is(next, prev)) return prev;
        past.current.push(prev);
        if (past.current.length > max) past.current.shift();
        future.current = [];
        return next;
      });
      refresh();
    },
    [max],
  );

  /** Replace state without adding to history (e.g. after server load). */
  const replace = useCallback((value: T) => {
    setPresent(value);
    past.current = [];
    future.current = [];
    refresh();
  }, []);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    const prev = past.current.pop()!;
    setPresent((cur) => {
      future.current.push(cur);
      return prev;
    });
    refresh();
  }, []);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const next = future.current.pop()!;
    setPresent((cur) => {
      past.current.push(cur);
      return next;
    });
    refresh();
  }, []);

  return {
    state: present,
    set,
    replace,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}

/** Persist a value to localStorage with debounce; returns latest hydrated value once. */
export function useLocalDraft<T>(key: string, value: T, enabled: boolean, delay = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify({ at: Date.now(), value }));
      } catch {
        /* quota — ignore */
      }
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, value, enabled, delay]);
}

export function readLocalDraft<T>(key: string): { at: number; value: T } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as { at: number; value: T };
  } catch {
    return null;
  }
}

export function clearLocalDraft(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
