import { Link } from "@tanstack/react-router";
import { Search, User, ShoppingBag, Heart, Menu, X, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import logo from "@/assets/logo.png";

const categories = [
  { label: "All Product", href: "/" },
  { label: "Kitchen & Home", href: "/" },
  { label: "Decor & Lighting", href: "/" },
  { label: "Gift Items", href: "/" },
  { label: "DIY & Hobby", href: "/" },
  { label: "Kids & Toys", href: "/" },
  { label: "Smart Daily Use", href: "/" },
  { label: "Gadgets & Tech 🔥", href: "/" },
];

export default function Header() {
  const { count, setOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (y / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40">
      {/* Announcement bar — animated marquee gradient */}
      <div className="relative overflow-hidden bg-foreground text-background">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent bg-[length:200%_100%] animate-[shimmer_4s_linear_infinite]" />
        <div className="relative mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4 text-[12px]">
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
        className={`border-b bg-background/80 backdrop-blur-xl transition-all duration-300 ${
          scrolled
            ? "border-border/80 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]"
            : "border-transparent shadow-none"
        }`}
      >
        <div
          className={`mx-auto flex max-w-7xl items-center gap-3 px-4 transition-all duration-300 md:gap-6 ${
            scrolled ? "py-2 md:py-2.5" : "py-3 md:py-4"
          }`}
        >
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted hover:scale-110 active:scale-95 lg:hidden"
            aria-label="Menu"
          >
            <span className="relative inline-flex h-5 w-5 items-center justify-center">
              <Menu className={`absolute h-5 w-5 transition-all duration-300 ${mobileOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"}`} />
              <X className={`absolute h-5 w-5 transition-all duration-300 ${mobileOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"}`} />
            </span>
          </button>

          {/* Logo */}
          <Link to="/" className="group relative flex shrink-0 items-center" aria-label="HobbyShop — Touch Your Dream">
            <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
            <img
              src={logo}
              alt="HobbyShop"
              className={`w-auto transition-all duration-300 group-hover:scale-105 group-hover:rotate-[-2deg] ${
                scrolled ? "h-9 md:h-10" : "h-10 md:h-12"
              }`}
            />
          </Link>

          {/* Search */}
          <div className="group relative hidden flex-1 md:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              type="search"
              placeholder="Search gadgets, gifts, decor…"
              className="h-12 w-full rounded-full border border-border bg-muted pl-11 pr-28 text-sm outline-none transition-all duration-300 focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/15 focus:shadow-[0_0_0_1px_var(--primary)]"
            />
            <button className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 active:scale-95">
              Search
            </button>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            <button
              className="group relative hidden h-10 items-center gap-2 overflow-hidden rounded-full px-3 text-sm font-medium text-foreground transition-all hover:bg-muted lg:inline-flex"
              aria-label="Account"
            >
              <User className="h-5 w-5 transition-transform group-hover:scale-110" />
              <span className="hidden xl:inline">Account</span>
              <ChevronDown className="hidden h-4 w-4 opacity-60 transition-transform group-hover:rotate-180 xl:inline" />
            </button>
            <button
              className="group hidden h-10 w-10 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted md:inline-flex"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5 transition-all group-hover:scale-110 group-hover:fill-primary group-hover:text-primary" />
            </button>
            <button
              onClick={() => setOpen(true)}
              className="group relative inline-flex h-10 items-center gap-2 rounded-full px-3 text-foreground transition-all hover:bg-muted"
              aria-label="Cart"
            >
              <div className="relative">
                <ShoppingBag className="h-5 w-5 transition-transform group-hover:scale-110 group-hover:-rotate-12" />
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 animate-scale-in items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground ring-2 ring-background">
                    <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary opacity-40" />
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
