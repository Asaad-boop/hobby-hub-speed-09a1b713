import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-lamp.jpg";
import { products } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { LayoutGrid, ChefHat, Lamp, Gift, Wrench, ToyBrick, Sparkles, Cpu, Truck, ShieldCheck, RotateCcw, BadgeCheck, ArrowRight } from "lucide-react";

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
  { name: "All Product", icon: LayoutGrid, count: "500+", tone: "from-foreground to-foreground/70" },
  { name: "Kitchen & Home Essentials", icon: ChefHat, count: "120+", tone: "from-orange-500 to-red-500" },
  { name: "Home Decor & Lighting", icon: Lamp, count: "85+", tone: "from-amber-400 to-pink-500" },
  { name: "Gift Items", icon: Gift, count: "60+", tone: "from-rose-500 to-primary" },
  { name: "DIY & Hobby Kits", icon: Wrench, count: "45+", tone: "from-emerald-500 to-teal-600" },
  { name: "Kids & Toys", icon: ToyBrick, count: "70+", tone: "from-sky-400 to-indigo-500" },
  { name: "Daily Use Smart Products", icon: Sparkles, count: "90+", tone: "from-violet-500 to-fuchsia-500" },
  { name: "Gadgets & Tech", icon: Cpu, count: "110+", tone: "from-slate-700 to-primary" },
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
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:grid-cols-12 md:py-24">
          <div className="animate-fade-in md:col-span-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <span className="flex h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              New Drop · Trending in Bangladesh
            </span>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
              Upgrade Your <br className="hidden md:block" />
              Space <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Instantly.</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-background/70 md:text-lg">
              Curated gadgets, decor & gifts shipped fast. Free delivery on orders over ৳1500 — Cash on Delivery available nationwide.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#trending" className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] transition hover:scale-[1.02] hover:opacity-95">
                Shop Now
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a href="#trending" className="inline-flex items-center justify-center rounded-full border border-background/30 bg-background/5 px-8 py-4 text-sm font-bold text-background backdrop-blur transition hover:bg-background/10">
                View Deals
              </a>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-background/15 pt-6">
              <div>
                <div className="text-2xl font-extrabold">4.8★</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-background/60">12.4K Reviews</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold">50K+</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-background/60">Orders Delivered</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold">24h</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-background/60">Fast Dispatch</div>
              </div>
            </div>
          </div>

          <div className="relative md:col-span-6">
            <div className="relative mx-auto aspect-square max-w-lg">
              <div className="absolute inset-6 rounded-full bg-gradient-to-br from-primary/40 to-primary/0 blur-2xl" />
              <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-background/10 shadow-[var(--shadow-elevated)]">
                <img src={heroImg} alt="Trending lifestyle gadgets" width={1600} height={1600} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
              </div>
              {/* Floating badges */}
              <div className="absolute -left-4 top-8 hidden animate-fade-in rounded-2xl bg-background/95 p-3 text-foreground shadow-[var(--shadow-elevated)] backdrop-blur md:block">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">🚚</span>
                  <div>
                    <div className="text-xs font-bold">Free Delivery</div>
                    <div className="text-[10px] text-muted-foreground">Over ৳1500</div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-3 bottom-10 hidden animate-fade-in rounded-2xl bg-background/95 p-3 text-foreground shadow-[var(--shadow-elevated)] backdrop-blur md:block">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">💵</span>
                  <div>
                    <div className="text-xs font-bold">Cash on Delivery</div>
                    <div className="text-[10px] text-muted-foreground">Pay at door</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-3 left-1/2 hidden -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-[var(--shadow-elevated)] md:block">
                ⚡ Up to 60% OFF
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        <div className="mb-5 flex items-end justify-between gap-4 md:mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> Browse Collections
            </span>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight md:text-2xl">
              Shop by <span className="text-primary">Category</span>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">Find exactly what you need across our curated collections</p>
          </div>
          <a href="#trending" className="hidden items-center gap-1 text-xs font-semibold text-primary hover:underline md:inline-flex">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 sm:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map(({ name, icon: Icon, count, tone }) => (
            <button
              key={name}
              className="group relative w-[44vw] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-[var(--shadow-elevated)]"
            >
              <div
                className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${tone} opacity-10 blur-2xl`}
              />
              <div className="relative flex items-start justify-between gap-2">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-md`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                  {count}
                </span>
              </div>
              <div className="relative mt-3">
                <h3 className="text-xs font-bold leading-tight text-foreground">{name}</h3>
              </div>
            </button>
          ))}
        </div>

        {/* Tablet & Desktop: grid */}
        <div className="hidden grid-cols-3 gap-3 sm:grid lg:grid-cols-4">
          {categories.map(({ name, icon: Icon, count, tone }) => (
            <button
              key={name}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-elevated)]"
            >
              <div
                className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${tone} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-30`}
              />
              <div className="relative flex items-start justify-between gap-2">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {count}
                </span>
              </div>
              <div className="relative mt-3">
                <h3 className="text-sm font-bold leading-tight text-foreground">{name}</h3>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition-all duration-300 group-hover:opacity-100">
                  Shop now <ArrowRight className="h-3 w-3" />
                </span>
              </div>
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
