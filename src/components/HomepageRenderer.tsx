import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgeCheck,
  ChefHat,
  Cpu,
  Gift,
  Lamp,
  LayoutGrid,
  Loader2,
  Mail,
  Package,
  PackageOpen,
  Quote,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  ToyBrick,
  Truck,
  Wrench,
} from "lucide-react";
import HeroShowcase from "@/components/HeroShowcase";
import WatchAndShop from "@/components/WatchAndShop";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useProducts, testimonials, findTestimonialProduct, type Product } from "@/lib/products";
import { useSiteSettings, type HomepageSection } from "@/lib/site-settings";
import { lookupOrder } from "@/lib/order-lookup.functions";

const fallbackCategories = [
  { name: "All Product", icon: LayoutGrid, count: "500+", tone: "from-foreground to-foreground/70" },
  { name: "Kitchen & Home", icon: ChefHat, count: "120+", tone: "from-orange-500 to-red-500" },
  { name: "Decor & Lighting", icon: Lamp, count: "85+", tone: "from-amber-400 to-pink-500" },
  { name: "Gift Items", icon: Gift, count: "60+", tone: "from-rose-500 to-primary" },
  { name: "DIY & Hobby Kits", icon: Wrench, count: "45+", tone: "from-emerald-500 to-teal-600" },
  { name: "Kids & Toys", icon: ToyBrick, count: "70+", tone: "from-sky-400 to-indigo-500" },
  { name: "Smart Products", icon: Sparkles, count: "90+", tone: "from-violet-500 to-fuchsia-500" },
  { name: "Gadgets & Tech", icon: Cpu, count: "110+", tone: "from-slate-700 to-primary" },
];

const trustItems = [
  { icon: Truck, label: "Cash on Delivery" },
  { icon: ShieldCheck, label: "100% Authentic" },
  { icon: RotateCcw, label: "Easy Return" },
  { icon: BadgeCheck, label: "Fast Delivery" },
];

const badgeColorMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600",
  amber: "bg-amber-500/10 text-amber-600",
  rose: "bg-rose-500/10 text-rose-600",
  sky: "bg-sky-500/10 text-sky-600",
};

function cfg<T = unknown>(s: HomepageSection, key: string, fallback: T): T {
  const v = s.config?.[key];
  return (v === undefined || v === null ? fallback : v) as T;
}

export default function HomepageRenderer() {
  const { data: settings } = useSiteSettings();
  const sections = settings?.homepage_sections ?? [];
  return (
    <div>
      {sections
        .filter((s) => s.enabled)
        .map((s) => (
          <SectionWrapper key={s.id} section={s}>
            <SectionSwitcher section={s} />
          </SectionWrapper>
        ))}
    </div>
  );
}

function SectionWrapper({ section, children }: { section: HomepageSection; children: React.ReactNode }) {
  const padTop = Number(cfg(section, "pad_top", NaN));
  const padBottom = Number(cfg(section, "pad_bottom", NaN));
  const bgColor = cfg<string>(section, "bg_color", "");
  const hasStyle =
    !Number.isNaN(padTop) || !Number.isNaN(padBottom) || (bgColor && bgColor.trim().length > 0);
  if (!hasStyle) return <>{children}</>;
  const style: React.CSSProperties = {};
  if (!Number.isNaN(padTop)) style.paddingTop = `${padTop}px`;
  if (!Number.isNaN(padBottom)) style.paddingBottom = `${padBottom}px`;
  if (bgColor) style.backgroundColor = bgColor;
  return <div style={style}>{children}</div>;
}

function SectionSwitcher({ section }: { section: HomepageSection }) {
  switch (section.type) {
    case "hero":
      return <HeroShowcase />;
    case "banner":
      return <BannerSection section={section} />;
    case "categories":
      return <CategoriesSection section={section} />;
    case "products":
      return <ProductsSection section={section} />;
    case "reels":
      return <WatchAndShop />;
    case "rich_text":
      return <RichTextSection section={section} />;
    case "image_with_text":
      return <ImageWithTextSection section={section} />;
    case "category_grid":
      return <CategoryGridSection section={section} />;
    case "testimonials":
      return <TestimonialsSection section={section} />;
    case "newsletter":
      return <NewsletterSection section={section} />;
    case "countdown":
      return <CountdownSection section={section} />;
    case "trust_badges":
      return <TrustBadgesSection />;
    case "track_order":
      return <TrackOrderSection />;
    case "spacer":
      return <SpacerSection section={section} />;
    default:
      return null;
  }
}

/* ---------------- BANNER ---------------- */
function BannerSection({ section }: { section: HomepageSection }) {
  const { data: settings } = useSiteSettings();
  const url = cfg(section, "image_url", "") || settings?.homepage_banner_url || "";
  const link = cfg(section, "link", "") || settings?.homepage_banner_link || "";
  if (!url) return null;
  const inner = (
    <div className="overflow-hidden rounded-2xl shadow-[var(--shadow-card)]">
      <img src={url} alt="Promotional banner" className="h-auto w-full object-cover" loading="lazy" />
    </div>
  );
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 md:pt-8">
      {link ? (
        <a href={link} className="block transition hover:opacity-95">
          {inner}
        </a>
      ) : (
        inner
      )}
    </section>
  );
}

/* ---------------- CATEGORIES (icon cards) ---------------- */
function CategoriesSection({ section }: { section: HomepageSection }) {
  const heading = cfg(section, "heading", "Shop by Category");
  const subheading = cfg(section, "subheading", "Find exactly what you need across our curated collections");
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="mb-5 flex items-end justify-between gap-4 md:mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> Browse Collections
          </span>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight md:text-2xl">{heading}</h2>
          <p className="mt-1 text-xs text-muted-foreground md:text-sm">{subheading}</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:hidden">
        {fallbackCategories.map(({ name, icon: Icon, tone }) => (
          <button key={name} className="group flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-center transition active:scale-95">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-md`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-foreground">{name}</span>
          </button>
        ))}
      </div>
      <div className="hidden grid-cols-3 gap-3 sm:grid lg:grid-cols-4">
        {fallbackCategories.map(({ name, icon: Icon, count, tone }) => (
          <button
            key={name}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-elevated)]"
          >
            <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${tone} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-30`} />
            <div className="relative flex items-start justify-between gap-2">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{count}</span>
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
  );
}

/* ---------------- PRODUCTS GRID ---------------- */
function ProductsSection({ section }: { section: HomepageSection }) {
  const { data: allProducts = [], isLoading } = useProducts();
  const { data: settings } = useSiteSettings();
  const heading = cfg(section, "heading", "Products");
  const subheading = cfg(section, "subheading", "");
  const source = cfg(section, "source", "featured") as "featured" | "new_arrival" | "manual";
  const manualIds = cfg<string[]>(section, "product_ids", []);
  const columns = Number(cfg(section, "columns", 4));
  const badge = cfg(section, "badge", "");
  const badgeColor = cfg(section, "badge_color", "primary");

  const products = useMemo(() => {
    const map = new Map(allProducts.map((p) => [p.id, p]));
    if (source === "manual" && manualIds.length) {
      return manualIds.map((id) => map.get(id)).filter((p): p is Product => !!p).slice(0, 12);
    }
    if (source === "new_arrival") {
      const curated = (settings?.new_arrival_product_ids ?? []).map((id) => map.get(id)).filter((p): p is Product => !!p);
      if (curated.length) return curated.slice(0, 12);
      return allProducts.filter((p) => p.isNewArrival).slice(0, 8);
    }
    const curated = (settings?.featured_product_ids ?? []).map((id) => map.get(id)).filter((p): p is Product => !!p);
    if (curated.length) return curated.slice(0, 12);
    const f = allProducts.filter((p) => p.isFeatured);
    return (f.length ? f : allProducts).slice(0, 8);
  }, [allProducts, source, manualIds, settings]);

  const colClass =
    columns === 2 ? "md:grid-cols-2" : columns === 3 ? "md:grid-cols-3" : columns === 5 ? "md:grid-cols-5" : "md:grid-cols-4";

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-12">
        <div className="mb-5 flex items-end justify-between gap-4 md:mb-6">
          <div>
            {badge && (
              <span className={`inline-flex items-center gap-1.5 rounded-full ${badgeColorMap[badgeColor] ?? badgeColorMap.primary} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider`}>
                <PackageOpen className="h-3 w-3" /> {badge}
              </span>
            )}
            <h2 className="mt-2 text-xl font-extrabold tracking-tight md:text-2xl">{heading}</h2>
            {subheading && <p className="mt-1 text-xs text-muted-foreground md:text-sm">{subheading}</p>}
          </div>
        </div>
        <div className={`grid grid-cols-2 gap-4 ${colClass} md:gap-6`}>
          {isLoading
            ? Array.from({ length: columns }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}

/* ---------------- RICH TEXT ---------------- */
function RichTextSection({ section }: { section: HomepageSection }) {
  const heading = cfg(section, "heading", "");
  const body = cfg(section, "body", "");
  const align = cfg(section, "align", "center") as "left" | "center" | "right";
  const ctaLabel = cfg(section, "cta_label", "");
  const ctaLink = cfg(section, "cta_link", "");
  const background = cfg(section, "background", "muted") as "none" | "muted" | "primary";
  const bgClass = background === "primary" ? "bg-primary/5" : background === "muted" ? "bg-muted/40" : "";
  const alignClass = align === "left" ? "text-left items-start" : align === "right" ? "text-right items-end" : "text-center items-center";
  return (
    <section className={`${bgClass}`}>
      <div className={`mx-auto flex max-w-4xl flex-col gap-3 px-4 py-10 md:py-14 ${alignClass}`}>
        {heading && <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">{heading}</h2>}
        {body && <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{body}</p>}
        {ctaLabel && ctaLink && (
          <a href={ctaLink} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-md hover:opacity-90">
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </a>
        )}
      </div>
    </section>
  );
}

/* ---------------- IMAGE WITH TEXT ---------------- */
function ImageWithTextSection({ section }: { section: HomepageSection }) {
  const image = cfg(section, "image_url", "");
  const heading = cfg(section, "heading", "");
  const body = cfg(section, "body", "");
  const ctaLabel = cfg(section, "cta_label", "");
  const ctaLink = cfg(section, "cta_link", "");
  const position = cfg(section, "image_position", "left") as "left" | "right";
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-14">
      <div className={`grid items-center gap-6 md:gap-10 md:grid-cols-2 ${position === "right" ? "md:[&>*:first-child]:order-2" : ""}`}>
        <div className="overflow-hidden rounded-2xl bg-muted shadow-[var(--shadow-card)]">
          {image ? (
            <img src={image} alt={heading || "Feature"} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="aspect-[4/3] w-full" />
          )}
        </div>
        <div>
          {heading && <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">{heading}</h2>}
          {body && <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">{body}</p>}
          {ctaLabel && ctaLink && (
            <a href={ctaLink} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-md hover:opacity-90">
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CATEGORY IMAGE GRID ---------------- */
function CategoryGridSection({ section }: { section: HomepageSection }) {
  const heading = cfg(section, "heading", "Browse collections");
  const items = cfg<Array<{ image_url: string; label: string; link: string }>>(section, "items", []);
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-12">
      {heading && <h2 className="mb-5 text-xl font-extrabold tracking-tight md:text-2xl">{heading}</h2>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {items.map((it, i) => (
          <a key={i} href={it.link || "#"} className="group relative block overflow-hidden rounded-2xl">
            <div className="aspect-[4/5] w-full bg-muted">
              {it.image_url && (
                <img src={it.image_url} alt={it.label} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
              )}
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <span className="absolute bottom-3 left-3 right-3 text-base font-extrabold text-white drop-shadow">
              {it.label}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ---------------- TESTIMONIALS ---------------- */
function TestimonialsSection({ section }: { section: HomepageSection }) {
  const { data: allProducts = [] } = useProducts();
  const heading = cfg(section, "heading", "Customer Reviews");
  const subheading = cfg(section, "subheading", "Real feedback from thousands of happy shoppers");
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-14">
      <div className="mb-6 text-center md:mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
          <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Loved by Customers
        </span>
        <h2 className="mt-2 text-xl font-extrabold tracking-tight md:text-2xl">{heading}</h2>
        <p className="mt-1 text-xs text-muted-foreground md:text-sm">{subheading}</p>
      </div>
      <Carousel opts={{ align: "start", loop: true }} className="w-full">
        <CarouselContent className="-ml-3 md:-ml-4">
          {testimonials.map((r, idx) => {
            const product = findTestimonialProduct(r, allProducts);
            return (
              <CarouselItem key={idx} className="basis-full pl-3 sm:basis-1/2 md:pl-4 lg:basis-1/3">
                <div className="relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                  <Quote className="absolute right-4 top-4 h-8 w-8 text-primary/10" />
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-foreground">"{r.text}"</p>
                  {product && (
                    <Link to="/product/$id" params={{ id: product.id }} className="mt-3 flex items-center gap-2 rounded-lg bg-muted/60 p-2 hover:bg-muted">
                      <img src={product.image} alt={product.title} loading="lazy" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                      <span className="line-clamp-1 text-[11px] font-semibold text-foreground">{product.title}</span>
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
                      <p className="truncate text-[11px] text-muted-foreground">{r.location} · Verified Buyer</p>
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
  );
}

/* ---------------- NEWSLETTER ---------------- */
function NewsletterSection({ section }: { section: HomepageSection }) {
  const heading = cfg(section, "heading", "Get 10% off your first order");
  const subheading = cfg(section, "subheading", "Subscribe for exclusive offers and new drops.");
  const buttonLabel = cfg(section, "button_label", "Subscribe");
  const successMsg = cfg(section, "success_message", "Thanks! Check your inbox soon.");
  const [email, setEmail] = useState("");
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    toast.success(successMsg);
    setEmail("");
  };
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-14">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 md:p-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative grid items-center gap-5 md:grid-cols-[1fr_1.2fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Mail className="h-3 w-3" /> Newsletter
            </span>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight md:text-2xl">{heading}</h2>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">{subheading}</p>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
            <button type="submit" className="h-11 rounded-full bg-primary px-6 text-sm font-extrabold text-primary-foreground hover:opacity-90">
              {buttonLabel}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ---------------- COUNTDOWN ---------------- */
function CountdownSection({ section }: { section: HomepageSection }) {
  const heading = cfg(section, "heading", "Flash Sale ends in");
  const subheading = cfg(section, "subheading", "");
  const targetIso = cfg(section, "target_iso", new Date(Date.now() + 24 * 3_600_000).toISOString());
  const ctaLabel = cfg(section, "cta_label", "");
  const ctaLink = cfg(section, "cta_link", "");
  const target = useMemo(() => new Date(targetIso).getTime() || Date.now(), [targetIso]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const cells: Array<[string, number]> = [["Days", d], ["Hours", h], ["Min", m], ["Sec", s]];
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-primary-foreground md:p-10">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-5 text-center">
          <h2 className="text-xl font-extrabold tracking-tight md:text-3xl">{heading}</h2>
          {subheading && <p className="text-xs opacity-90 md:text-sm">{subheading}</p>}
          <div className="flex items-end gap-2 md:gap-4">
            {cells.map(([label, val]) => (
              <div key={label} className="flex flex-col items-center">
                <span className="rounded-xl bg-white/15 px-3 py-2 text-2xl font-extrabold tabular-nums backdrop-blur md:px-5 md:py-3 md:text-4xl">
                  {String(val).padStart(2, "0")}
                </span>
                <span className="mt-1 text-[10px] uppercase tracking-wider opacity-80 md:text-xs">{label}</span>
              </div>
            ))}
          </div>
          {ctaLabel && ctaLink && (
            <a href={ctaLink} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-extrabold text-primary shadow-md hover:opacity-95">
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- TRUST BADGES ---------------- */
function TrustBadgesSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 md:py-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {trustItems.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold md:text-sm">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- TRACK ORDER ---------------- */
function TrackOrderSection() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!q.trim()) {
      setErr("Enter Order ID, phone or email");
      return;
    }
    setLoading(true);
    try {
      const res = await lookupOrder({ data: { query: q.trim() } });
      if (!res.ok) {
        setErr(res.error);
        toast.error(res.error);
        return;
      }
      sessionStorage.setItem(`order:${res.order.id}`, JSON.stringify(res.order));
      navigate({ to: "/track/$orderId", params: { orderId: res.order.id } });
    } catch (e: any) {
      setErr(e?.message || "Lookup failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="mx-auto max-w-7xl px-4 py-4 md:py-8">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 md:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative grid items-center gap-3 md:gap-4 md:grid-cols-[1fr_1.3fr]">
          <div className="flex items-center gap-2.5 md:items-start md:gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md md:h-10 md:w-10 md:rounded-xl">
              <Package className="h-4 w-4 md:h-5 md:w-5" />
            </span>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary md:gap-1.5 md:px-2 md:text-[10px]">
                <Truck className="h-2.5 w-2.5 md:h-3 md:w-3" /> Live Tracking
              </span>
              <h2 className="text-base font-extrabold leading-tight tracking-tight md:mt-1 md:text-xl">
                Track Your <span className="text-primary">Order</span>
              </h2>
              <p className="hidden text-[11px] text-muted-foreground md:mt-0.5 md:block md:text-xs">
                Enter Order ID, phone, or email — whichever you remember.
              </p>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-1.5 md:space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setErr(""); }}
                  placeholder="Order ID, phone, or email"
                  className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary md:h-11"
                />
              </div>
              <button type="submit" disabled={loading} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-md hover:opacity-90 disabled:opacity-60 md:h-11">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Track <ArrowRight className="h-4 w-4" /></>)}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 px-1">
              {err ? <p className="text-[11px] font-semibold text-destructive">{err}</p> : <span />}
              <Link to="/track" className="ml-auto text-[11px] font-semibold text-muted-foreground hover:text-primary">
                Open full tracker →
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ---------------- SPACER ---------------- */
function SpacerSection({ section }: { section: HomepageSection }) {
  const size = cfg(section, "size", "md") as "sm" | "md" | "lg";
  const h = size === "sm" ? "h-6" : size === "lg" ? "h-20" : "h-12";
  return <div className={h} aria-hidden />;
}
