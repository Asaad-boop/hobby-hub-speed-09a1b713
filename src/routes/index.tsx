import { createFileRoute, Link } from "@tanstack/react-router";
import { products, newArrivals, testimonials, getProduct } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import HeroShowcase from "@/components/HeroShowcase";
import WatchAndShop from "@/components/WatchAndShop";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { LayoutGrid, ChefHat, Lamp, Gift, Wrench, ToyBrick, Sparkles, Cpu, Truck, ShieldCheck, RotateCcw, BadgeCheck, ArrowRight, PackageOpen, Star, Quote, Search, Package } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

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
  const navigate = useNavigate();
  const [trackId, setTrackId] = useState("");
  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const id = trackId.trim();
    if (id.length >= 6) navigate({ to: "/track/$orderId", params: { orderId: id } });
    else navigate({ to: "/track" });
  };
  return (
    <div>
      {/* Hero */}
      <HeroShowcase />

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
        </div>

        {/* Mobile: 5 columns compact icon grid */}
        <div className="grid grid-cols-4 gap-2 sm:hidden">
          {categories.map(({ name, icon: Icon, tone }) => (
            <button
              key={name}
              className="group flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-center transition active:scale-95"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-md`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-foreground">
                {name}
              </span>
            </button>
          ))}
        </div>

        {/* Tablet & Desktop: compact grid */}
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

      {/* New Arrivals */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-12">
          <div className="mb-5 flex items-end justify-between gap-4 md:mb-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                <PackageOpen className="h-3 w-3" /> Just In
              </span>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight md:text-2xl">
                New <span className="text-primary">Arrivals</span>
              </h2>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                Fresh drops handpicked for you — limited stock available
              </p>
            </div>
            <a href="#trending" className="hidden items-center gap-1 text-xs font-semibold text-primary hover:underline md:inline-flex">
              See trending <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {newArrivals.map((p) => (
              <div key={p.id} className="relative">
                <span className="pointer-events-none absolute -top-2 right-3 z-10 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                  New
                </span>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Watch & Shop reels */}
      <WatchAndShop />

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

      {/* Track Order */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-14">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 md:p-10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Package className="h-3 w-3" /> Order Tracking
              </span>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight md:text-3xl">
                Track Your <span className="text-primary">Order</span> in Seconds
              </h2>
              <p className="mt-1.5 text-xs text-muted-foreground md:text-sm">
                Enter your Order ID below or verify with phone/email — no login needed.
              </p>
            </div>
            <form onSubmit={handleTrack} className="flex w-full gap-2 md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                  placeholder="Enter Order ID"
                  className="h-12 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm font-mono uppercase outline-none transition focus:border-primary"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-12 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-[var(--shadow-card)] transition hover:opacity-90 active:scale-95"
              >
                Track <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>


      <section className="mx-auto max-w-7xl px-4 py-10 md:py-14">
        <div className="mb-6 text-center md:mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Loved by Customers
          </span>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight md:text-2xl">
            Our <span className="text-primary">Customer Reviews</span>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground md:text-sm">
            Real feedback from thousands of happy shoppers across Bangladesh
          </p>
        </div>
        <Carousel opts={{ align: "start", loop: true }} className="w-full">
          <CarouselContent className="-ml-3 md:-ml-4">
            {testimonials.map((r, idx) => {
              const product = getProduct(r.productId);
              return (
                <CarouselItem key={idx} className="basis-full pl-3 sm:basis-1/2 md:pl-4 lg:basis-1/3">
                  <div className="relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
                    <Quote className="absolute right-4 top-4 h-8 w-8 text-primary/10" />
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-foreground">
                      "{r.text}"
                    </p>
                    {product && (
                      <Link
                        to="/product/$id"
                        params={{ id: product.id }}
                        className="mt-3 flex items-center gap-2 rounded-lg bg-muted/60 p-2 transition hover:bg-muted"
                      >
                        <img
                          src={product.image}
                          alt={product.title}
                          loading="lazy"
                          className="h-9 w-9 shrink-0 rounded-md object-cover"
                        />
                        <span className="line-clamp-1 text-[11px] font-semibold text-foreground">
                          {product.title}
                        </span>
                      </Link>
                    )}
                    <div className="mt-4 flex items-center gap-3 border-t border-border/60 pt-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground">
                        {r.name.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-bold text-foreground">{r.name}</p>
                          <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {r.location} · Verified Buyer
                        </p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4" />
          <CarouselNext className="hidden md:flex -right-4" />
        </Carousel>
      </section>
    </div>
  );
}
