import { createFileRoute, useNavigate, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getProduct, products } from "@/lib/products";
import { useCart } from "@/lib/cart";
import ProductCard from "@/components/ProductCard";
import { Star, Truck, ShieldCheck, BadgeCheck, Check, Zap, ShoppingBag } from "lucide-react";

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
  const navigate = useNavigate();
  const [activeImg] = useState(product.image);
  const [bundle, setBundle] = useState<Record<string, boolean>>({ [product.id]: true });

  const off = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
  const bundleItems = products.slice(0, 3);
  const bundleTotal = bundleItems
    .filter((b) => bundle[b.id] ?? (b.id === product.id))
    .reduce((s, b) => s + b.price, 0);
  const related = products.filter((p) => p.id !== product.id);

  const handleBuyNow = () => {
    add(product);
    navigate({ to: "/checkout" });
  };

  return (
    <div className="pb-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 md:grid-cols-2 md:py-10">
        {/* Gallery */}
        <div>
          <div className="overflow-hidden rounded-3xl border border-border bg-muted">
            <img src={activeImg} alt={product.title} width={1024} height={1024} className="h-full w-full object-cover transition duration-300 hover:scale-105" />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[product.image, product.image, product.image, product.image].map((src, i) => (
              <button key={i} className="overflow-hidden rounded-xl border border-border bg-muted">
                <img src={src} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{product.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-semibold">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" /> {product.rating}
            </span>
            <span className="text-muted-foreground">{product.reviews} reviews</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              Only {product.stock} left!
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-foreground">৳{product.price}</span>
            <span className="text-base text-muted-foreground line-through">৳{product.oldPrice}</span>
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">-{off}%</span>
          </div>

          <ul className="mt-5 space-y-2">
            {product.benefits.map((b: string) => (
              <li key={b} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary" /> {b}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-sm text-muted-foreground">{product.description}</p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 font-semibold"><Truck className="h-3.5 w-3.5 text-primary" /> COD Available</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 font-semibold"><BadgeCheck className="h-3.5 w-3.5 text-primary" /> Delivery in 2-4 days</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 font-semibold"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> 100% Authentic</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={() => add(product)} className="inline-flex items-center justify-center gap-2 rounded-full border border-foreground bg-background px-4 py-3.5 text-sm font-bold text-foreground transition hover:bg-foreground hover:text-background">
              <ShoppingBag className="h-4 w-4" /> Add to Cart
            </button>
            <button onClick={handleBuyNow} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-card)] transition hover:opacity-90">
              <Zap className="h-4 w-4" /> Buy Now
            </button>
          </div>
        </div>
      </div>

      {/* Frequently Bought Together */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-4 text-xl font-bold">Frequently Bought Together</h2>
        <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-4">
            {bundleItems.map((b) => {
              const checked = bundle[b.id] ?? (b.id === product.id);
              return (
                <label key={b.id} className="flex flex-1 min-w-[140px] cursor-pointer items-center gap-3 rounded-xl border border-border p-3 hover:border-primary">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setBundle((s) => ({ ...s, [b.id]: e.target.checked }))}
                    className="h-4 w-4 accent-[oklch(0.585_0.245_27.5)]"
                  />
                  <img src={b.image} alt={b.title} className="h-14 w-14 rounded-lg object-cover" />
                  <div className="text-xs">
                    <p className="line-clamp-2 font-semibold">{b.title}</p>
                    <p className="font-bold text-primary">৳{b.price}</p>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Bundle total</p>
              <p className="text-2xl font-extrabold">৳{bundleTotal}</p>
            </div>
            <button
              onClick={() => bundleItems.forEach((b) => ((bundle[b.id] ?? b.id === product.id) ? add(b) : null))}
              className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Add Bundle
            </button>
          </div>
        </div>
      </section>

      {/* Cross-sell */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-4 text-xl font-bold">You May Also Like</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-4 text-xl font-bold">Customer Reviews</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: "Rakib H.", text: "Looks amazing in my room. Quality is top.", rating: 5 },
            { name: "Sumaiya A.", text: "Delivery was fast, packaging was solid. Recommended!", rating: 5 },
            { name: "Tanvir K.", text: "Worth every taka. Brightness is perfect.", rating: 4 },
          ].map((r) => (
            <div key={r.name} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-1 text-primary">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary" />
                ))}
              </div>
              <p className="mt-2 text-sm">{r.text}</p>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">— {r.name} <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary"><BadgeCheck className="h-3 w-3" />Verified</span></p>
            </div>
          ))}
        </div>
      </section>

      {/* Sticky mobile buy now */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background p-3 md:hidden">
        <div className="flex gap-2">
          <button onClick={() => add(product)} className="flex-1 rounded-full border border-foreground py-3 text-sm font-bold">Add to Cart</button>
          <button onClick={handleBuyNow} className="flex-1 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground">Buy Now ৳{product.price}</button>
        </div>
      </div>
    </div>
  );
}
