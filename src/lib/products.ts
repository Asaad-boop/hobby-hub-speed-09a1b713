import lamp from "@/assets/p-lamp.jpg";
import charger from "@/assets/p-charger.jpg";
import speaker from "@/assets/p-speaker.jpg";
import diy from "@/assets/p-diy.jpg";

export type Product = {
  id: string;
  title: string;
  price: number;
  oldPrice: number;
  image: string;
  rating: number;
  reviews: number;
  stock: number;
  category: string;
  benefits: string[];
  description: string;
};

export const products: Product[] = [
  {
    id: "crystal-lamp",
    title: "Sunset Crystal LED Lamp",
    price: 1290,
    oldPrice: 1990,
    image: lamp,
    rating: 4.8,
    reviews: 1240,
    stock: 7,
    category: "Home Decor",
    benefits: ["Warm ambient light", "USB-C rechargeable", "Touch control", "8h battery"],
    description:
      "A premium crystal LED lamp that turns any room into a cozy retreat. Perfect for bedrooms, desks and gifting.",
  },
  {
    id: "magsafe-charger",
    title: "Magnetic Wireless Charger 15W",
    price: 890,
    oldPrice: 1490,
    image: charger,
    rating: 4.7,
    reviews: 832,
    stock: 12,
    category: "Gadgets",
    benefits: ["15W fast charge", "MagSafe compatible", "Anti-slip base", "Cable included"],
    description: "Snap-on magnetic charging for the cleanest desk setup. Works with most modern phones.",
  },
  {
    id: "mini-speaker",
    title: "Boom Mini Bluetooth Speaker",
    price: 1490,
    oldPrice: 2290,
    image: speaker,
    rating: 4.6,
    reviews: 510,
    stock: 9,
    category: "Gadgets",
    benefits: ["360° sound", "12h playtime", "IPX5 waterproof", "Built-in mic"],
    description: "Pocket-sized speaker with surprisingly big sound. Bring it anywhere.",
  },
  {
    id: "diy-kit",
    title: "Wooden Mechanical DIY Kit",
    price: 1990,
    oldPrice: 2990,
    image: diy,
    rating: 4.9,
    reviews: 312,
    stock: 5,
    category: "DIY Kits",
    benefits: ["No glue required", "Step-by-step manual", "200+ pieces", "Great gift"],
    description: "Build a working mechanical model with your own hands. Hours of focused fun.",
  },
];

export const getProduct = (id: string) => products.find((p) => p.id === id);
