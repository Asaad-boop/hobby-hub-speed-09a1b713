import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-lamp.jpg";
import { products } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { Lightbulb, Wrench, Home, Gift, Truck, ShieldCheck, RotateCcw, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HobbyShop — Upgrade Your Space Instantly" },
      { name: "description", content: "Trending gadgets, DIY kits, home decor and gifts. Cash on delivery across Bangladesh." },
      { property: "og:title", content: "HobbyShop — Upgrade Your Space Instantly" },
      { property: "og:description", content: "Unique gadgets & gifts at unbeatable prices." },
    ],
  }),
  component: Index,
});

const categories = [
  { name: "Gadgets", icon: Lightbulb },
  { name: "DIY Kits", icon: Wrench },
  { name: "Home Decor", icon: Home },
  { name: "Gifts", icon: Gift },
];

const trust = [
  { icon: Truck, label: "Cash on Delivery" },
  { icon: ShieldCheck, label: "100% Authentic" },
  { icon: RotateCcw, label: "Easy Return" },
  { icon: BadgeCheck, label: "Fast Delivery" },
];

function Index() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-20">
          <div className="animate-fade-in">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              🔥 Trending in Bangladesh
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Upgrade Your Space <span className="text-primary">Instantly</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground md:text-lg">
              Unique gadgets & gifts at unbeatable prices. Free delivery on orders over ৳1500.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#trending" className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-card)] transition hover:opacity-90">
                Shop Now
              </a>
              <a href="#trending" className="inline-flex items-center justify-center rounded-full border border-border bg-background px-7 py-3.5 text-sm font-bold text-foreground transition hover:border-foreground">
                View Deals
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
              <span>⭐ 4.8/5 from 12,400+ reviews</span>
              <span className="hidden md:inline">📦 50,000+ orders delivered</span>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-3xl shadow-[var(--shadow-elevated)]">
              <img src={heroImg} alt="Trending lifestyle gadgets" width={1600} height={1024} className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-6 text-2xl font-bold">Shop by Category</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {categories.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary hover:shadow-[var(--shadow-elevated)]"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold">{name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section id="trending" className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Trending Now</h2>
            <p className="text-sm text-muted-foreground">Most loved by our customers this week</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="bg-muted/40 py-10">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 md:grid-cols-4">
          {trust.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl bg-background p-4 shadow-[var(--shadow-card)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 text-center">
        <h3 className="text-xl font-bold">Ready to upgrade?</h3>
        <p className="mt-1 text-sm text-muted-foreground">Browse our trending picks and get them delivered fast.</p>
        <Link to="/product/$id" params={{ id: "crystal-lamp" }} className="mt-4 inline-flex rounded-full bg-primary px-7 py-3 text-sm font-bold text-primary-foreground hover:opacity-90">
          See Top Pick
        </Link>
      </div>
    </div>
  );
}
