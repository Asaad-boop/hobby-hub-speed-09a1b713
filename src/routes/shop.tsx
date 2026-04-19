// Shop page — category filter + sort + search via search params
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { products, newArrivals } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { Filter, SlidersHorizontal, Store, Search as SearchIcon, X } from "lucide-react";

const allProducts = [...products, ...newArrivals];
const categories = ["All", ...Array.from(new Set(allProducts.map((p) => p.category)))];

type SortKey = "popular" | "price-asc" | "price-desc" | "rating";

type ShopSearch = {
  category?: string;
  sort?: SortKey;
  q?: string;
};

const VALID_SORTS: SortKey[] = ["popular", "price-asc", "price-desc", "rating"];

export const Route = createFileRoute("/shop")({
  validateSearch: (raw: Record<string, unknown>): ShopSearch => {
    const category = typeof raw.category === "string" ? raw.category : "All";
    const sort = VALID_SORTS.includes(raw.sort as SortKey) ? (raw.sort as SortKey) : "popular";
    const q = typeof raw.q === "string" && raw.q.trim() ? raw.q.trim().slice(0, 100) : undefined;
    return { category, sort, q };
  },
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
  const search = Route.useSearch();
  const category = search.category ?? "All";
  const sort: SortKey = search.sort ?? "popular";
  const q = search.q;
  const navigate = useNavigate({ from: "/shop" });

  const filtered = useMemo(() => {
    let list = category === "All" ? allProducts : allProducts.filter((p) => p.category === category);
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(needle) ||
          p.description.toLowerCase().includes(needle) ||
          p.category.toLowerCase().includes(needle) ||
          p.benefits.some((b) => b.toLowerCase().includes(needle))
      );
    }
    list = [...list].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "rating") return b.rating - a.rating;
      return b.reviews - a.reviews;
    });
    return list;
  }, [category, sort, q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Store className="h-3 w-3" /> Full Catalog
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight md:text-4xl">
          {q ? (
            <>
              Search: <span className="text-primary">"{q}"</span>
            </>
          ) : (
            <>
              Shop All <span className="text-primary">Products</span>
            </>
          )}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "product" : "products"}{" "}
          {q ? "found" : "available"}
        </p>
        {q && (
          <button
            onClick={() =>
              navigate({ search: ((prev: ShopSearch) => ({ ...prev, q: undefined })) as never })
            }
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-muted/70"
          >
            <X className="h-3 w-3" /> Clear search
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 z-10 -mx-4 mt-6 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:top-16">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            {categories.map((cat) => (
              <Link
                key={cat}
                to="/shop"
                search={((prev: ShopSearch) => ({ ...prev, category: cat })) as never}
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

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => {
                navigate({
                  search: ((prev: ShopSearch) => ({ ...prev, sort: e.target.value as SortKey })) as never,
                });
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

      {filtered.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <SearchIcon className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-bold">No products found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {q
              ? `We couldn't find anything matching "${q}". Try a different search.`
              : "No products in this category yet."}
          </p>
          <Link
            to="/shop"
            search={{ category: "All", sort: "popular" } as any}
            className="mt-4 inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md transition hover:scale-105"
          >
            View all products
          </Link>
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
