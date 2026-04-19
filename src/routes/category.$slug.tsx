import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { fetchAllProducts, type Product } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { Sparkles, ArrowRight } from "lucide-react";

const CATEGORY_MAP: Record<string, { label: string; category: string; tagline: string; description: string }> = {
  "home-decor": {
    label: "Home Decor",
    category: "Home Decor",
    tagline: "Style your space, your way",
    description: "Lamps, planters, diffusers and unique decor pieces to transform your home. Free delivery over ৳1,500 across Bangladesh.",
  },
  gadgets: {
    label: "Gadgets",
    category: "Gadgets",
    tagline: "Trending tech, unbeatable prices",
    description: "Smart speakers, wireless chargers, smartwatches and the latest gadgets at the best prices in Bangladesh.",
  },
  "diy-kits": {
    label: "DIY Kits",
    category: "DIY Kits",
    tagline: "Build it. Love it.",
    description: "Creative DIY kits for hobbyists, makers and gift-givers. Hours of fun, beautiful results.",
  },
};

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params }) => {
    const meta = CATEGORY_MAP[params.slug.toLowerCase()];
    if (!meta) throw notFound();
    const all = await fetchAllProducts();
    const items: Product[] = all.filter((p) => p.category === meta.category);
    return { meta, items };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.meta.label} — Shop in Bangladesh | HobbyShop` },
          { name: "description", content: loaderData.meta.description },
          { property: "og:title", content: `${loaderData.meta.label} — HobbyShop` },
          { property: "og:description", content: loaderData.meta.description },
          { property: "og:image", content: loaderData.items[0]?.image },
        ]
      : [],
  }),
  component: CategoryLandingPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Category not found</h1>
      <Link to="/shop" search={{ category: "All", sort: "popular" } as any} className="mt-4 inline-block text-primary underline">
        Browse all products
      </Link>
    </div>
  ),
});

function CategoryLandingPage() {
  const { meta, items } = Route.useLoaderData();

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <nav className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link to="/shop" search={{ category: "All", sort: "popular" } as any} className="hover:text-primary">Shop</Link>
            <span>/</span>
            <span className="text-foreground">{meta.label}</span>
          </nav>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> {items.length} products
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {meta.label}
          </h1>
          <p className="mt-2 text-base font-semibold text-primary">{meta.tagline}</p>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">{meta.description}</p>
          <Link
            to="/shop"
            search={{ category: meta.category, sort: "popular" } as any}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition hover:scale-105"
          >
            View all in Shop <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        {items.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">No products in this category yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {items.map((p: typeof items[number]) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
