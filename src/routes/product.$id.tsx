import { createFileRoute, useNavigate, notFound, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchProductByIdOrSlug, fetchAllProducts } from "@/lib/products";
import { fetchProductReviews, submitReview, fetchEligibleOrderId, uploadReviewImages, uploadReviewVideos } from "@/lib/reviews";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { fbTrack, META_CURRENCY } from "@/lib/meta-pixel";
import { trackViewItem } from "@/lib/analytics-events";
import ProductCard from "@/components/ProductCard";
import ReviewModal, { type NewReview } from "@/components/ReviewModal";
import ReviewsList from "@/components/ReviewsList";
import VariantSelector from "@/components/VariantSelector";
import {
  fetchProductVariantData,
  findVariantByValues,
  buildVariantLabel,
  variantPrice,
} from "@/lib/variants";
import { cdnImage, handleImgError } from "@/lib/cdn-image";
import { getTiers, computeBundleDiscount } from "@/lib/product-tiers";
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
  const { add, setOpen } = useCart();
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

  // Meta Pixel: ViewContent (once per product visit)
  useEffect(() => {
    fbTrack("ViewContent", {
      content_ids: [product.id],
      content_name: product.title,
      content_type: "product",
      value: product.price,
      currency: META_CURRENCY,
    });
    trackViewItem({ id: product.id, title: product.title, price: product.price });
  }, [product.id, product.title, product.price]);

  // ---- Variants ----
  const { data: variantData } = useQuery({
    queryKey: ["product_variants", product.id],
    queryFn: () => fetchProductVariantData(product.id),
    staleTime: 30_000,
  });
  const optionTypes = variantData?.optionTypes ?? [];
  const optionValues = variantData?.optionValues ?? [];
  const variants = (variantData?.variants ?? []).filter((v) => v.is_active);
  const hasVariants = optionTypes.length > 0;
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});
  const allTypesSelected = hasVariants && optionTypes.every((t) => !!selectedValues[t.id]);
  const selectedVariant = useMemo(
    () =>
      allTypesSelected
        ? findVariantByValues(
            variants,
            optionTypes.map((t) => selectedValues[t.id]),
          )
        : null,
    [allTypesSelected, variants, optionTypes, selectedValues],
  );
  const effectivePrice = variantPrice(selectedVariant, product.price);
  const effectiveStock = selectedVariant ? selectedVariant.stock : product.stock;
  const variantBlocksAddToCart = hasVariants && (!selectedVariant || effectiveStock <= 0);
  const variantSelectionLabel = allTypesSelected
    ? buildVariantLabel(
        optionTypes,
        optionValues,
        optionTypes.map((t) => selectedValues[t.id]),
      )
    : null;

  // Variant images are kept OUT of the regular gallery and shown only
  // when the matching variant is selected.
  const variantImages = useMemo(
    () => variants.map((v) => v.image).filter((s): s is string => !!s),
    [variants],
  );
  const displayGallery = useMemo(() => {
    const base = product.gallery.filter((g) => !variantImages.includes(g));
    if (selectedVariant?.image) return [selectedVariant.image, ...base];
    return base;
  }, [product.gallery, variantImages, selectedVariant]);

  // When a variant with an image is selected, switch the main image to it.
  useEffect(() => {
    if (selectedVariant?.image) {
      setActiveImg(selectedVariant.image);
    } else if (!displayGallery.includes(activeImg)) {
      setActiveImg(displayGallery[0] ?? product.image);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariant?.id]);

  const handleReviewSubmit = async (r: NewReview) => {
    try {
      let imageUrls: string[] = [];
      if (r.photoFiles && r.photoFiles.length > 0) {
        try {
          imageUrls = await uploadReviewImages(r.photoFiles);
        } catch (upErr) {
          const m = upErr instanceof Error ? upErr.message : String(upErr);
          throw new Error(`Image upload failed: ${m}`);
        }
      }
      let videoUrls: string[] = [];
      if (r.videoFiles && r.videoFiles.length > 0) {
        try {
          videoUrls = await uploadReviewVideos(r.videoFiles);
        } catch (upErr) {
          const m = upErr instanceof Error ? upErr.message : String(upErr);
          throw new Error(`Video upload failed: ${m}`);
        }
      }
      await submitReview({
        product_id: product.id,
        order_id: eligibleOrderId ?? null,
        rating: r.rating,
        comment: r.text,
        images: imageUrls,
        videos: videoUrls,
        guest_name: r.name,
        guest_phone: r.location, // ReviewModal field re-used as phone
      });
      toast.success("Review submitted!", {
        description: "Your review is awaiting admin approval and will appear once approved.",
      });
      setUserReviews((prev) => [r, ...prev]);
      qc.invalidateQueries({ queryKey: ["product_reviews", product.id] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit review";
      toast.error("Couldn't submit review", {
        description: msg,
        duration: 8000,
      });
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
  const handleBuyNow = () => {
    add(product, qty, { silent: true });
    setOpen(false);
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
              const imgs = displayGallery;
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
                            src={cdnImage(src, 1024)}
                            alt={product.title}
                            loading={i === 0 ? "eager" : "lazy"}
                            decoding="async"
                            width={1024}
                            height={1024}
                            onError={handleImgError}
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
            {displayGallery.map((src: string, i: number) => (
              <button
                key={i}
                onClick={() => setActiveImg(src)}
                className={`overflow-hidden rounded-lg border-2 bg-muted transition ${
                  activeImg === src ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                }`}
              >
                <img src={cdnImage(src, 200)} alt="" loading="lazy" decoding="async" onError={handleImgError} className="aspect-square w-full object-cover" />
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
              <span className="text-4xl font-extrabold text-foreground sm:text-5xl">৳{effectivePrice}</span>
              {effectivePrice < product.oldPrice && (
                <span className="text-lg text-muted-foreground line-through sm:text-xl">৳{product.oldPrice}</span>
              )}
              {effectivePrice < product.oldPrice && (
                <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-extrabold text-primary-foreground">
                  -{Math.round(((product.oldPrice - effectivePrice) / product.oldPrice) * 100)}%
                </span>
              )}
            </div>
            {effectivePrice < product.oldPrice && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary sm:text-sm">
                <Gift className="h-3.5 w-3.5" /> You save ৳{product.oldPrice - effectivePrice}
              </p>
            )}
          </div>

          {/* Variant selector */}
          {hasVariants && (
            <VariantSelector
              optionTypes={optionTypes}
              optionValues={optionValues}
              variants={variants}
              selected={selectedValues}
              onChange={setSelectedValues}
            />
          )}

          {/* Stock + urgency */}
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 font-extrabold text-primary">
                <Flame className="h-3.5 w-3.5 animate-pulse" />
                {hasVariants && !selectedVariant
                  ? "Select options to see stock"
                  : `Only ${effectiveStock} left`}
              </span>
              <span className="hidden items-center gap-1 text-muted-foreground sm:inline-flex">
                <Clock className="h-3 w-3" /> Today's dispatch
              </span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-background">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                style={{ width: `${Math.min(100, (effectiveStock / 25) * 100)}%` }}
              />
            </div>
          </div>

          {/* Benefits removed */}

          {/* Bundle offer */}
          {(() => {
            const custom = getTiers(product.slug);
            const customBaseUnit = custom
              ? (() => {
                  const qtys = Object.keys(custom).map(Number).sort((a, b) => a - b);
                  return custom[qtys[0]] / qtys[0];
                })()
              : 0;
            const tiers = custom
              ? Object.keys(custom)
                  .map(Number)
                  .sort((a, b) => a - b)
                  .map((q) => {
                    const total = custom[q];
                    const ref = customBaseUnit * q;
                    const pct = ref > 0 ? Math.round(((ref - total) / ref) * 100) : 0;
                    return { qty: q, total, label: `${q} PCS`, tag: pct > 0 ? `${pct}% OFF` : "Regular" };
                  })
              : [
                  { qty: 1, total: product.price, label: "1 PCS", tag: "Regular" },
                  { qty: 2, total: Math.round(product.price * 2 * 0.9), label: "2 PCS", tag: "10% OFF" },
                  { qty: 3, total: Math.round(product.price * 3 * 0.85), label: "3 PCS", tag: "15% OFF" },
                ];

            return (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                    <Gift className="h-3.5 w-3.5 text-primary" /> Bundle Offer — Save More!
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">Select pack</span>
                </div>
                <div className={`grid gap-2 ${tiers.length >= 4 ? "grid-cols-4" : "grid-cols-3"}`}>
                  {tiers.map((t) => {
                    const unit = Math.round(t.total / t.qty);
                    const base = custom ? Math.round(customBaseUnit * t.qty) : (product.oldPrice && product.oldPrice > product.price ? product.oldPrice : product.price) * t.qty;
                    const active = qty === t.qty;
                    const hasDiscount = t.total < base;

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
                        {hasDiscount && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold text-primary-foreground shadow">
                            {t.tag}
                          </span>
                        )}
                        <span className={`text-xs font-extrabold ${active ? "text-primary" : "text-foreground"}`}>
                          {t.label}
                        </span>
                        <span className="mt-1 text-[13px] font-extrabold text-foreground">৳{t.total}</span>
                        {hasDiscount ? (
                          <span className="text-[10px] text-muted-foreground line-through">৳{base}</span>
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
            const discountAmt = computeBundleDiscount(product.slug, effectivePrice, qty);
            const totalPrice = Math.max(0, effectivePrice * qty - discountAmt);
            const unitPrice = qty > 0 ? Math.round(totalPrice / qty) : effectivePrice;
            const variantOpts = selectedVariant
              ? { variantId: selectedVariant.id, variantLabel: variantSelectionLabel }
              : undefined;
            // Add the product to cart at its ORIGINAL price. The bundle
            // (qty-based) discount is applied as a separate line at checkout
            // so it appears as a real "Discount" in the order/billing.
            const handleAdd = () => {
              if (variantBlocksAddToCart) {
                toast.error(hasVariants && !allTypesSelected ? "Select all options first" : "Out of stock");
                return;
              }
              add(product, qty, variantOpts);
            };
            const handleBuy = () => {
              if (variantBlocksAddToCart) {
                toast.error(hasVariants && !allTypesSelected ? "Select all options first" : "Out of stock");
                return;
              }
              add(product, qty, { silent: true, ...(variantOpts ?? {}) });
              setOpen(false);
              navigate({ to: "/checkout" });
            };
            return (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={handleAdd}
                  disabled={variantBlocksAddToCart}
                  className="group inline-flex items-center justify-center gap-2 rounded-full border-2 border-foreground bg-background px-4 py-4 text-sm font-extrabold text-foreground transition hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background disabled:hover:text-foreground"
                >
                  <ShoppingBag className="h-4 w-4 transition group-hover:scale-110" /> Add to Cart
                </button>
                <button
                  onClick={handleBuy}
                  disabled={variantBlocksAddToCart}
                  className="buy-jiggle group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-4 py-4 text-sm font-extrabold text-primary-foreground transition hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50"
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
            <p className="mt-1 text-sm text-muted-foreground">
              {eligibleOrderId
                ? "You're a verified buyer — share your experience!"
                : "Share your experience with this product."}
            </p>
          </div>
          <button
            onClick={() => setReviewOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border-2 border-foreground px-4 py-2 text-xs font-bold transition hover:bg-foreground hover:text-background"
          >
            <MessageSquare className="h-4 w-4" /> Write a review
          </button>
        </div>

        <ReviewsList
          reviews={dbReviews}
          loading={reviewsLoading}
          fallbackRating={Number(product.rating) || 0}
          fallbackCount={Number(product.reviews) || 0}
        />
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
        const variantOpts = selectedVariant
          ? { variantId: selectedVariant.id, variantLabel: variantSelectionLabel }
          : undefined;
        const stickyAdd = () => {
          if (variantBlocksAddToCart) {
            toast.error(hasVariants && !allTypesSelected ? "Select all options first" : "Out of stock");
            return;
          }
          add(product, qty, variantOpts);
        };
        const stickyBuy = () => {
          if (variantBlocksAddToCart) {
            toast.error(hasVariants && !allTypesSelected ? "Select all options first" : "Out of stock");
            return;
          }
          add(product, qty, { silent: true, ...(variantOpts ?? {}) });
          setOpen(false);
          navigate({ to: "/checkout" });
        };
        return (
          <div className="fixed inset-x-0 bottom-[64px] z-40 border-t border-border bg-background/95 shadow-2xl backdrop-blur md:hidden">
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
                disabled={variantBlocksAddToCart}
                className="flex-1 rounded-full border-2 border-foreground py-3 text-sm font-extrabold"
              >
                Add to Cart
              </button>
              <button
                onClick={stickyBuy}
                disabled={variantBlocksAddToCart}
                className="buy-jiggle relative flex-[1.3] rounded-full bg-primary py-3 text-sm font-extrabold text-primary-foreground"
              >
                <Zap className="mr-1 inline-block h-4 w-4 fill-current align-[-2px]" />
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
