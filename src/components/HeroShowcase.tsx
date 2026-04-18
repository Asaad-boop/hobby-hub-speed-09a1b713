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
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 text-[11px] md:gap-3 md:px-4 md:text-xs">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-300 md:px-2.5 md:py-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            LIVE
          </span>
          <div key={tickerIdx} className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden animate-fade-in">
            <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="truncate text-background/85">
              <span className="font-bold text-background">{ticker.name}</span>{" "}
              <span className="text-background/60">from {ticker.city}</span>{" "}
              <span className="hidden text-background/60 sm:inline">just bought </span>
              <span className="font-semibold text-background">{ticker.item}</span>{" "}
              <span className="text-background/50">· {ticker.time}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-4 py-6 md:grid-cols-12 md:gap-8 md:py-12">
        {/* Left: copy + countdown */}
        <div className="animate-fade-in md:col-span-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-3 py-1 text-[11px] font-semibold backdrop-blur md:text-xs">
            <Flame className="h-3 w-3 text-primary" />
            Flash Sale · Trending in Bangladesh
          </span>
          <h1 className="mt-3 text-[1.6rem] font-extrabold leading-[1.25] tracking-tight md:mt-4 md:text-[2.5rem] md:leading-[1.15]">
            শখের প্রোডাক্টের একমাত্র ঠিকানা
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              HobbyShop
            </span>
            <span className="ml-1">❤️</span>
          </h1>
          <p className="mt-2.5 max-w-md text-sm text-background/70 md:mt-3">
            Curated gadgets, decor & gifts shipped fast. Free delivery over ৳1500 — Cash on Delivery nationwide.
          </p>

          {/* Countdown */}
          <div className="mt-4 flex w-full max-w-sm items-stretch gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-2 backdrop-blur md:mt-5 md:w-auto md:max-w-none md:p-2.5">
            <div className="flex items-center gap-2 pl-0.5 pr-1 md:pl-1 md:pr-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                <Zap className="h-4 w-4" />
              </span>
              <div className="leading-tight">
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Deal ends in</div>
                <div className="text-[10px] text-background/60">Up to 60% OFF</div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-0.5 md:gap-1">
              {[
                { label: "HRS", v: h },
                { label: "MIN", v: m },
                { label: "SEC", v: s },
              ].map((u, i) => (
                <div key={u.label} className="flex items-center">
                  <div className="flex w-10 flex-col items-center rounded-lg bg-background/10 px-1 py-1.5 md:w-11">
                    <span className="font-mono text-base font-extrabold tabular-nums text-background">{u.v}</span>
                    <span className="text-[9px] font-bold tracking-wider text-background/60">{u.label}</span>
                  </div>
                  {i < 2 && <span className="px-0.5 text-base font-bold text-primary">:</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5 md:mt-5 md:gap-3">
            <a
              href="#trending"
              className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elevated)] transition hover:scale-[1.02] sm:flex-none md:px-7 md:py-3"
            >
              Shop Now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#trending"
              className="inline-flex flex-1 items-center justify-center rounded-full border border-background/30 bg-background/5 px-6 py-2.5 text-sm font-bold text-background backdrop-blur transition hover:bg-background/10 sm:flex-none md:px-7 md:py-3"
            >
              View Deals
            </a>
          </div>

          <div className="mt-5 grid max-w-md grid-cols-3 gap-3 border-t border-background/15 pt-3 md:mt-6 md:gap-6 md:pt-4">
            <div>
              <div className="text-lg font-extrabold md:text-xl">4.8★</div>
              <div className="mt-0.5 text-[9px] uppercase tracking-wider text-background/60 md:text-[10px]">12.4K Reviews</div>
            </div>
            <div>
              <div className="text-lg font-extrabold md:text-xl">50K+</div>
              <div className="mt-0.5 text-[9px] uppercase tracking-wider text-background/60 md:text-[10px]">Orders</div>
            </div>
            <div>
              <div className="text-lg font-extrabold md:text-xl">24h</div>
              <div className="mt-0.5 text-[9px] uppercase tracking-wider text-background/60 md:text-[10px]">Dispatch</div>
            </div>
          </div>
        </div>

        {/* Right: premium product showcase */}
        <div className="relative hidden md:col-span-7 md:block">
          <div className="relative mx-auto w-full max-w-2xl">
            {/* Ambient glows */}
            <div className="pointer-events-none absolute -left-10 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-primary/30 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 top-10 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />

            {/* Main stage */}
            <div className="relative aspect-[5/4] overflow-hidden rounded-[2.5rem] border border-background/15 bg-gradient-to-br from-background/[0.08] via-background/[0.04] to-transparent shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              {/* Subtle grid */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage:
                    "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />

              {/* Slides */}
              {slides.map((p, i) => (
                <div
                  key={p.id}
                  className={`absolute inset-0 transition-all duration-[900ms] ease-out ${
                    i === active
                      ? "opacity-100 scale-100"
                      : "pointer-events-none opacity-0 scale-110"
                  }`}
                >
                  {/* Spotlight behind product */}
                  <div className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-radial from-primary/40 via-primary/10 to-transparent blur-2xl" />
                  <img
                    src={p.image}
                    alt={p.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                  {/* Vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-foreground/30" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />
                </div>
              ))}

              {/* Top floating chips */}
              <div className="absolute inset-x-5 top-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-lg">
                  <Truck className="h-3 w-3" /> Free Delivery
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-background/25 bg-background/15 px-3 py-1.5 text-[11px] font-bold text-background backdrop-blur-md">
                  <Flame className="h-3 w-3 text-primary" /> Hot Pick
                </span>
              </div>

              {/* Nav arrows */}
              <button
                aria-label="Previous"
                onClick={() => setActive((i) => (i - 1 + slides.length) % slides.length)}
                className="group absolute left-4 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-background/20 bg-background/10 text-background backdrop-blur-md transition hover:bg-background hover:text-foreground hover:scale-110"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                aria-label="Next"
                onClick={() => setActive((i) => (i + 1) % slides.length)}
                className="group absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-background/20 bg-background/10 text-background backdrop-blur-md transition hover:bg-background hover:text-foreground hover:scale-110"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Progress dots */}
              <div className="absolute inset-x-0 top-[52%] hidden" />

              {/* Bottom info — glass card */}
              <div key={current.id} className="absolute inset-x-5 bottom-5 animate-fade-in">
                <div className="relative overflow-hidden rounded-2xl border border-background/20 bg-background/10 p-4 text-background shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
                  {/* Shine */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-background/60 to-transparent" />
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                          {current.category}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-background/15 px-2 py-0.5 text-[11px] font-semibold text-background backdrop-blur">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {current.rating}
                          <span className="text-background/60">({current.reviews})</span>
                        </span>
                      </div>
                      <h3 className="mt-2 truncate text-lg font-extrabold tracking-tight">{current.title}</h3>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-2xl font-extrabold text-background">৳{current.price}</span>
                        <span className="text-sm text-background/50 line-through">৳{current.oldPrice}</span>
                        <span className="rounded-md bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          -{Math.round((1 - current.price / current.oldPrice) * 100)}% OFF
                        </span>
                      </div>
                    </div>
                    <Link
                      to="/product/$id"
                      params={{ id: current.id }}
                      className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_10px_30px_-10px_var(--primary)] transition hover:scale-105"
                    >
                      View <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>

                  {/* Slide progress */}
                  <div className="mt-3 flex items-center gap-1.5">
                    {slides.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1 rounded-full transition-all duration-500 ${
                          i === active ? "w-8 bg-primary" : "w-3 bg-background/25"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="mt-5 flex items-center justify-center gap-2.5">
              {slides.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setActive(i)}
                  aria-label={`Show ${p.title}`}
                  className={`group relative h-16 w-16 overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                    i === active
                      ? "border-primary scale-110 shadow-[0_0_25px_-4px_var(--primary)]"
                      : "border-background/15 opacity-50 hover:opacity-100 hover:border-background/40"
                  }`}
                >
                  <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                  {i === active && (
                    <span className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
