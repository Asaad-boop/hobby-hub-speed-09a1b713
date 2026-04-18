import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";
import { useCart } from "@/lib/cart";
import { getProduct } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "My Wishlist — HobbyShop" },
      { name: "description", content: "Your saved favorite products on HobbyShop." },
      { property: "og:title", content: "My Wishlist — HobbyShop" },
      { property: "og:description", content: "Your saved favorite products on HobbyShop." },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { ids, clear, remove } = useWishlist();
  const { add } = useCart();

  const products = ids.map((id) => getProduct(id)).filter((p): p is NonNullable<ReturnType<typeof getProduct>> => Boolean(p));

  const addAllToCart = () => {
    products.forEach((p) => add(p));
    toast.success(`${products.length} item${products.length > 1 ? "s" : ""} added to cart`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/"
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Continue shopping
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight md:text-3xl">
            <Heart className="h-6 w-6 fill-primary text-primary" />
            My Wishlist
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length === 0
              ? "Save products you love for later."
              : `${products.length} saved item${products.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {products.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={addAllToCart}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md transition hover:opacity-90"
            >
              <ShoppingBag className="h-3.5 w-3.5" /> Add all to cart
            </button>
            <button
              onClick={() => {
                clear();
                toast.success("Wishlist cleared");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:border-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear all
            </button>
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-10 w-10 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">Your wishlist is empty</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Tap the heart on any product to save it here for later.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md transition hover:opacity-90"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {products.map((p) => (
            <div key={p.id} className="relative">
              <button
                onClick={() => {
                  remove(p.id);
                  toast.success("Removed from wishlist");
                }}
                aria-label="Remove from wishlist"
                className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background text-foreground shadow-md ring-1 ring-border transition hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
