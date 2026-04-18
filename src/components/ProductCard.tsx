import { Link } from "@tanstack/react-router";
import { Star, ShoppingBag, Zap } from "lucide-react";
import type { Product } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { useNavigate } from "@tanstack/react-router";

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const navigate = useNavigate();
  const off = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]">
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
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />
        <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
          -{off}%
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{product.title}</h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          <span className="font-medium text-foreground">{product.rating}</span>
          <span>({product.reviews})</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-foreground">৳{product.price}</span>
          <span className="text-xs text-muted-foreground line-through">৳{product.oldPrice}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => add(product)}
            className="inline-flex items-center justify-center gap-1 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:border-foreground"
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Add
          </button>
          <button
            onClick={() => {
              add(product);
              navigate({ to: "/checkout" });
            }}
            className="inline-flex items-center justify-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Zap className="h-3.5 w-3.5" /> Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
