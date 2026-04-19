import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { X, Star, ShoppingBag, Zap, Heart, Minus, Plus, Check, Truck } from "lucide-react";
import type { Product } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { toast } from "sonner";

export default function QuickViewModal({
  product,
  open,
  onClose,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
}) {
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(product.image);

  useEffect(() => {
    if (open) {
      setQty(1);
      setActiveImg(product.image);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, product.image]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const off = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
  const liked = has(product.id);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-background shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/95 shadow-md transition hover:scale-110"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:gap-6 sm:p-6">
          {/* Gallery */}
          <div>
            <div className="overflow-hidden rounded-xl border border-border bg-muted">
              <img
                src={activeImg}
                alt={product.title}
                className="aspect-square w-full object-cover"
              />
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {product.gallery.slice(0, 4).map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(src)}
                  className={`overflow-hidden rounded-md border-2 ${
                    activeImg === src ? "border-primary" : "border-border"
                  }`}
                >
                  <img src={src} alt="" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <span className="inline-block w-fit rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {product.category}
            </span>
            <h2 className="mt-2 text-lg font-extrabold leading-tight sm:text-xl">
              {product.title}
            </h2>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold">{product.rating}</span>
              <span className="text-muted-foreground">({product.reviews.toLocaleString()})</span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-primary sm:text-3xl">
                ৳{product.price.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                ৳{product.oldPrice.toLocaleString()}
              </span>
              {off > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground">
                  -{off}%
                </span>
              )}
            </div>

            <p className="mt-3 line-clamp-3 text-xs text-muted-foreground sm:text-sm">
              {product.description}
            </p>


            <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground w-fit">
              <Truck className="h-3 w-3" /> Cash on Delivery available
            </div>

            {/* Qty */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs font-bold">Qty:</span>
              <div className="inline-flex items-center rounded-full border border-border">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="inline-flex h-8 w-8 items-center justify-center"
                  aria-label="Decrease"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-8 text-center text-sm font-bold">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="inline-flex h-8 w-8 items-center justify-center"
                  aria-label="Increase"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => {
                  toggle(product);
                  toast.success(liked ? "Removed from wishlist" : "Added to wishlist");
                }}
                aria-label="Wishlist"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border"
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-primary text-primary" : ""}`} />
              </button>
              <button
                onClick={() => {
                  add(product, qty);
                  toast.success("Added to cart");
                  onClose();
                }}
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-foreground bg-background text-xs font-extrabold"
              >
                <ShoppingBag className="h-4 w-4" /> Add to Cart
              </button>
              <button
                onClick={() => {
                  add(product, qty, { silent: true });
                  onClose();
                  navigate({ to: "/checkout" });
                }}
                className="inline-flex h-11 flex-[1.2] items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-extrabold text-primary-foreground shadow-md"
              >
                <Zap className="h-4 w-4" /> Buy Now
              </button>
            </div>

            <Link
              to="/product/$id"
              params={{ id: product.id }}
              onClick={onClose}
              className="mt-3 text-center text-xs font-semibold text-primary underline-offset-2 hover:underline"
            >
              View full details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
