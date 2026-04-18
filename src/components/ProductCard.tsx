import { Link, useNavigate } from "@tanstack/react-router";
import { Star, ShoppingBag, Zap, Heart, Eye } from "lucide-react";
import type { Product } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { toast } from "sonner";

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const navigate = useNavigate();
  const liked = has(product.id);
  const off = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
  const lowStock = product.stock <= 8;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-elevated)]">
      {/* Image */}
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          width={1024}
          height={1024}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />

        {/* gradient overlay on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Discount badge */}
        {off > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground shadow-md md:left-3 md:top-3 md:px-2.5 md:py-1 md:text-[11px]">
            -{off}%
          </span>
        )}

        {/* Low stock badge */}
        {lowStock && (
          <span className="absolute left-2.5 bottom-2.5 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-md backdrop-blur md:left-3 md:bottom-3">
            Only {product.stock} left
          </span>
        )}

        {/* Wishlist */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const added = toggle(product);
            toast.success(added ? "Added to wishlist" : "Removed from wishlist");
          }}
          aria-label="Add to wishlist"
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur transition hover:scale-110 hover:bg-background md:right-3 md:top-3 md:h-9 md:w-9"
        >
          <Heart
            className={`h-4 w-4 transition ${liked ? "fill-primary text-primary" : ""}`}
          />
        </button>

        {/* Quick view (desktop only) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-3 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:block">
          <span className="pointer-events-auto mx-auto flex w-full items-center justify-center gap-1.5 rounded-full bg-background/95 px-3 py-2 text-xs font-semibold text-foreground shadow-lg backdrop-blur">
            <Eye className="h-3.5 w-3.5" /> Quick view
          </span>
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3 md:p-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {product.category}
        </span>
        <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {product.title}
        </h3>

        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-foreground">{product.rating}</span>
          <span>({product.reviews.toLocaleString()})</span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-extrabold text-foreground md:text-lg">
            ৳{product.price.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground line-through">
            ৳{product.oldPrice.toLocaleString()}
          </span>
        </div>

        <div className="mt-auto pt-3 grid grid-cols-5 gap-1.5 md:gap-2">
          <button
            onClick={() => {
              add(product);
              toast.success("Added to cart");
            }}
            aria-label="Add to cart"
            className="col-span-2 inline-flex items-center justify-center gap-1 rounded-full border border-border bg-background px-2 py-2 text-xs font-semibold text-foreground transition hover:border-foreground hover:bg-muted"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>
          <button
            onClick={() => {
              add(product);
              navigate({ to: "/checkout" });
            }}
            className="col-span-3 inline-flex items-center justify-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary/85 px-3 py-2 text-xs font-bold text-primary-foreground shadow-md transition hover:opacity-95 hover:shadow-lg"
          >
            <Zap className="h-3.5 w-3.5" /> Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
