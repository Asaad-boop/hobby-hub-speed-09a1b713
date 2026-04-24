import { Link, useLocation } from "@tanstack/react-router";
import { Home, Store, Heart, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const { count, setOpen } = useCart();
  const { count: wishCount } = useWishlist();

  // Hide on checkout — the sticky "Place Order" CTA owns the bottom area there.
  if (pathname.startsWith("/checkout")) return null;

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  const itemBase =
    "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors";

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        <li className="flex flex-1">
          <Link
            to="/"
            className={`${itemBase} ${isActive("/") && pathname === "/" ? "text-primary" : "text-muted-foreground"}`}
          >
            <Home className="h-[20px] w-[20px]" />
            <span>Home</span>
          </Link>
        </li>
        <li className="flex flex-1">
          <Link
            to="/shop"
            search={{ category: "All", sort: "popular" } as any}
            className={`${itemBase} ${isActive("/shop") ? "text-primary" : "text-muted-foreground"}`}
          >
            <Store className="h-[20px] w-[20px]" />
            <span>Shop</span>
          </Link>
        </li>
        <li className="flex flex-1">
          <Link
            to="/wishlist"
            className={`${itemBase} ${isActive("/wishlist") ? "text-primary" : "text-muted-foreground"}`}
          >
            <span className="relative">
              <Heart className="h-[20px] w-[20px]" />
              {wishCount > 0 && (
                <span className="absolute -right-2 -top-1.5 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-background">
                  {wishCount}
                </span>
              )}
            </span>
            <span>Wishlist</span>
          </Link>
        </li>
        <li className="flex flex-1">
          <button
            onClick={() => setOpen(true)}
            className={`${itemBase} text-muted-foreground`}
            aria-label="Open cart"
          >
            <span className="relative">
              <ShoppingBag className="h-[20px] w-[20px]" />
              {count > 0 && (
                <span className="absolute -right-2 -top-1.5 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-background">
                  {count}
                </span>
              )}
            </span>
            <span>Cart</span>
          </button>
        </li>
        <li className="flex flex-1">
          <Link
            to="/account"
            className={`${itemBase} ${isActive("/account") ? "text-primary" : "text-muted-foreground"}`}
          >
            <User className="h-[20px] w-[20px]" />
            <span>Account</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
