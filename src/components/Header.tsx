import { Link } from "@tanstack/react-router";
import { Search, User, ShoppingBag, Menu, X } from "lucide-react";
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
  const [searchOpen, setSearchOpen] = useState(false);
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
    <header className={`sticky top-0 z-40 transition-colors duration-300 ${scrolled ? "bg-background shadow-[0_4px_20px_-12px_rgba(0,0,0,0.25)]" : "bg-transparent"}`}>
      {/* Announcement bar — hides on scroll */}
      <div
        className={`relative overflow-hidden bg-foreground text-background transition-all duration-300 ${
          scrolled ? "max-h-0 opacity-0" : "max-h-9 opacity-100"
        }`}
      >
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

      {/* Floating pill navbar */}
      <div
        className={`transition-all duration-300 ${
          scrolled ? "px-2 py-2 md:px-4 md:py-2" : "px-3 pt-3 md:px-6 md:pt-4"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 md:gap-3">
          {/* Logo card */}
          <Link
            to="/"
            aria-label="HobbyShop"
            className={`group relative flex shrink-0 items-center justify-center rounded-2xl px-4 py-2 transition-all hover:-translate-y-0.5 md:rounded-3xl md:px-6 md:py-3 ${
              scrolled
                ? "border border-border bg-background/95 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.18)] backdrop-blur-xl hover:shadow-[0_12px_40px_-10px_rgba(230,0,35,0.35)]"
                : "border border-transparent bg-transparent shadow-none"
            }`}
          >
            <span className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100 md:rounded-3xl" />
            <img
              src={logo}
              alt="HobbyShop"
              className={`w-auto transition-all duration-300 group-hover:scale-105 ${
                scrolled ? "h-8 brightness-100 md:h-10" : "h-9 brightness-0 invert md:h-12"
              }`}
            />
          </Link>

          {/* Center action card */}
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1.5 transition-all md:gap-1 md:px-3 md:py-2 ${
              scrolled
                ? "border border-border bg-background/95 text-foreground shadow-[0_8px_30px_-10px_rgba(0,0,0,0.18)] backdrop-blur-xl"
                : "border border-transparent bg-transparent text-background shadow-none"
            }`}
          >
            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
              className="group relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-muted active:scale-95 md:h-10 md:w-10 lg:hidden"
            >
              <span className="relative inline-flex h-5 w-5 items-center justify-center">
                <Menu className={`absolute h-5 w-5 transition-all duration-300 ${mobileOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"}`} />
                <X className={`absolute h-5 w-5 transition-all duration-300 ${mobileOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"}`} />
              </span>
            </button>

            {/* Categories — desktop */}
            <nav className="hidden items-center gap-0.5 lg:flex">
              {categories.slice(0, 6).map((c) => (
                <Link
                  key={c.label}
                  to={c.href}
                  className="rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted hover:text-primary"
                >
                  {c.label}
                </Link>
              ))}
            </nav>

            <span className="mx-1 hidden h-6 w-px bg-border lg:block" />

            {/* Search toggle */}
            <button
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search"
              className="group inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-muted active:scale-95 md:h-10 md:w-10"
            >
              <Search className="h-5 w-5 transition-transform group-hover:scale-110" />
            </button>

            {/* Cart */}
            <button
              onClick={() => setOpen(true)}
              aria-label="Cart"
              className="group relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-muted active:scale-95 md:h-10 md:w-10"
            >
              <ShoppingBag className="h-5 w-5 transition-transform group-hover:scale-110 group-hover:-rotate-12" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 animate-scale-in items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
                  <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary opacity-40" />
                  {count}
                </span>
              )}
            </button>
          </div>

          {/* Account card */}
          <button
            aria-label="Account"
            className={`group hidden shrink-0 items-center gap-2 rounded-full px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 md:inline-flex md:px-4 md:py-2.5 ${
              scrolled
                ? "border border-transparent bg-transparent shadow-none"
                : "border border-border bg-background/90 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.18)] backdrop-blur-xl"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <User className="h-4 w-4" />
            </span>
            <span className="hidden flex-col leading-tight md:flex">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account</span>
              <span className="text-xs font-bold text-foreground">Sign in</span>
            </span>
          </button>
        </div>

        {/* Expandable search */}
        <div
          className={`mx-auto max-w-7xl overflow-hidden transition-all duration-300 ${
            searchOpen ? "mt-2 max-h-20 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="relative rounded-full border border-border bg-background/95 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              autoFocus={searchOpen}
              placeholder="Search gadgets, gifts, decor…"
              className="h-12 w-full rounded-full bg-transparent pl-12 pr-28 text-sm outline-none focus:ring-4 focus:ring-primary/15"
            />
            <button className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition hover:scale-105 active:scale-95">
              Search
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <div
          className={`mx-auto max-w-7xl overflow-hidden transition-all duration-300 lg:hidden ${
            mobileOpen ? "mt-2 max-h-[70vh] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <nav className="flex flex-col rounded-2xl border border-border bg-background/95 p-2 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            {categories.map((c) => (
              <Link
                key={c.label}
                to={c.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-foreground transition hover:bg-muted hover:text-primary"
              >
                {c.label}
              </Link>
            ))}
            <button className="mt-1 flex items-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground">
              <User className="h-4 w-4" /> Sign in
            </button>
          </nav>
        </div>

        {/* Scroll progress */}
        <div className="mx-auto mt-2 h-0.5 max-w-7xl overflow-hidden rounded-full bg-border/50">
          <div
            className="h-full bg-gradient-to-r from-primary via-primary to-primary/70 shadow-[0_0_8px_var(--primary)] transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </header>
  );
}
