import { create } from "zustand";
import {
  MOCK_ORDERS, MOCK_PRODUCTS, MOCK_CUSTOMERS,
  type Order, type Product, type Customer, type OrderStatus,
} from "./mock-data";

export type OpsNavKey = "dashboard" | "orders" | "inventory" | "courier" | "reports" | "settings";

type OpsState = {
  active: OpsNavKey;
  setActive: (k: OpsNavKey) => void;

  orders: Order[];
  products: Product[];
  customers: Customer[];

  selectedOrderIds: string[];
  toggleSelectOrder: (id: string) => void;
  setSelectedOrderIds: (ids: string[]) => void;
  clearSelection: () => void;

  updateOrderStatus: (id: string, status: OrderStatus) => void;
  bulkAssignCourier: (ids: string[], courier: string, trackingPrefix?: string) => void;
  setOrderTracking: (id: string, trackingNumber: string, courier?: string) => void;
  addOrder: (o: Order) => void;

  addProduct: (p: Product) => void;
  updateProduct: (sku: string, patch: Partial<Product>) => void;
  adjustStock: (sku: string, delta: number) => void;
};

export const useOpsStore = create<OpsState>((set) => ({
  active: "dashboard",
  setActive: (k) => set({ active: k }),

  orders: MOCK_ORDERS,
  products: MOCK_PRODUCTS,
  customers: MOCK_CUSTOMERS,

  selectedOrderIds: [],
  toggleSelectOrder: (id) =>
    set((s) => ({
      selectedOrderIds: s.selectedOrderIds.includes(id)
        ? s.selectedOrderIds.filter((x) => x !== id)
        : [...s.selectedOrderIds, id],
    })),
  setSelectedOrderIds: (ids) => set({ selectedOrderIds: ids }),
  clearSelection: () => set({ selectedOrderIds: [] }),

  updateOrderStatus: (id, status) =>
    set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)) })),

  bulkAssignCourier: (ids, courier, trackingPrefix = "TRK") =>
    set((s) => ({
      orders: s.orders.map((o) =>
        ids.includes(o.id)
          ? {
              ...o,
              courier: courier as Order["courier"],
              status: "Shipped",
              trackingNumber: o.trackingNumber ?? `${trackingPrefix}${Math.floor(Math.random() * 9_000_000) + 1_000_000}`,
            }
          : o,
      ),
    })),

  setOrderTracking: (id, trackingNumber, courier) =>
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === id
          ? {
              ...o,
              trackingNumber,
              courier: (courier as Order["courier"]) ?? o.courier,
              status: "Shipped",
            }
          : o,
      ),
    })),

  addOrder: (o) => set((s) => ({ orders: [o, ...s.orders] })),

  addProduct: (p) => set((s) => ({ products: [p, ...s.products] })),
  updateProduct: (sku, patch) =>
    set((s) => ({ products: s.products.map((p) => (p.sku === sku ? { ...p, ...patch } : p)) })),
  adjustStock: (sku, delta) =>
    set((s) => ({
      products: s.products.map((p) =>
        p.sku === sku ? { ...p, stock: Math.max(0, p.stock + delta) } : p,
      ),
    })),
}));
