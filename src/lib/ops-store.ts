import { create } from "zustand";

export type OpsNavKey = "dashboard" | "orders" | "inventory" | "courier" | "reports";

type OpsState = {
  active: OpsNavKey;
  setActive: (key: OpsNavKey) => void;
};

export const useOpsStore = create<OpsState>((set) => ({
  active: "orders",
  setActive: (key) => set({ active: key }),
}));
