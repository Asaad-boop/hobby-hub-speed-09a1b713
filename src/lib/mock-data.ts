// Mock data for BrandOMS — Bangladesh E-Commerce Order Management System.
// Pure TypeScript. All data is dummy.

export type OrderStatus = "Pending" | "Confirmed" | "Shipped" | "Delivered" | "Cancelled";

export type PaymentMethod = "COD" | "bKash" | "Nagad" | "Card";

export type CourierName = "Pathao" | "Steadfast" | "RedX" | "eCourier" | "Paperfly" | "Sundarban";

export type ProductCategory = "Jewelry" | "Gift" | "Perfume" | "Lamp" | "Selfcare";

export const DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Khulna",
  "Rajshahi",
  "Sylhet",
  "Barishal",
  "Rangpur",
  "Mymensingh",
] as const;
export type District = (typeof DIVISIONS)[number];

export type CourierOption = {
  name: CourierName;
  coverage: string;
  rate: number;
};

export const COURIERS: CourierOption[] = [
  { name: "Pathao", coverage: "Inside Dhaka", rate: 60 },
  { name: "Steadfast", coverage: "Nationwide", rate: 120 },
  { name: "RedX", coverage: "Inside Dhaka", rate: 65 },
  { name: "eCourier", coverage: "Nationwide", rate: 80 },
  { name: "Paperfly", coverage: "Nationwide", rate: 70 },
  { name: "Sundarban", coverage: "Nationwide", rate: 90 },
];

export type Product = {
  sku: string;
  name: string;
  category: ProductCategory;
  stock: number;
  initialStock: number;
  price: number;
  description?: string;
};

export type OrderItem = {
  sku: string;
  name: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  district: District;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  paymentMethod: PaymentMethod;
  courier: CourierName;
  trackingNumber?: string;
  status: OrderStatus;
  fraudScore: number;
  fraudReasons: string[];
  createdAt: string; // ISO
};

export type Customer = {
  phone: string;
  name: string;
  totalOrders: number;
  delivered: number;
  cancelled: number;
  returned: number;
  fraudScore: number;
  isBlacklisted: boolean;
  accountAgeDays: number;
  note?: string;
};

// ---------------- Products (Florencia brand) ----------------
export const MOCK_PRODUCTS: Product[] = [
  { sku: "FLR-JW-001", name: "Gold-Plated Heart Pendant", category: "Jewelry", stock: 32, initialStock: 50, price: 1290, description: "Hypoallergenic, 18k gold plated." },
  { sku: "FLR-JW-002", name: "Pearl Drop Earrings", category: "Jewelry", stock: 8, initialStock: 40, price: 890, description: "Freshwater pearls." },
  { sku: "FLR-GF-001", name: "Couple Surprise Gift Box", category: "Gift", stock: 12, initialStock: 30, price: 1590, description: "Curated couple gift set." },
  { sku: "FLR-GF-002", name: "Personalized Photo Frame", category: "Gift", stock: 0, initialStock: 25, price: 690 },
  { sku: "FLR-PF-001", name: "Oud Royale Attar 12ml", category: "Perfume", stock: 24, initialStock: 60, price: 1190 },
  { sku: "FLR-LM-001", name: "Aurora Bedside Lamp", category: "Lamp", stock: 6, initialStock: 35, price: 1890 },
  { sku: "FLR-LM-002", name: "Galaxy Star Projector", category: "Lamp", stock: 21, initialStock: 40, price: 1450 },
  { sku: "FLR-SC-001", name: "Vitamin C Glow Serum", category: "Selfcare", stock: 56, initialStock: 80, price: 790 },
];

// ---------------- Customers (10, 1 blacklisted) ----------------
export const MOCK_CUSTOMERS: Customer[] = [
  { phone: "01711000001", name: "Rakib Hossain", totalOrders: 5, delivered: 5, cancelled: 0, returned: 0, fraudScore: 8, isBlacklisted: false, accountAgeDays: 220 },
  { phone: "01711000002", name: "Sumaiya Akter", totalOrders: 2, delivered: 1, cancelled: 1, returned: 0, fraudScore: 28, isBlacklisted: false, accountAgeDays: 95 },
  { phone: "01711000003", name: "Tanvir Ahmed", totalOrders: 7, delivered: 6, cancelled: 1, returned: 0, fraudScore: 18, isBlacklisted: false, accountAgeDays: 410 },
  { phone: "01711000004", name: "Nusrat Jahan", totalOrders: 1, delivered: 0, cancelled: 0, returned: 0, fraudScore: 42, isBlacklisted: false, accountAgeDays: 3 },
  { phone: "01711000005", name: "Mehedi Hasan", totalOrders: 3, delivered: 2, cancelled: 1, returned: 0, fraudScore: 22, isBlacklisted: false, accountAgeDays: 180 },
  { phone: "01711000006", name: "Farzana Rahman", totalOrders: 5, delivered: 4, cancelled: 1, returned: 0, fraudScore: 25, isBlacklisted: false, accountAgeDays: 260 },
  { phone: "01711000007", name: "Imran Khan", totalOrders: 4, delivered: 1, cancelled: 3, returned: 0, fraudScore: 65, isBlacklisted: false, accountAgeDays: 40, note: "Repeated cancellations — confirm before ship." },
  { phone: "01711000008", name: "Sadia Islam", totalOrders: 6, delivered: 6, cancelled: 0, returned: 0, fraudScore: 6, isBlacklisted: false, accountAgeDays: 320 },
  { phone: "01711000009", name: "Arif Chowdhury", totalOrders: 1, delivered: 0, cancelled: 0, returned: 0, fraudScore: 35, isBlacklisted: false, accountAgeDays: 5 },
  { phone: "01711000099", name: "Suspicious User", totalOrders: 9, delivered: 1, cancelled: 5, returned: 3, fraudScore: 92, isBlacklisted: true, accountAgeDays: 14, note: "Blacklisted: refused parcels + fake address." },
];

// ---------------- Orders (15) ----------------
const STATUS_CYCLE: OrderStatus[] = [
  "Pending", "Pending", "Pending", "Confirmed", "Confirmed",
  "Shipped", "Shipped", "Shipped", "Delivered", "Delivered",
  "Delivered", "Cancelled", "Pending", "Confirmed", "Shipped",
];

const ADDRESSES = [
  "House 12, Road 5, Dhanmondi",
  "Flat B3, Lane 8, Banani",
  "House 47, Road 11, Uttara Sector 4",
  "Plot 22, Block C, Bashundhara R/A",
  "House 9, Road 3, Mirpur DOHS",
  "1st Floor, GEC Circle, Chattogram",
  "Zindabazar Main Road, Sylhet",
];

const DISTRICT_BY_INDEX: District[] = [
  "Dhaka", "Dhaka", "Dhaka", "Chattogram", "Sylhet",
  "Dhaka", "Khulna", "Dhaka", "Dhaka", "Rajshahi",
  "Dhaka", "Dhaka", "Barishal", "Dhaka", "Mymensingh",
];

const PAYMENT_CYCLE: PaymentMethod[] = ["COD", "COD", "COD", "bKash", "Nagad", "Card"];
const COURIER_CYCLE: CourierName[] = ["Pathao", "Steadfast", "RedX", "eCourier", "Paperfly", "Sundarban"];

function makeReasons(score: number, age: number, cancelled: number): string[] {
  const r: string[] = [];
  if (cancelled >= 3) r.push(`${cancelled} previous cancellations`);
  if (age < 7) r.push(`New number registered ${age} day(s) ago`);
  if (score >= 70) r.push("Multiple suspicious patterns detected");
  if (score >= 30 && r.length === 0) r.push("Mixed delivery history");
  return r;
}

export const MOCK_ORDERS: Order[] = Array.from({ length: 15 }, (_, i) => {
  const customer = MOCK_CUSTOMERS[i % MOCK_CUSTOMERS.length];
  const itemsCount = (i % 3) + 1;
  const items: OrderItem[] = Array.from({ length: itemsCount }, (_, j) => {
    const p = MOCK_PRODUCTS[(i + j) % MOCK_PRODUCTS.length];
    const qty = (j % 2) + 1;
    return { sku: p.sku, name: p.name, quantity: qty, price: p.price };
  });
  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
  const district = DISTRICT_BY_INDEX[i];
  const courier = COURIER_CYCLE[i % COURIER_CYCLE.length];
  const courierRate = COURIERS.find((c) => c.name === courier)!.rate;
  const deliveryCharge = district === "Dhaka" ? courierRate : Math.max(courierRate, 80);
  const total = subtotal + deliveryCharge;
  const status = STATUS_CYCLE[i];

  const created = new Date();
  created.setHours(created.getHours() - i * 9);

  const reasons = makeReasons(customer.fraudScore, customer.accountAgeDays, customer.cancelled);

  return {
    id: `FLR-${(1001 + i).toString()}`,
    customerName: customer.name,
    phone: customer.phone,
    address: ADDRESSES[i % ADDRESSES.length],
    district,
    items,
    subtotal,
    deliveryCharge,
    total,
    paymentMethod: PAYMENT_CYCLE[i % PAYMENT_CYCLE.length],
    courier,
    trackingNumber: status === "Shipped" || status === "Delivered" ? `TRK${100000 + i * 137}` : undefined,
    status,
    fraudScore: customer.fraudScore,
    fraudReasons: reasons,
    createdAt: created.toISOString(),
  };
});

// ---------------- Helpers ----------------
export function fraudLabel(score: number, blacklisted = false): "SAFE" | "MODERATE RISK" | "HIGH RISK" | "BLACKLISTED" {
  if (blacklisted) return "BLACKLISTED";
  if (score < 30) return "SAFE";
  if (score < 70) return "MODERATE RISK";
  return "HIGH RISK";
}

export function fraudBadgeClasses(score: number, blacklisted = false): string {
  const label = fraudLabel(score, blacklisted);
  if (label === "SAFE") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (label === "MODERATE RISK") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

export function statusBadgeClasses(s: OrderStatus): string {
  switch (s) {
    case "Pending": return "bg-amber-50 text-amber-700 ring-amber-200";
    case "Confirmed": return "bg-blue-50 text-blue-700 ring-blue-200";
    case "Shipped": return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "Delivered": return "bg-teal-50 text-teal-700 ring-teal-200";
    case "Cancelled": return "bg-rose-50 text-rose-700 ring-rose-200";
  }
}

export function formatBDT(n: number): string {
  return "৳" + new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(Math.round(n));
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

export function stockStatus(stock: number, initial: number): { label: "In Stock" | "Low Stock" | "Out of Stock"; tone: string; barColor: string; pct: number } {
  const pct = initial > 0 ? Math.min(100, Math.round((stock / initial) * 100)) : 0;
  if (stock === 0) return { label: "Out of Stock", tone: "bg-rose-50 text-rose-700 ring-rose-200", barColor: "bg-rose-500", pct };
  if (pct < 20) return { label: "Low Stock", tone: "bg-rose-50 text-rose-700 ring-rose-200", barColor: "bg-rose-500", pct };
  if (pct <= 50) return { label: "Low Stock", tone: "bg-amber-50 text-amber-700 ring-amber-200", barColor: "bg-amber-500", pct };
  return { label: "In Stock", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200", barColor: "bg-[#1D9E75]", pct };
}
