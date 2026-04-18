import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { products, newArrivals } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { Filter, SlidersHorizontal, Store } from "lucide-react";

const allProducts = [...products, ...newArrivals];
const categories = ["All", ...Array.from(new Set(allProducts.map((p) => p.category)))];

const searchSchema = z.object({
  category: fallback(z.string(), "All").default("All"),
  sort: fallback(z.enum(["popular", "price-asc", "price-desc", "rating"]), "popular").default("popular"),
});

export const Route = createFileRoute("/shop")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Shop All Products — HobbyShop" },
      { name: "description", content: "Browse our full collection of gadgets, decor, gifts and DIY kits. Filter by category and sort by price or popularity." },
      { property: "og:title", content: "Shop All Products — HobbyShop" },
      { property: "og:description", content: "Curated gadgets, decor and gifts at unbeatable prices." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { category, sort } = Route.useSearch();

  const filtered = useMemo(() => {
    let list = category === "All" ? allProducts : allProducts.filter((p) => p.category === category);
    list = [...list].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "rating") return b.rating - a.rating;
      return b.reviews - a.reviews;
    });
    return list;
  }, [category, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Store className="h-3 w-3" /> Full Catalog
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight md:text-4xl">
          Shop All <span className="text-primary">Products</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "product" : "products"} available
        </p>
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 z-10 -mx-4 mt-6 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:top-16">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            {categories.map((cat) => (
              <Link
                key={cat}
                to="/shop"
                search={(prev) => ({ ...prev, category: cat })}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  category === cat
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-foreground hover:bg-muted/70"
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => {
                const url = new URL(window.location.href);
                url.searchParams.set("sort", e.target.value);
                window.history.pushState({}, "", url.toString());
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
              className="h-9 rounded-full border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">No products found in this category.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
