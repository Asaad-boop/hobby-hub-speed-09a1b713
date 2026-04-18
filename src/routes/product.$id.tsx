import { createFileRoute, useNavigate, notFound, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { getProduct, products, newArrivals, testimonials } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import ProductCard from "@/components/ProductCard";
import ReviewModal, { type NewReview } from "@/components/ReviewModal";
import {
  Star,
  Truck,
  ShieldCheck,
  BadgeCheck,
  Check,
  Zap,
  ShoppingBag,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  Phone,
  ChevronDown,
  Share2,
  Clock,
  Users,
  Flame,
  Gift,
  Sparkles,
  ThumbsUp,
  Camera,
  MessageSquare,
} from "lucide-react";
import avatar1 from "@/assets/avatar-1.jpg";
import avatar2 from "@/assets/avatar-2.jpg";
import avatar3 from "@/assets/avatar-3.jpg";
import avatar4 from "@/assets/avatar-4.jpg";
import review1 from "@/assets/review-1.jpg";
import review2 from "@/assets/review-2.jpg";
import review3 from "@/assets/review-3.jpg";
import review4 from "@/assets/review-4.jpg";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const product = getProduct(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.title} — HobbyShop` },
          { name: "description", content: loaderData.product.description },
          { property: "og:title", content: `${loaderData.product.title} — HobbyShop` },
          { property: "og:description", content: loaderData.product.description },
          { property: "og:image", content: loaderData.product.image },
        ]
      : [],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="p-10 text-center">
      <p>Product not found.</p>
      <Link to="/" className="mt-4 inline-block text-primary underline">Back home</Link>
    </div>
  ),
});

function CountdownTimer() {
  const [time, setTime] = useState({ h: 5, m: 59, s: 59 });
  useEffect(() => {
    const t = setInterval(() => {
      setTime((p) => {
        let { h, m, s } = p;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 5; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    <div className="flex items-center gap-1.5 font-mono text-sm font-bold">
      <span className="rounded-md bg-foreground px-2 py-1 text-background">{pad(time.h)}</span>
      <span>:</span>
      <span className="rounded-md bg-foreground px-2 py-1 text-background">{pad(time.m)}</span>
      <span>:</span>
      <span className="rounded-md bg-foreground px-2 py-1 text-background">{pad(time.s)}</span>
    </div>
  );
}

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { add } = useCart();
  const { has: wishHas, toggle: wishToggle } = useWishlist();
  const navigate = useNavigate();
  const [activeImg, setActiveImg] = useState(product.image);
  const [qty, setQty] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "ship">("desc");
  const allOthers = [...products, ...newArrivals].filter((p) => p.id !== product.id);
  const [bundle, setBundle] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { [product.id]: true };
    allOthers.slice(0, 2).forEach((b) => (init[b.id] = true));
    return init;
  });

  const off = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
  const saved = (product.oldPrice - product.price) * qty;
  const bundleItems = useMemo(() => [product, ...allOthers.slice(0, 2)], [product]);
  const bundleTotal = bundleItems.filter((b) => bundle[b.id]).reduce((s, b) => s + b.price, 0);
  const bundleOriginal = bundleItems.filter((b) => bundle[b.id]).reduce((s, b) => s + b.oldPrice, 0);
  const bundleSave = bundleOriginal - bundleTotal;
  const related = allOthers.slice(0, 4);
  const productReviews = testimonials.filter((t) => t.productId === product.id);
  const reviews = productReviews.length
    ? productReviews
    : testimonials.slice(0, 3).map((t) => ({ ...t, productId: product.id }));

  const handleBuyNow = () => {
    add(product, qty);
    navigate({ to: "/checkout" });
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: product.title, url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  };

  const faqs = [
    { q: "Delivery koto din e pabo?", a: "Dhaka te 1-2 din, Dhaka ar baire 2-4 din. Cash on Delivery available." },
    { q: "Product original to?", a: "Hae, 100% authentic. Quality issue thakle 7 din er moddhe return / exchange." },
    { q: "Warranty ache?", a: "Manufacturer warranty applicable. Detail er jonno description dekhun ba amader call korun." },
    { q: "Payment options ki ki?", a: "Cash on Delivery, bKash, Nagad, Rocket and card payment — sob support kori." },
  ];

  const wished = wishHas(product.id);
  const ratingBreakdown = [
    { stars: 5, pct: 78 },
    { stars: 4, pct: 16 },
    { stars: 3, pct: 4 },
    { stars: 2, pct: 1 },
    { stars: 1, pct: 1 },
  ];

  return (
    <div className="pb-28 md:pb-0">
      {/* Top urgency bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 px-4 py-2 text-xs font-semibold sm:text-sm">
          <Flame className="h-4 w-4 animate-pulse" />
          <span>Flash Sale ends in</span>
          <CountdownTimer />
          <span className="hidden sm:inline">• Free Delivery on orders over ৳1500</span>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-primary">Shop</Link>
          <span>/</span>
          <span className="text-foreground">{product.category}</span>
          <span>/</span>
          <span className="line-clamp-1 text-foreground">{product.title}</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 md:grid-cols-2 md:gap-12 md:py-10">
        {/* Gallery */}
        <div className="md:sticky md:top-24 md:self-start">
          <div className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-muted to-muted/50 shadow-[var(--shadow-card)]">
            <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground shadow-lg">
                <Flame className="h-3 w-3" /> -{off}% OFF
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-bold text-background shadow-lg">
                <BadgeCheck className="h-3 w-3" /> Best Seller
              </span>
            </div>
            <button
              onClick={() => wishToggle(product)}
              aria-label="Wishlist"
              className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/90 shadow-md backdrop-blur transition hover:scale-110"
            >
              <Heart className={`h-5 w-5 ${wished ? "fill-primary text-primary" : "text-foreground"}`} />
            </button>
            <button
              onClick={handleShare}
              aria-label="Share"
              className="absolute right-3 top-16 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/90 shadow-md backdrop-blur transition hover:scale-110"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <div
              className="touch-pan-y select-none"
              onTouchStart={(e) => ((e.currentTarget as any)._sx = e.touches[0].clientX)}
              onTouchEnd={(e) => {
                const sx = (e.currentTarget as any)._sx as number | undefined;
                if (sx == null) return;
                const dx = e.changedTouches[0].clientX - sx;
                if (Math.abs(dx) < 40) return;
                const imgs = product.gallery;
                const cur = imgs.indexOf(activeImg);
                const next = dx < 0 ? (cur + 1) % imgs.length : (cur - 1 + imgs.length) % imgs.length;
                setActiveImg(imgs[next]);
              }}
            >
              <img
                src={activeImg}
                alt={product.title}
                width={1024}
                height={1024}
                className="aspect-square h-full w-full object-cover transition duration-700 group-hover:scale-110"
                draggable={false}
              />
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1 text-[11px] font-semibold backdrop-blur">
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3 text-primary" /> 47 people viewing now</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {product.gallery.map((src: string, i: number) => (
              <button
                key={i}
                onClick={() => setActiveImg(src)}
                className={`overflow-hidden rounded-xl border-2 bg-muted transition ${
                  activeImg === src ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                }`}
              >
                <img src={src} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {product.category}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="h-3 w-3" /> Trending
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl lg:text-5xl">
            {product.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <span className="font-bold">{product.rating}</span>
            <Link to="/" hash="reviews" className="text-muted-foreground underline-offset-2 hover:underline">
              ({product.reviews} reviews)
            </Link>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <ThumbsUp className="h-3 w-3" /> 98% recommend
            </span>
          </div>

          {/* Price card */}
          <div className="mt-5 rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-extrabold text-foreground">৳{product.price}</span>
              <span className="text-xl text-muted-foreground line-through">৳{product.oldPrice}</span>
              <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-extrabold text-primary-foreground">-{off}%</span>
            </div>
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
              <Gift className="h-3.5 w-3.5" /> You save ৳{product.oldPrice - product.price}
            </p>
          </div>

          {/* Stock + urgency */}
          <div className="mt-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-extrabold text-primary">
                <Flame className="h-4 w-4 animate-pulse" /> Hurry! Only {product.stock} left
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" /> Order now for today's dispatch
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-background">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                style={{ width: `${Math.min(100, (product.stock / 25) * 100)}%` }}
              />
            </div>
          </div>

          {/* Benefits removed */}

          {/* Quantity */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className="text-sm font-bold">Quantity:</span>
            <div className="inline-flex items-center rounded-full border-2 border-border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="inline-flex h-11 w-11 items-center justify-center rounded-l-full hover:bg-muted"
                aria-label="Decrease"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-base font-extrabold">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                className="inline-flex h-11 w-11 items-center justify-center rounded-r-full hover:bg-muted"
                aria-label="Increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {qty > 1 && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                Subtotal ৳{product.price * qty} • Save ৳{saved}
              </span>
            )}
          </div>

          {/* CTA */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={() => add(product, qty)}
              className="group inline-flex items-center justify-center gap-2 rounded-full border-2 border-foreground bg-background px-4 py-4 text-sm font-extrabold text-foreground transition hover:bg-foreground hover:text-background"
            >
              <ShoppingBag className="h-4 w-4 transition group-hover:scale-110" /> Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-4 py-4 text-sm font-extrabold text-primary-foreground shadow-[var(--shadow-card)] transition hover:shadow-2xl"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <Zap className="h-4 w-4 fill-current" /> Buy Now — ৳{product.price * qty}
            </button>
          </div>

          {/* Help */}
          <a
            href="tel:+8801700000000"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-muted px-4 py-3 text-sm font-bold transition hover:bg-muted/70"
          >
            <Phone className="h-4 w-4 text-primary" /> Order by Call: 01700-000000
          </a>

          {/* Trust badges */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-border bg-card p-3 text-center">
              <Truck className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-[11px] font-bold">Cash on Delivery</p>
              <p className="text-[10px] text-muted-foreground">All over BD</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3 text-center">
              <RotateCcw className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-[11px] font-bold">7-Day Return</p>
              <p className="text-[10px] text-muted-foreground">Easy exchange</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3 text-center">
              <ShieldCheck className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-[11px] font-bold">100% Authentic</p>
              <p className="text-[10px] text-muted-foreground">Quality assured</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed details */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-3xl border border-border bg-card overflow-hidden">
          <div className="flex border-b border-border">
            {[
              { k: "desc", l: "Description" },
              { k: "specs", l: "What's Inside" },
              { k: "ship", l: "Shipping & Returns" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setActiveTab(t.k as any)}
                className={`flex-1 px-4 py-4 text-sm font-bold transition ${
                  activeTab === t.k ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>
          <div className="p-6 text-sm leading-relaxed text-muted-foreground">
            {activeTab === "desc" && <p>{product.description}</p>}
            {activeTab === "specs" && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {product.benefits.map((b: string) => (
                  <li key={b} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {b}</li>
                ))}
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Premium packaging</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> User manual included</li>
              </ul>
            )}
            {activeTab === "ship" && (
              <div className="space-y-2">
                <p>📦 <strong>Inside Dhaka:</strong> 1-2 days delivery (৳60)</p>
                <p>🚚 <strong>Outside Dhaka:</strong> 2-4 days delivery (৳120)</p>
                <p>💵 <strong>Cash on Delivery</strong> available all over Bangladesh.</p>
                <p>↩️ <strong>7-day easy return</strong> if product is defective or not as described.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Frequently Bought Together removed */}

      {/* Reviews */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold md:text-3xl">Customer Reviews</h2>
            <p className="mt-1 text-sm text-muted-foreground">Real photos and feedback from verified buyers</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full border-2 border-foreground px-4 py-2 text-xs font-bold transition hover:bg-foreground hover:text-background">
            <MessageSquare className="h-4 w-4" /> Write a review
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Summary */}
          <div className="rounded-3xl border-2 border-border bg-gradient-to-br from-primary/5 to-transparent p-6 md:col-span-1">
            <div className="flex items-baseline gap-2">
              <p className="text-5xl font-extrabold">{product.rating}</p>
              <p className="text-sm font-semibold text-muted-foreground">/ 5.0</p>
            </div>
            <div className="mt-1 flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-primary text-primary" />
              ))}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Based on {product.reviews.toLocaleString()} verified reviews</p>
            <div className="mt-5 space-y-2">
              {ratingBreakdown.map((r) => (
                <div key={r.stars} className="flex items-center gap-2 text-xs">
                  <span className="inline-flex w-8 items-center gap-0.5 font-bold">{r.stars}<Star className="h-3 w-3 fill-primary text-primary" /></span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all" style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="w-10 text-right font-semibold text-muted-foreground">{r.pct}%</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-primary/10 p-3">
              <ThumbsUp className="h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs font-bold text-primary">98% of customers recommend this product</p>
            </div>
          </div>

          {/* Reviews list */}
          <div className="grid gap-4 md:col-span-2">
            {/* Customer photo strip */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-sm font-bold">
                  <Camera className="h-4 w-4 text-primary" /> Customer photos (28)
                </p>
                <button className="text-xs font-semibold text-primary hover:underline">View all</button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[review1, review2, review3, review4].map((src, i) => (
                  <button key={i} className="group relative overflow-hidden rounded-xl border border-border">
                    <img src={src} alt="Customer photo" loading="lazy" width={512} height={512} className="aspect-square w-full object-cover transition group-hover:scale-110" />
                    <span className="absolute inset-0 bg-foreground/0 transition group-hover:bg-foreground/10" />
                  </button>
                ))}
              </div>
            </div>

            {reviews.slice(0, 4).map((r, i) => {
              const avatars = [avatar1, avatar2, avatar3, avatar4];
              const photos = [review1, review2, review3, review4];
              const dates = ["2 days ago", "1 week ago", "2 weeks ago", "1 month ago"];
              const helpful = [42, 28, 19, 11];
              return (
                <div key={i} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <img src={avatars[i % avatars.length]} alt={r.name} loading="lazy" width={48} height={48} className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-primary/20" />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{r.name}</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <BadgeCheck className="h-3 w-3" /> Verified Purchase
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.location} • {dates[i % dates.length]}</p>
                      <div className="mt-2 flex items-center gap-1 text-primary">
                        {Array.from({ length: r.rating }).map((_, j) => (
                          <Star key={j} className="h-4 w-4 fill-primary" />
                        ))}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">{r.text}</p>
                      {i < 2 && (
                        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {photos.slice(0, 2).map((src, j) => (
                            <img key={j} src={src} alt="Review photo" loading="lazy" width={512} height={512} className="aspect-square w-full rounded-lg border border-border object-cover" />
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                        <button className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 font-semibold transition hover:border-primary hover:text-primary">
                          <ThumbsUp className="h-3 w-3" /> Helpful ({helpful[i % helpful.length]})
                        </button>
                        <span>•</span>
                        <button className="font-semibold hover:text-primary">Reply</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <button className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-6 py-3 text-sm font-bold transition hover:border-primary hover:text-primary">
              Load more reviews <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-5 text-2xl font-extrabold md:text-3xl">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold transition hover:bg-muted/40"
              >
                {f.q}
                <ChevronDown className={`h-4 w-4 shrink-0 transition ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && <div className="border-t border-border px-5 py-4 text-sm text-muted-foreground">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Cross-sell */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-4 text-2xl font-extrabold md:text-3xl">You May Also Like</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Sticky mobile buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 shadow-2xl backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => wishToggle(product)}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-border"
            aria-label="Wishlist"
          >
            <Heart className={`h-5 w-5 ${wished ? "fill-primary text-primary" : ""}`} />
          </button>
          <button
            onClick={() => add(product, qty)}
            className="flex-1 rounded-full border-2 border-foreground py-3 text-sm font-extrabold"
          >
            Add to Cart
          </button>
          <button
            onClick={handleBuyNow}
            className="flex-[1.3] rounded-full bg-primary py-3 text-sm font-extrabold text-primary-foreground shadow-lg"
          >
            Buy ৳{product.price * qty}
          </button>
        </div>
      </div>
    </div>
  );
}
