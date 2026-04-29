import { create } from "zustand";
import {
  MOCK_ORDERS,
  MOCK_PRODUCTS,
  MOCK_CUSTOMERS,
  type MockOrder,
  type MockProduct,
  type MockCustomer,
} from "./mock-data";

export type OpsNavKey = "dashboard" | "orders" | "inventory" | "courier" | "reports";
export type DataSource = "mock" | "live";

type OpsState = {
  active: OpsNavKey;
  setActive: (key: OpsNavKey) => void;

  dataSource: DataSource;
  setDataSource: (s: DataSource) => void;

  selectedOrderId: string | null;
  selectOrder: (id: string | null) => void;

  // Mock data — local state, mutable via actions
  orders: MockOrder[];
  products: MockProduct[];
  customers: MockCustomer[];
  updateOrderStatus: (id: string, status: MockOrder["status"]) => void;
};

export const useOpsStore = create<OpsState>((set) => ({
  active: "orders",
  setActive: (key) => set({ active: key }),

  dataSource: "mock",
  setDataSource: (s) => set({ dataSource: s }),

  selectedOrderId: MOCK_ORDERS[0]?.id ?? null,
  selectOrder: (id) => set({ selectedOrderId: id }),

  orders: MOCK_ORDERS,
  products: MOCK_PRODUCTS,
  customers: MOCK_CUSTOMERS,
  updateOrderStatus: (id, status) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? { ...o, status } : o)),
    })),
}));
