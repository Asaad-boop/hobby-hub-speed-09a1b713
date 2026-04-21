import { createFileRoute, useNavigate, notFound, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchProductByIdOrSlug, fetchAllProducts } from "@/lib/products";
import { fetchProductReviews, submitReview, fetchEligibleOrderId } from "@/lib/reviews";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import ProductCard from "@/components/ProductCard";
import ReviewModal, { type NewReview } from "@/components/ReviewModal";
import ReviewsList from "@/components/ReviewsList";
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
  ChevronLeft,
  ChevronRight,
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
  loader: async ({ params }) => {
    const product = await fetchProductByIdOrSlug(params.id);
    if (!product) throw notFound();
    const all = await fetchAllProducts();
    return { product, all };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.title} — HobbyShop` },
          { name: "description", content: loaderData.product.description },
          { property: "og:title", content: `${loaderData.product.title} — HobbyShop` },
          { property: "og:description", content: loaderData.product.description },
          { property: "og:image", content: loaderData.product.image },
          { property: "og:type", content: "product" },
          { property: "product:price:amount", content: String(loaderData.product.price) },
          { property: "product:price:currency", content: "BDT" },
        ]
      : [],
    scripts: loaderData
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: loaderData.product.title,
              description: loaderData.product.description,
              image: loaderData.product.gallery,
              sku: loaderData.product.id,
              brand: { "@type": "Brand", name: "HobbyShop" },
              category: loaderData.product.category,
              offers: {
                "@type": "Offer",
                url: `https://hobby-hub-speed.lovable.app/product/${loaderData.product.id}`,
                priceCurrency: "BDT",
                price: loaderData.product.price,
                availability: loaderData.product.stock > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
                itemCondition: "https://schema.org/NewCondition",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: loaderData.product.rating,
                reviewCount: loaderData.product.reviews,
              },
            }),
          },
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
  const { product, all } = Route.useLoaderData();
  const { add } = useCart();
  const { has: wishHas, toggle: wishToggle } = useWishlist();
  const navigate = useNavigate();
  const [activeImg, setActiveImg] = useState(product.image);
  const [qty, setQty] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "ship">("desc");
  const allOthers = all.filter((p) => p.id !== product.id);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [userReviews, setUserReviews] = useState<NewReview[]>([]);
  const qc = useQueryClient();

  const { data: dbReviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["product_reviews", product.id],
    queryFn: () => fetchProductReviews(product.id),
    staleTime: 30_000,
  });

  const { data: eligibleOrderId } = useQuery({
    queryKey: ["product_review_eligibility", product.id],
    queryFn: () => fetchEligibleOrderId(product.id),
    staleTime: 60_000,
  });

  const handleReviewSubmit = async (r: NewReview) => {
    if (!eligibleOrderId) {
      toast.error("You must have a delivered order of this product to leave a review.");
      throw new Error("Not eligible");
    }
    try {
      await submitReview({
        product_id: product.id,
        order_id: eligibleOrderId,
        rating: r.rating,
        title: r.name ? `${r.name}${r.location ? ` · ${r.location}` : ""}` : undefined,
        comment: r.text,
      });
      toast.success("Review submitted! Visible after admin approval.");
      setUserReviews((prev) => [r, ...prev]);
      qc.invalidateQueries({ queryKey: ["product_reviews", product.id] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit review";
      toast.error(msg);
      throw err;
    }
  };

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
  const productReviews = testimonials.filter(
    (t) => t.productSlug === product.id || product.title.toLowerCase().includes(t.productSlug.replace(/-/g, " "))
  );
  const seedReviews = productReviews.length
    ? productReviews
    : testimonials.slice(0, 3);

  const [filter, setFilter] = useState<"all" | "5" | "4" | "photos">("all");
  const [visibleReviews, setVisibleReviews] = useState(3);

  type DisplayReview = {
    name: string;
    location: string;
    rating: number;
    text: string;
    photos: string[];
    date: string;
    helpful: number;
    isUser: boolean;
  };

  const seedPhotoMap: Record<number, string[]> = {
    0: ["__r1", "__r2"],
    1: ["__r3", "__r4"],
  };
  const seedDates = ["2 days ago", "1 week ago", "2 weeks ago", "1 month ago"];
  const seedHelpful = [42, 28, 19, 11];

  const allReviews = useMemo<DisplayReview[]>(() => {
    const fromDb: DisplayReview[] = dbReviews.map((r) => {
      const titleParts = (r.title ?? "").split(" · ");
      const name = r.display_name ?? titleParts[0] ?? "Verified buyer";
      const loc = titleParts[1] ?? "";
      const ageMs = Date.now() - new Date(r.created_at).getTime();
      const days = Math.floor(ageMs / 86_400_000);
      const date = days < 1 ? "Today" : days === 1 ? "1 day ago" : days < 30 ? `${days} days ago` : new Date(r.created_at).toLocaleDateString();
      return {
        name,
        location: loc,
        rating: r.rating,
        text: r.comment ?? "",
        photos: [],
        date,
        helpful: 0,
        isUser: false,
      };
    });
    const fromUserLocal: DisplayReview[] = userReviews
      .filter((u) => !dbReviews.some((d) => d.comment === u.text && d.rating === u.rating))
      .map((r) => ({
        name: r.name, location: r.location, rating: r.rating, text: r.text,
        photos: r.photos, date: "Just now", helpful: 0, isUser: true,
      }));
    const fromSeed: DisplayReview[] = dbReviews.length === 0
      ? seedReviews.slice(0, 4).map((r, i) => ({
          name: r.name, location: r.location, rating: r.rating, text: r.text,
          photos: seedPhotoMap[i] ?? [],
          date: seedDates[i % seedDates.length],
          helpful: seedHelpful[i % seedHelpful.length],
          isUser: false,
        }))
      : [];
    return [...fromUserLocal, ...fromDb, ...fromSeed];
  }, [userReviews, seedReviews, dbReviews]);

  const filteredReviews = useMemo(() => {
    let list = allReviews;
    if (filter === "5") list = list.filter((r) => r.rating === 5);
    else if (filter === "4") list = list.filter((r) => r.rating === 4);
    else if (filter === "photos") list = list.filter((r) => r.photos.length > 0);
    return list;
  }, [allReviews, filter]);

  const filterCounts = useMemo(() => ({
    all: allReviews.length,
    "5": allReviews.filter((r) => r.rating === 5).length,
    "4": allReviews.filter((r) => r.rating === 4).length,
    photos: allReviews.filter((r) => r.photos.length > 0).length,
  }), [allReviews]);

  const handleBuyNow = () => {
    add(product, qty, { silent: true });
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
            {(() => {
              const imgs = product.gallery;
              const curIdx = Math.max(0, imgs.indexOf(activeImg));
              const goto = (i: number) => setActiveImg(imgs[(i + imgs.length) % imgs.length]);
              const handleSwipeEnd = (sx: number | undefined, ex: number) => {
                if (sx == null) return;
                const dx = ex - sx;
                if (Math.abs(dx) < 40) return;
                goto(dx < 0 ? curIdx + 1 : curIdx - 1);
              };
              return (
                <>
                  <div
                    className="relative cursor-grab touch-pan-y select-none active:cursor-grabbing"
                    onTouchStart={(e) => ((e.currentTarget as any)._sx = e.touches[0].clientX)}
                    onTouchEnd={(e) => handleSwipeEnd((e.currentTarget as any)._sx, e.changedTouches[0].clientX)}
                    onMouseDown={(e) => {
                      (e.currentTarget as any)._sx = e.clientX;
                      (e.currentTarget as any)._dragging = true;
                    }}
                    onMouseUp={(e) => {
                      if (!(e.currentTarget as any)._dragging) return;
                      (e.currentTarget as any)._dragging = false;
                      handleSwipeEnd((e.currentTarget as any)._sx, e.clientX);
                    }}
                    onMouseLeave={(e) => ((e.currentTarget as any)._dragging = false)}
                  >
                    <div className="overflow-hidden">
                      <div
                        className="flex transition-transform duration-500 ease-out"
                        style={{ transform: `translateX(-${curIdx * 100}%)` }}
                      >
                        {imgs.map((src: string, i: number) => (
                          <img
                            key={i}
                            src={src}
                            alt={product.title}
                            width={1024}
                            height={1024}
                            className="aspect-square h-full w-full shrink-0 object-cover"
                            draggable={false}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => goto(curIdx - 1)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-md backdrop-blur transition hover:scale-110 md:inline-flex"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goto(curIdx + 1)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-md backdrop-blur transition hover:scale-110 md:inline-flex"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
                    {imgs.map((_: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => goto(i)}
                        aria-label={`Go to image ${i + 1}`}
                        className={`h-1.5 rounded-full transition-all ${
                          i === curIdx ? "w-6 bg-primary" : "w-1.5 bg-background/80"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="absolute right-3 bottom-3 z-10 rounded-full bg-background/90 px-2 py-1 text-[11px] font-bold backdrop-blur">
                    {curIdx + 1}/{imgs.length}
                  </div>
                </>
              );
            })()}
          </div>
          <div className="mt-3 grid max-w-sm grid-cols-4 gap-2 md:max-w-md">
            {product.gallery.map((src: string, i: number) => (
              <button
                key={i}
                onClick={() => setActiveImg(src)}
                className={`overflow-hidden rounded-lg border-2 bg-muted transition ${
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
          <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
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
          <div className="mt-5 rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-4xl font-extrabold text-foreground sm:text-5xl">৳{product.price}</span>
              <span className="text-lg text-muted-foreground line-through sm:text-xl">৳{product.oldPrice}</span>
              <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-extrabold text-primary-foreground">-{off}%</span>
            </div>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary sm:text-sm">
              <Gift className="h-3.5 w-3.5" /> You save ৳{product.oldPrice - product.price}
            </p>
          </div>

          {/* Stock + urgency */}
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 font-extrabold text-primary">
                <Flame className="h-3.5 w-3.5 animate-pulse" /> Only {product.stock} left
              </span>
              <span className="hidden items-center gap-1 text-muted-foreground sm:inline-flex">
                <Clock className="h-3 w-3" /> Today's dispatch
              </span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-background">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                style={{ width: `${Math.min(100, (product.stock / 25) * 100)}%` }}
              />
            </div>
          </div>

          {/* Benefits removed */}

          {/* Bundle offer */}
          {(() => {
            const tiers = [
              { qty: 1, discount: 0, label: "1 PCS", tag: "Regular" },
              { qty: 2, discount: 10, label: "2 PCS", tag: "10% OFF" },
              { qty: 3, discount: 15, label: "3 PCS", tag: "15% OFF" },
            ];
            return (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                    <Gift className="h-3.5 w-3.5 text-primary" /> Bundle Offer — Save More!
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">Select pack</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {tiers.map((t) => {
                    const unit = Math.round(product.price * (1 - t.discount / 100));
                    const total = unit * t.qty;
                    const active = qty === t.qty;
                    return (
                      <button
                        key={t.qty}
                        type="button"
                        onClick={() => setQty(t.qty)}
                        className={`relative flex flex-col items-center rounded-2xl border-2 p-2.5 text-center transition ${
                          active
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        {t.discount > 0 && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold text-primary-foreground shadow">
                            {t.tag}
                          </span>
                        )}
                        <span className={`text-xs font-extrabold ${active ? "text-primary" : "text-foreground"}`}>
                          {t.label}
                        </span>
                        <span className="mt-1 text-[13px] font-extrabold text-foreground">৳{total}</span>
                        {t.discount > 0 ? (
                          <span className="text-[10px] text-muted-foreground line-through">
                            ৳{product.price * t.qty}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">৳{unit}/pc</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* CTA */}
          {(() => {
            const discount = qty === 3 ? 15 : qty === 2 ? 10 : 0;
            const unitPrice = Math.round(product.price * (1 - discount / 100));
            const totalPrice = unitPrice * qty;
            const handleAdd = () => {
              const discounted: typeof product = { ...product, price: unitPrice };
              add(discounted, qty);
            };
            const handleBuy = () => {
              const discounted: typeof product = { ...product, price: unitPrice };
              add(discounted, qty, { silent: true });
              navigate({ to: "/checkout" });
            };
            return (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={handleAdd}
                  className="group inline-flex items-center justify-center gap-2 rounded-full border-2 border-foreground bg-background px-4 py-4 text-sm font-extrabold text-foreground transition hover:bg-foreground hover:text-background"
                >
                  <ShoppingBag className="h-4 w-4 transition group-hover:scale-110" /> Add to Cart
                </button>
                <button
                  onClick={handleBuy}
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-4 py-4 text-sm font-extrabold text-primary-foreground shadow-[var(--shadow-card)] transition hover:shadow-2xl"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <Zap className="h-4 w-4 fill-current" /> Buy Now — ৳{totalPrice}
                </button>
              </div>
            );
          })()}

          {/* Help */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href="tel:+8809638779900"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-muted px-3 py-3 text-xs font-bold transition hover:bg-muted/70 sm:text-sm"
            >
              <Phone className="h-4 w-4 text-primary" /> Call Now
            </a>
            <a
              href="https://wa.me/8801964437520"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-3 py-3 text-xs font-bold text-white transition hover:opacity-90 sm:text-sm"
            >
              <MessageSquare className="h-4 w-4" /> WhatsApp
            </a>
          </div>

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
      <section className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <div className="rounded-3xl border border-border bg-card overflow-hidden">
          <div className="flex border-b border-border">
            {[
              { k: "desc", l: "Details" },
              { k: "specs", l: "Inside" },
              { k: "ship", l: "Shipping" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setActiveTab(t.k as any)}
                className={`flex-1 px-2 py-3.5 text-xs font-bold transition sm:text-sm ${
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
          <button
            onClick={() => setReviewOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border-2 border-foreground px-4 py-2 text-xs font-bold transition hover:bg-foreground hover:text-background"
          >
            <MessageSquare className="h-4 w-4" /> Write a review
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Summary */}
          <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-5 md:col-span-1 md:sticky md:top-24 md:self-start">
            <div className="flex items-center gap-3">
              <p className="text-4xl font-extrabold leading-none">{product.rating}</p>
              <div>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{product.reviews.toLocaleString()} verified</p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              {ratingBreakdown.map((r) => (
                <div key={r.stars} className="flex items-center gap-2 text-[11px]">
                  <span className="inline-flex w-6 items-center gap-0.5 font-bold">{r.stars}<Star className="h-2.5 w-2.5 fill-primary text-primary" /></span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="w-8 text-right font-semibold text-muted-foreground">{r.pct}%</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/10 p-2.5">
              <ThumbsUp className="h-4 w-4 shrink-0 text-primary" />
              <p className="text-[11px] font-bold text-primary">98% recommend this product</p>
            </div>
          </div>

          {/* Reviews list */}
          <div className="grid gap-3 md:col-span-2">
            {/* Customer photo strip */}
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="inline-flex items-center gap-1.5 text-xs font-bold">
                  <Camera className="h-3.5 w-3.5 text-primary" /> Customer photos (28)
                </p>
                <button className="text-[11px] font-semibold text-primary hover:underline">View all</button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[review1, review2, review3, review4].map((src, i) => (
                  <button key={i} className="group relative overflow-hidden rounded-lg border border-border">
                    <img src={src} alt="Customer photo" loading="lazy" width={512} height={512} className="aspect-square w-full object-cover transition group-hover:scale-110" />
                  </button>
                ))}
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { k: "all", l: "All" },
                { k: "5", l: "5★" },
                { k: "4", l: "4★" },
                { k: "photos", l: "Photos" },
              ] as const).map((f) => {
                const active = filter === f.k;
                return (
                  <button
                    key={f.k}
                    onClick={() => setFilter(f.k)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-primary/50"
                    }`}
                  >
                    {f.l}
                    <span className={`rounded-full px-1 text-[9px] ${active ? "bg-primary-foreground/20" : "bg-muted"}`}>
                      {filterCounts[f.k]}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredReviews.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
                <p className="text-xs font-semibold text-muted-foreground">No reviews match this filter.</p>
                <button onClick={() => setFilter("all")} className="mt-2 text-xs font-bold text-primary hover:underline">
                  Show all reviews
                </button>
              </div>
            )}

            {filteredReviews.slice(0, visibleReviews).map((r, i) => {
              const avatars = [avatar1, avatar2, avatar3, avatar4];
              const photoMap: Record<string, string> = { __r1: review1, __r2: review2, __r3: review3, __r4: review4 };
              const resolvedPhotos = r.photos.map((p) => photoMap[p] ?? p);
              return (
                <div
                  key={`${r.isUser ? "u" : "s"}-${i}`}
                  className={`rounded-xl border bg-card p-3.5 ${
                    r.isUser ? "border-primary/40 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {r.isUser ? (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <img src={avatars[i % avatars.length]} alt={r.name} loading="lazy" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-xs font-bold">{r.name}</p>
                        {r.isUser ? (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">New</span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                            <BadgeCheck className="h-2.5 w-2.5" /> Verified
                          </span>
                        )}
                        <div className="flex items-center text-primary">
                          {Array.from({ length: r.rating }).map((_, j) => (
                            <Star key={j} className="h-3 w-3 fill-primary" />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground">• {r.date}</span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-foreground">{r.text}</p>
                      {resolvedPhotos.length > 0 && (
                        <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                          {resolvedPhotos.map((src, j) => (
                            <img key={j} src={src} alt="Review photo" loading="lazy" className="aspect-square w-full rounded-md border border-border object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleReviews < filteredReviews.length && (
              <button
                onClick={() => setVisibleReviews((n) => n + 3)}
                className="mx-auto mt-1 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-xs font-bold transition hover:border-primary hover:text-primary"
              >
                Load more reviews <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
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
      {(() => {
        const discount = qty === 3 ? 15 : qty === 2 ? 10 : 0;
        const unitPrice = Math.round(product.price * (1 - discount / 100));
        const totalPrice = unitPrice * qty;
        const stickyAdd = () => {
          const discounted: typeof product = { ...product, price: unitPrice };
          add(discounted, qty);
        };
        const stickyBuy = () => {
          const discounted: typeof product = { ...product, price: unitPrice };
          add(discounted, qty, { silent: true });
          navigate({ to: "/checkout" });
        };
        return (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 shadow-2xl backdrop-blur md:hidden">
            <div className="flex items-center justify-between gap-3 px-4 pt-2 pb-1 text-[11px]">
              <span className="font-bold text-muted-foreground">
                {qty} {qty > 1 ? "PCS" : "PC"}
                {discount > 0 && (
                  <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 font-extrabold text-primary">
                    {discount}% OFF
                  </span>
                )}
              </span>
              <span className="font-bold">
                <span className="text-foreground">৳{totalPrice}</span>
                {discount > 0 && (
                  <span className="ml-1.5 text-muted-foreground line-through">৳{product.price * qty}</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 p-3 pt-2">
              <button
                onClick={() => wishToggle(product)}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-border"
                aria-label="Wishlist"
              >
                <Heart className={`h-5 w-5 ${wished ? "fill-primary text-primary" : ""}`} />
              </button>
              <button
                onClick={stickyAdd}
                className="flex-1 rounded-full border-2 border-foreground py-3 text-sm font-extrabold"
              >
                Add to Cart
              </button>
              <button
                onClick={stickyBuy}
                className="flex-[1.3] rounded-full bg-primary py-3 text-sm font-extrabold text-primary-foreground shadow-lg"
              >
                Buy ৳{totalPrice}
              </button>
            </div>
          </div>
        );
      })()}

      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        productTitle={product.title}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
}
