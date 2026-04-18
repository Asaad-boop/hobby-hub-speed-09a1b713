import { createFileRoute, useNavigate, notFound, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { getProduct, products, newArrivals, testimonials } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import ProductCard from "@/components/ProductCard";
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
} from "lucide-react";

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

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { add } = useCart();
  const { has: wishHas, toggle: wishToggle } = useWishlist();
  const navigate = useNavigate();
  const [activeImg, setActiveImg] = useState(product.image);
  const [qty, setQty] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
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
      else {
        await navigator.clipboard.writeText(url);
      }
    } catch {}
  };

  const faqs = [
    { q: "Delivery koto din e pabo?", a: "Dhaka te 1-2 din, Dhaka ar baire 2-4 din. Cash on Delivery available." },
    { q: "Product original to?", a: "Hae, 100% authentic. Quality issue thakle 7 din er moddhe return / exchange." },
    { q: "Warranty ache?", a: "Manufacturer warranty applicable. Detail er jonno description dekhun ba amader call korun." },
    { q: "Payment options ki ki?", a: "Cash on Delivery, bKash, Nagad, Rocket and card payment — sob support kori." },
  ];

  const wished = wishHas(product.id);

  return (
    <div className="pb-28 md:pb-0">
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

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-6 md:grid-cols-2 md:py-10">
        {/* Gallery */}
        <div className="md:sticky md:top-24 md:self-start">
          <div className="group relative overflow-hidden rounded-3xl border border-border bg-muted">
            <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-lg">
              -{off}% OFF
            </span>
            <button
              onClick={() => wishToggle(product)}
              aria-label="Wishlist"
              className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur transition hover:scale-110"
            >
              <Heart className={`h-5 w-5 ${wished ? "fill-primary text-primary" : "text-foreground"}`} />
            </button>
            <button
              onClick={handleShare}
              aria-label="Share"
              className="absolute right-3 top-16 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur transition hover:scale-110"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <img
              src={activeImg}
              alt={product.title}
              width={1024}
              height={1024}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[product.image, product.image, product.image, product.image].map((src, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(src)}
                className={`overflow-hidden rounded-xl border-2 bg-muted transition ${
                  activeImg === src ? "border-primary" : "border-border hover:border-primary/50"
                }`}
              >
                <img src={src} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>

          {/* Trust row under gallery (desktop) */}
          <div className="mt-5 hidden grid-cols-3 gap-3 md:grid">
            <div className="rounded-2xl border border-border bg-card p-3 text-center">
              <Truck className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-[11px] font-semibold">Fast Delivery</p>
              <p className="text-[10px] text-muted-foreground">2-4 days</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3 text-center">
              <RotateCcw className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-[11px] font-semibold">7-Day Return</p>
              <p className="text-[10px] text-muted-foreground">Easy exchange</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3 text-center">
              <ShieldCheck className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-[11px] font-semibold">100% Authentic</p>
              <p className="text-[10px] text-muted-foreground">Quality assured</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div>
          <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {product.category}
          </span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight md:text-4xl">{product.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-semibold">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" /> {product.rating}
            </span>
            <span className="text-muted-foreground">({product.reviews} reviews)</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> 200+ sold this week
            </span>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-foreground">৳{product.price}</span>
            <span className="text-lg text-muted-foreground line-through">৳{product.oldPrice}</span>
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">-{off}%</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-primary">You save ৳{product.oldPrice - product.price}</p>

          {/* Stock + urgency */}
          <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-primary">🔥 Only {product.stock} left in stock!</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" /> Order in 2h for today's dispatch
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (product.stock / 25) * 100)}%` }}
              />
            </div>
          </div>

          <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {product.benefits.map((b: string) => (
              <li key={b} className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-primary" /> {b}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

          {/* Quantity */}
          <div className="mt-6 flex items-center gap-4">
            <span className="text-sm font-semibold">Quantity:</span>
            <div className="inline-flex items-center rounded-full border border-border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-l-full hover:bg-muted"
                aria-label="Decrease"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-r-full hover:bg-muted"
                aria-label="Increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {qty > 1 && <span className="text-xs text-muted-foreground">Subtotal: ৳{product.price * qty} (save ৳{saved})</span>}
          </div>

          {/* CTA */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => add(product, qty)}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-foreground bg-background px-4 py-3.5 text-sm font-bold text-foreground transition hover:bg-foreground hover:text-background"
            >
              <ShoppingBag className="h-4 w-4" /> Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-card)] transition hover:opacity-90"
            >
              <Zap className="h-4 w-4" /> Buy Now
            </button>
          </div>

          {/* Help */}
          <a
            href="tel:+8801700000000"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-muted px-4 py-3 text-sm font-semibold transition hover:bg-muted/70"
          >
            <Phone className="h-4 w-4 text-primary" /> Need help? Call us — 01700-000000
          </a>

          {/* Badges */}
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 font-semibold">
              <Truck className="h-3.5 w-3.5 text-primary" /> COD Available
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 font-semibold">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" /> Delivery 2-4 days
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> 100% Authentic
            </span>
          </div>
        </div>
      </div>

      {/* Frequently Bought Together */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-4 text-2xl font-extrabold">Frequently Bought Together</h2>
        <div className="rounded-3xl border border-border bg-card p-4 md:p-6">
          <div className="flex flex-wrap items-stretch gap-3">
            {bundleItems.map((b, idx) => (
              <div key={b.id} className="flex items-center gap-2">
                <label className="flex min-w-[160px] flex-1 cursor-pointer items-center gap-3 rounded-2xl border-2 border-border p-3 transition hover:border-primary">
                  <input
                    type="checkbox"
                    checked={!!bundle[b.id]}
                    onChange={(e) => setBundle((s) => ({ ...s, [b.id]: e.target.checked }))}
                    className="h-4 w-4 accent-[oklch(0.585_0.245_27.5)]"
                  />
                  <img src={b.image} alt={b.title} className="h-16 w-16 rounded-xl object-cover" />
                  <div className="text-xs">
                    <p className="line-clamp-2 font-semibold">{b.title}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="font-bold text-primary">৳{b.price}</span>
                      <span className="text-[10px] text-muted-foreground line-through">৳{b.oldPrice}</span>
                    </div>
                  </div>
                </label>
                {idx < bundleItems.length - 1 && <Plus className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Bundle total</p>
              <p className="text-3xl font-extrabold">৳{bundleTotal}</p>
              {bundleSave > 0 && <p className="text-xs font-semibold text-primary">Save ৳{bundleSave} on this bundle</p>}
            </div>
            <button
              onClick={() => bundleItems.forEach((b) => bundle[b.id] && add(b))}
              className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Add Bundle to Cart
            </button>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">Customer Reviews</h2>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <span className="font-bold">{product.rating}</span>
              <span className="text-muted-foreground">based on {product.reviews} reviews</span>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.map((r, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-1 text-primary">
                {Array.from({ length: r.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-primary" />
                ))}
              </div>
              <p className="mt-2 text-sm leading-relaxed">{r.text}</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <p className="font-semibold text-muted-foreground">— {r.name}, {r.location}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  <BadgeCheck className="h-3 w-3" />
                  Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-5 text-2xl font-extrabold">Frequently Asked Questions</h2>
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
        <h2 className="mb-4 text-2xl font-extrabold">You May Also Like</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Sticky mobile buy now */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => wishToggle(product)}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border"
            aria-label="Wishlist"
          >
            <Heart className={`h-5 w-5 ${wished ? "fill-primary text-primary" : ""}`} />
          </button>
          <button
            onClick={() => add(product, qty)}
            className="flex-1 rounded-full border-2 border-foreground py-3 text-sm font-bold"
          >
            Add to Cart
          </button>
          <button
            onClick={handleBuyNow}
            className="flex-1 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            Buy ৳{product.price * qty}
          </button>
        </div>
      </div>
    </div>
  );
}
