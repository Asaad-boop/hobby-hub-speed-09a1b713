// Mock data system for HobbyShop OPS
// Pure TypeScript — no network. Used by the Zustand store.

export type OrderStatus =
  | "new"
  | "confirmed"
  | "packaging"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type Courier = "Pathao" | "Steadfast" | "RedX" | "Paperfly" | "eCourier";

export type ProductCategory = "Jewelry" | "Gift" | "Perfume" | "Lamp" | "Selfcare";

export type MockProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  image: string;
};

export type MockCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  totalOrders: number;
  totalSpent: number;
};

export type MockOrderItem = {
  productId: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type MockOrder = {
  id: string;
  createdAt: string; // ISO
  customerId: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  items: MockOrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  courier: Courier;
  paymentMethod: "COD" | "bKash" | "Nagad" | "Card";
  fraudScore: number; // 0-100
};

// ---------- Products ----------
export const MOCK_PRODUCTS: MockProduct[] = [
  { id: "p_jw_01", name: "Gold-Plated Heart Pendant", category: "Jewelry", price: 1290, stock: 32, image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=200&h=200&fit=crop" },
  { id: "p_jw_02", name: "Pearl Drop Earrings", category: "Jewelry", price: 890, stock: 18, image: "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=200&h=200&fit=crop" },
  { id: "p_gf_01", name: "Surprise Gift Box (Couple)", category: "Gift", price: 1590, stock: 12, image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&h=200&fit=crop" },
  { id: "p_gf_02", name: "Personalized Photo Frame", category: "Gift", price: 690, stock: 45, image: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=200&h=200&fit=crop" },
  { id: "p_pf_01", name: "Oud Royale Attar 12ml", category: "Perfume", price: 1190, stock: 24, image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&h=200&fit=crop" },
  { id: "p_lm_01", name: "Aurora Bedside Lamp", category: "Lamp", price: 1890, stock: 9, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=200&h=200&fit=crop" },
  { id: "p_lm_02", name: "Galaxy Star Projector", category: "Lamp", price: 1450, stock: 21, image: "https://images.unsplash.com/photo-1565636192335-bf6a3a3c9e3a?w=200&h=200&fit=crop" },
  { id: "p_sc_01", name: "Vitamin C Glow Serum", category: "Selfcare", price: 790, stock: 56, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop" },
];

// ---------- Customers ----------
export const MOCK_CUSTOMERS: MockCustomer[] = [
  { id: "c_01", name: "Rakib Hossain", phone: "01711000001", email: "rakib@example.com", city: "Dhaka", totalOrders: 4, totalSpent: 5680 },
  { id: "c_02", name: "Sumaiya Akter", phone: "01711000002", email: "sumaiya@example.com", city: "Chattogram", totalOrders: 2, totalSpent: 2380 },
  { id: "c_03", name: "Tanvir Ahmed", phone: "01711000003", email: "tanvir@example.com", city: "Sylhet", totalOrders: 7, totalSpent: 11890 },
  { id: "c_04", name: "Nusrat Jahan", phone: "01711000004", email: "nusrat@example.com", city: "Dhaka", totalOrders: 1, totalSpent: 690 },
  { id: "c_05", name: "Mehedi Hasan", phone: "01711000005", email: "mehedi@example.com", city: "Khulna", totalOrders: 3, totalSpent: 4170 },
  { id: "c_06", name: "Farzana Rahman", phone: "01711000006", email: "farzana@example.com", city: "Dhaka", totalOrders: 5, totalSpent: 7820 },
  { id: "c_07", name: "Imran Khan", phone: "01711000007", email: "imran@example.com", city: "Rajshahi", totalOrders: 2, totalSpent: 2980 },
  { id: "c_08", name: "Sadia Islam", phone: "01711000008", email: "sadia@example.com", city: "Dhaka", totalOrders: 6, totalSpent: 9450 },
  { id: "c_09", name: "Arif Chowdhury", phone: "01711000009", email: "arif@example.com", city: "Barishal", totalOrders: 1, totalSpent: 1290 },
  { id: "c_10", name: "Mahbuba Sultana", phone: "01711000010", email: "mahbuba@example.com", city: "Dhaka", totalOrders: 8, totalSpent: 13890 },
];

// ---------- Helpers ----------
const STATUSES: OrderStatus[] = [
  "new", "new", "new",
  "confirmed", "confirmed",
  "packaging",
  "ready_to_ship",
  "shipped", "shipped",
  "delivered", "delivered", "delivered",
  "cancelled",
  "returned",
  "new",
];
const COURIERS: Courier[] = ["Pathao", "Steadfast", "RedX", "Paperfly", "eCourier"];
const PAY: MockOrder["paymentMethod"][] = ["COD", "COD", "COD", "bKash", "Nagad", "Card"];
const ADDRESSES = [
  "House 12, Road 5, Dhanmondi",
  "Flat B3, Lane 8, Banani",
  "House 47, Road 11, Uttara Sector 4",
  "Plot 22, Block C, Bashundhara R/A",
  "House 9, Road 3, Mirpur DOHS",
];

// ---------- Orders ----------
export const MOCK_ORDERS: MockOrder[] = Array.from({ length: 15 }, (_, i) => {
  const customer = MOCK_CUSTOMERS[i % MOCK_CUSTOMERS.length];
  const itemsCount = (i % 3) + 1;
  const items: MockOrderItem[] = Array.from({ length: itemsCount }, (_, j) => {
    const p = MOCK_PRODUCTS[(i + j) % MOCK_PRODUCTS.length];
    const qty = (j % 2) + 1;
    return {
      productId: p.id,
      name: p.name,
      image: p.image,
      quantity: qty,
      unitPrice: p.price,
      lineTotal: p.price * qty,
    };
  });
  const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
  const shippingFee = customer.city === "Dhaka" ? 60 : 120;
  const discount = i % 4 === 0 ? 100 : 0;
  const total = subtotal + shippingFee - discount;

  // Vary createdAt across the last ~10 days
  const created = new Date();
  created.setHours(created.getHours() - i * 14);

  return {
    id: `ORD-${(1000 + i).toString()}`,
    createdAt: created.toISOString(),
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    shippingAddress: ADDRESSES[i % ADDRESSES.length],
    shippingCity: customer.city,
    items,
    subtotal,
    shippingFee,
    discount,
    total,
    status: STATUSES[i % STATUSES.length],
    courier: COURIERS[i % COURIERS.length],
    paymentMethod: PAY[i % PAY.length],
    fraudScore: Math.floor(((i * 37 + 13) % 100)), // deterministic spread 0-99
  };
});
