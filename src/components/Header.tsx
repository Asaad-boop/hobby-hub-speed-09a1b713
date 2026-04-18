import { Link } from "@tanstack/react-router";
import { Search, User, ShoppingBag, Heart, Menu, X, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import logo from "@/assets/logo.png";

const categories = [
  { label: "Gadgets", href: "/" },
  { label: "DIY Kits", href: "/" },
  { label: "Home Decor", href: "/" },
  { label: "Gifts", href: "/" },
  { label: "New Arrivals", href: "/" },
  { label: "Deals 🔥", href: "/" },
];

export default function Header() {
  const { count, setOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40">
      {/* Announcement bar */}
      <div className="bg-foreground text-background">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4 text-[12px]">
          <p className="hidden sm:block">
            🚚 Free delivery on orders over <span className="font-semibold">৳1,500</span>
          </p>
          <p className="sm:hidden">🚚 Free delivery over ৳1,500</p>
          <div className="hidden items-center gap-4 md:flex">
            <span className="opacity-80">Cash on Delivery available</span>
            <span className="h-3 w-px bg-background/30" />
            <a href="tel:+8801000000000" className="opacity-90 transition hover:opacity-100">
              Help: +880 1000-000000
            </a>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div
        className={`border-b border-border bg-background/95 backdrop-blur transition-shadow ${
          scrolled ? "shadow-[var(--shadow-card)]" : ""
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-6 md:py-4">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-muted lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo slot — replace inner content with your <img> when ready */}
          <Link to="/" className="group flex shrink-0 items-center gap-2" aria-label="HobbyShop">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-extrabold text-primary-foreground shadow-[var(--shadow-card)] transition group-hover:scale-105">
              H
            </span>
            <span className="hidden text-xl font-extrabold leading-none tracking-tight sm:flex sm:flex-col">
              <span className="flex items-baseline">
                <span className="text-foreground">Hobby</span>
                <span className="text-primary">Shop</span>
              </span>
              <span className="mt-0.5 text-[10px] font-medium tracking-[0.2em] text-muted-foreground">
                PREMIUM · BD
              </span>
            </span>
          </Link>

          {/* Search */}
          <div className="relative hidden flex-1 md:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search gadgets, gifts, decor…"
              className="h-12 w-full rounded-full border border-border bg-muted pl-11 pr-28 text-sm outline-none transition focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15"
            />
            <button className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90">
              Search
            </button>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            <button
              className="hidden h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-foreground transition hover:bg-muted lg:inline-flex"
              aria-label="Account"
            >
              <User className="h-5 w-5" />
              <span className="hidden xl:inline">Account</span>
              <ChevronDown className="hidden h-4 w-4 opacity-60 xl:inline" />
            </button>
            <button
              className="hidden h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-muted md:inline-flex"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
            </button>
            <button
              onClick={() => setOpen(true)}
              className="relative inline-flex h-10 items-center gap-2 rounded-full px-3 text-foreground transition hover:bg-muted"
              aria-label="Cart"
            >
              <div className="relative">
                <ShoppingBag className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground ring-2 ring-background">
                    {count}
                  </span>
                )}
              </div>
              <span className="hidden text-sm font-medium lg:inline">Cart</span>
            </button>
          </div>
        </div>

        {/* Mobile search */}
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

        {/* Categories nav (desktop) */}
        <nav className="hidden border-t border-border lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-4">
            {categories.map((c) => (
              <Link
                key={c.label}
                to={c.href}
                className="relative px-4 py-3 text-sm font-medium text-foreground/80 transition hover:text-primary"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Mobile drawer menu */}
        {mobileOpen && (
          <div className="border-t border-border bg-background lg:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col px-2 py-2">
              {categories.map((c) => (
                <Link
                  key={c.label}
                  to={c.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  {c.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
