import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Star, Truck, Zap } from "lucide-react";
import { useProducts, type Product } from "@/lib/products";
import { useSiteSettings } from "@/lib/site-settings";
import { cdnImage } from "@/lib/cdn-image";

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
  const { data: allProducts = [] } = useProducts();
  const { data: settings } = useSiteSettings();
  const slides: Product[] = useMemo(() => {
    const ids = settings?.hero_product_ids ?? [];
    if (ids.length) {
      const map = new Map(allProducts.map((p) => [p.id, p]));
      const picked = ids.map((id) => map.get(id)).filter((p): p is Product => !!p);
      if (picked.length) return picked;
    }
    return allProducts.slice(0, 4);
  }, [allProducts, settings?.hero_product_ids]);
  const [active, setActive] = useState(0);

  // Target: 18 hours from first mount (stable)
  const target = useMemo(() => Date.now() + 18 * 3_600_000, []);
  const { h, m, s } = useCountdown(target);

  // Auto-rotate slides
  useEffect(() => {
    if (slides.length === 0) return;
    const id = setInterval(() => setActive((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  const current: Product | undefined = slides[active];

  if (!current) return null;

  return (
    <section className="relative overflow-hidden bg-foreground text-background">
      {/* Glow blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-4 py-6 md:grid-cols-12 md:gap-8 md:py-12">
        {/* Left: copy + countdown */}
        <div className="animate-fade-in md:col-span-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-3 py-1 text-[11px] font-semibold backdrop-blur md:text-xs">
            <Flame className="h-3 w-3 text-primary" />
            {settings?.hero_badge ?? "Flash Sale · Trending in Bangladesh"}
          </span>
          <h1 className="mt-3 text-[1.6rem] font-extrabold leading-[1.25] tracking-tight md:mt-4 md:text-[2.5rem] md:leading-[1.15]">
            {settings?.hero_heading ?? "শখের প্রোডাক্টের একমাত্র ঠিকানা"}
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {settings?.hero_heading_highlight ?? "HobbyShop"}
            </span>
            <span className="ml-1">❤️</span>
          </h1>
          <p className="mt-2.5 max-w-md text-sm text-background/70 md:mt-3">
            {settings?.hero_subheading ?? "Curated gadgets, decor & gifts shipped fast. Free delivery over ৳1500 — Cash on Delivery nationwide."}
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

        </div>

        {/* Right: floating product orb display */}
        <div className="relative hidden md:col-span-7 md:block">
          <div className="relative mx-auto w-full max-w-2xl">
            {/* Ambient glows */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-3xl" />
            <div className="pointer-events-none absolute left-1/4 top-0 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />

            <div className="relative grid grid-cols-5 items-center gap-4">
              {/* Left: floating product orb */}
              <div className="relative col-span-3 aspect-square">
                {/* Concentric decorative rings */}
                <div className="absolute inset-0 rounded-full border border-background/10 animate-spin [animation-duration:40s]" />
                <div className="absolute inset-6 rounded-full border border-background/15 animate-spin [animation-duration:30s] [animation-direction:reverse]" />
                <div className="absolute inset-12 rounded-full border border-dashed border-background/20 animate-spin [animation-duration:20s]" />
                {/* Orbiting accent dots */}
                <div className="absolute inset-0 animate-spin [animation-duration:15s]">
                  <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
                </div>
                <div className="absolute inset-6 animate-spin [animation-duration:25s] [animation-direction:reverse]">
                  <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-background/60" />
                </div>

                {/* Product disc */}
                <div className="absolute inset-10 overflow-hidden rounded-full border-2 border-primary/40 bg-gradient-to-br from-background/15 to-background/0 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                  {slides.map((p, i) => (
                    <div
                      key={p.id}
                      className={`absolute inset-0 transition-all duration-[900ms] ease-out ${
                        i === active ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-110"
                      }`}
                    >
                      <img
                        src={cdnImage(p.image, 600)}
                        alt={p.title}
                        width={600}
                        height={600}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading={i === 0 ? "eager" : "lazy"}
                        decoding="async"
                        // @ts-expect-error - valid HTML attribute
                        fetchpriority={i === 0 ? "high" : "low"}
                      />

                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
                    </div>
                  ))}
                </div>

                {/* Floating badges around the orb */}
                <div className="absolute left-0 top-6 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-lg animate-fade-in">
                  <Truck className="h-3 w-3" /> Free Delivery
                </div>
                <div className="absolute right-2 top-16 inline-flex items-center gap-1.5 rounded-full border border-background/25 bg-background/15 px-3 py-1.5 text-[11px] font-bold text-background backdrop-blur-md animate-fade-in">
                  <Flame className="h-3 w-3 text-primary" /> Hot Pick
                </div>
                <div className="absolute -bottom-1 left-8 inline-flex items-center gap-1.5 rounded-full border border-background/20 bg-background/10 px-3 py-1.5 text-[11px] font-bold text-background backdrop-blur-md animate-fade-in">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {current.rating} ({current.reviews})
                </div>
              </div>

              {/* Right: info panel */}
              <div key={current.id} className="col-span-2 animate-fade-in">
                <div className="space-y-3">
                  <span className="inline-flex rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {current.category}
                  </span>
                  <h3 className="text-xl font-extrabold leading-tight tracking-tight text-background">
                    {current.title}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-background">৳{current.price}</span>
                    <span className="text-sm text-background/40 line-through">৳{current.oldPrice}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/90 px-2 py-0.5 text-[11px] font-bold text-white">
                    Save ৳{current.oldPrice - current.price} · -{Math.round((1 - current.price / current.oldPrice) * 100)}%
                  </span>

                  <div className="flex flex-col gap-2 pt-2">
                    <Link
                      to="/product/$id"
                      params={{ id: current.slug || current.id }}
                      className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_15px_35px_-10px_var(--primary)] transition hover:scale-[1.03]"
                    >
                      View Product <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <div className="flex items-center gap-2">
                      <button
                        aria-label="Previous"
                        onClick={() => setActive((i) => (i - 1 + slides.length) % slides.length)}
                        className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-background/20 bg-background/5 text-background backdrop-blur-md transition hover:bg-background/15"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        aria-label="Next"
                        onClick={() => setActive((i) => (i + 1) % slides.length)}
                        className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-background/20 bg-background/5 text-background backdrop-blur-md transition hover:bg-background/15"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Slide progress */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActive(i)}
                        aria-label={`Slide ${i + 1}`}
                        className={`h-1 rounded-full transition-all duration-500 ${
                          i === active ? "w-8 bg-primary" : "w-3 bg-background/25 hover:bg-background/50"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnail strip */}
            <div className="mt-6 flex items-center justify-center gap-3">
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
