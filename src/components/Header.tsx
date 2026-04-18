import { Link, useRouter } from "@tanstack/react-router";
import { Search, User, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";

export default function Header() {
  const { count, setOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 bg-background/90 backdrop-blur transition-shadow ${
        scrolled ? "shadow-[var(--shadow-card)]" : ""
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-6 md:py-4">
        <Link to="/" className="flex items-center gap-1 text-xl font-extrabold tracking-tight">
          <span className="text-foreground">Hobby</span>
          <span className="text-primary">Shop</span>
        </Link>

        <div className="relative hidden flex-1 md:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search gadgets, gifts, decor…"
            className="h-11 w-full rounded-full border border-border bg-muted pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:bg-background"
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button className="hidden h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-muted md:inline-flex" aria-label="Account">
            <User className="h-5 w-5" />
          </button>
          <button
            onClick={() => setOpen(true)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-muted"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search products…"
            className="h-11 w-full rounded-full border border-border bg-muted pl-11 pr-4 text-sm outline-none focus:border-primary focus:bg-background"
          />
        </div>
      </div>
    </header>
  );
}
