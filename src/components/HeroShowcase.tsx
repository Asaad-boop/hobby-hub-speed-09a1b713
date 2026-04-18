import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, Flame, ShoppingBag, Star, Truck, Zap } from "lucide-react";
import { products } from "@/lib/products";

const orderTicker = [
  { name: "Rahim", city: "Dhaka", item: "Sunset Crystal LED Lamp", time: "2 min ago" },
  { name: "Ayesha", city: "Chattogram", item: "Magnetic Wireless Charger", time: "5 min ago" },
  { name: "Tanvir", city: "Sylhet", item: "Boom Mini Bluetooth Speaker", time: "8 min ago" },
  { name: "Nusrat", city: "Khulna", item: "Wooden Mechanical DIY Kit", time: "11 min ago" },
  { name: "Sabbir", city: "Rajshahi", item: "Sunset Crystal LED Lamp", time: "14 min ago" },
];

function useCountdown(targetMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, targetMs - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return {
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
  };
}

export default function HeroShowcase() {
  const slides = products;
  const [active, setActive] = useState(0);
  const [tickerIdx, setTickerIdx] = useState(0);

  // Target: 18 hours from first mount (stable)
  const target = useMemo(() => Date.now() + 18 * 3_600_000, []);
  const { h, m, s } = useCountdown(target);

  // Auto-rotate slides
  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  // Rotate ticker
  useEffect(() => {
    const id = setInterval(() => setTickerIdx((i) => (i + 1) % orderTicker.length), 3500);
    return () => clearInterval(id);
  }, []);

  const current = slides[active];
  const ticker = orderTicker[tickerIdx];

  return (
    <section className="relative overflow-hidden bg-foreground text-background">
      {/* Glow blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />

      {/* Live order ticker — top */}
      <div className="relative z-10 border-b border-background/10 bg-background/5 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 font-bold text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            LIVE
          </span>
          <div key={tickerIdx} className="flex flex-1 items-center gap-1.5 overflow-hidden animate-fade-in">
            <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="truncate text-background/85">
              <span className="font-bold text-background">{ticker.name}</span>{" "}
              <span className="text-background/60">from {ticker.city} just bought</span>{" "}
              <span className="font-semibold text-background">{ticker.item}</span>{" "}
              <span className="text-background/50">· {ticker.time}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 md:grid-cols-12 md:py-20">
        {/* Left: copy + countdown */}
        <div className="animate-fade-in md:col-span-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Flame className="h-3 w-3 text-primary" />
            Flash Sale · Trending in Bangladesh
          </span>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Upgrade Your <br className="hidden md:block" />
            Space{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Instantly.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-base text-background/70">
            Curated gadgets, decor & gifts shipped fast. Free delivery over ৳1500 — Cash on Delivery nationwide.
          </p>

          {/* Countdown */}
          <div className="mt-6 inline-flex items-stretch gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-3 backdrop-blur">
            <div className="flex items-center gap-2 pl-1 pr-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                <Zap className="h-4 w-4" />
              </span>
              <div className="leading-tight">
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Deal ends in</div>
                <div className="text-[10px] text-background/60">Up to 60% OFF</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[
                { label: "HRS", v: h },
                { label: "MIN", v: m },
                { label: "SEC", v: s },
              ].map((u, i) => (
                <div key={u.label} className="flex items-center">
                  <div className="flex w-11 flex-col items-center rounded-lg bg-background/10 px-1 py-1.5">
                    <span className="font-mono text-base font-extrabold tabular-nums text-background">{u.v}</span>
                    <span className="text-[9px] font-bold tracking-wider text-background/60">{u.label}</span>
                  </div>
                  {i < 2 && <span className="px-0.5 text-base font-bold text-primary">:</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#trending"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] transition hover:scale-[1.02]"
            >
              Shop Now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#trending"
              className="inline-flex items-center justify-center rounded-full border border-background/30 bg-background/5 px-7 py-3.5 text-sm font-bold text-background backdrop-blur transition hover:bg-background/10"
            >
              View Deals
            </a>
          </div>

          <div className="mt-8 grid max-w-md grid-cols-3 gap-6 border-t border-background/15 pt-5">
            <div>
              <div className="text-xl font-extrabold">4.8★</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-background/60">12.4K Reviews</div>
            </div>
            <div>
              <div className="text-xl font-extrabold">50K+</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-background/60">Orders Delivered</div>
            </div>
            <div>
              <div className="text-xl font-extrabold">24h</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-background/60">Fast Dispatch</div>
            </div>
          </div>
        </div>

        {/* Right: product carousel */}
        <div className="relative md:col-span-7">
          <div className="relative mx-auto aspect-[4/3] w-full max-w-2xl">
            {/* Glow */}
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/40 to-primary/0 blur-3xl" />

            {/* Stage */}
            <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-background/10 bg-gradient-to-br from-background/5 to-background/0 shadow-[var(--shadow-elevated)] backdrop-blur">
              {slides.map((p, i) => (
                <div
                  key={p.id}
                  className={`absolute inset-0 transition-all duration-700 ${
                    i === active ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-105"
                  }`}
                >
                  <img
                    src={p.image}
                    alt={p.title}
                    className="h-full w-full object-cover"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                </div>
              ))}

              {/* Product info card overlay */}
              <div key={current.id} className="absolute inset-x-4 bottom-4 animate-fade-in md:inset-x-6 md:bottom-6">
                <div className="flex items-end justify-between gap-3 rounded-2xl border border-background/15 bg-background/95 p-3 text-foreground shadow-[var(--shadow-elevated)] backdrop-blur md:p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {current.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                        <Star className="h-3 w-3 fill-amber-500" /> {current.rating}
                        <span className="text-muted-foreground">({current.reviews})</span>
                      </span>
                    </div>
                    <h3 className="mt-1 truncate text-sm font-bold md:text-base">{current.title}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-base font-extrabold text-primary md:text-lg">৳{current.price}</span>
                      <span className="text-xs text-muted-foreground line-through">৳{current.oldPrice}</span>
                      <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                        -{Math.round((1 - current.price / current.oldPrice) * 100)}%
                      </span>
                    </div>
                  </div>
                  <Link
                    to="/product/$id"
                    params={{ id: current.id }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-md transition hover:scale-105"
                  >
                    View <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute left-3 top-3 hidden rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-md md:inline-flex md:items-center md:gap-1">
                <Truck className="h-3 w-3" /> Free Delivery
              </div>

              {/* Nav arrows */}
              <button
                aria-label="Previous"
                onClick={() => setActive((i) => (i - 1 + slides.length) % slides.length)}
                className="absolute left-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-background/90 p-2 text-foreground shadow-md transition hover:scale-110 md:inline-flex"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                aria-label="Next"
                onClick={() => setActive((i) => (i + 1) % slides.length)}
                className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-background/90 p-2 text-foreground shadow-md transition hover:scale-110 md:inline-flex"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Thumbnails */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {slides.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setActive(i)}
                  aria-label={`Show ${p.title}`}
                  className={`group relative h-14 w-14 overflow-hidden rounded-xl border-2 transition-all ${
                    i === active
                      ? "border-primary scale-110 shadow-[0_0_20px_-4px_var(--primary)]"
                      : "border-background/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
