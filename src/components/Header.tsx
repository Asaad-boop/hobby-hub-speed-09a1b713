import { Link, useNavigate } from "@tanstack/react-router";
import { Search, User, ShoppingBag, Menu, X, Heart, Phone, Shield, Clock, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useAdminAuth } from "@/lib/admin";
import { useSiteSettings } from "@/lib/site-settings";
import { useProducts, type Product } from "@/lib/products";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import defaultLogo from "@/assets/logo.png";

const RECENT_KEY = "recent_searches_v1";
const MAX_RECENT = 5;
const MAX_SUGGESTIONS = 6;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(q: string) {
  if (typeof window === "undefined" || !q.trim()) return;
  try {
    const cur = loadRecent().filter((x) => x.toLowerCase() !== q.toLowerCase());
    const next = [q, ...cur].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

type Category = { label: string; category: string };

const categories: Category[] = [
  { label: "All Products", category: "All" },
  { label: "Home Decor", category: "Home Decor" },
  { label: "Gadgets 🔥", category: "Gadgets" },
  { label: "DIY Kits", category: "DIY Kits" },
];

export default function Header() {
  const { count, setOpen } = useCart();
  const { count: wishCount } = useWishlist();
  const { isAdmin } = useAdminAuth();
  const { data: settings } = useSiteSettings();
  const logo = settings?.logo_url || defaultLogo;
  const phone = settings?.contact_phone || "";
  const siteName = settings?.site_title || "HobbyShop";
  const freeThreshold = settings?.free_delivery_threshold ?? 1500;
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [progress, setProgress] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const { data: allProducts = [] } = useProducts();

  // Compute autocomplete suggestions
  const suggestions = useMemo<Product[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const scored = allProducts
      .map((p) => {
        const title = p.title.toLowerCase();
        const cat = (p.category || "").toLowerCase();
        let score = 0;
        if (title.startsWith(q)) score = 100;
        else if (title.includes(q)) score = 70;
        else if (cat.includes(q)) score = 40;
        else if (p.benefits.some((b) => b.toLowerCase().includes(q))) score = 20;
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.p.rating - a.p.rating)
      .slice(0, MAX_SUGGESTIONS)
      .map((x) => x.p);
    return scored;
  }, [searchQuery, allProducts]);

  const trendingProducts = useMemo<Product[]>(() => {
    return [...allProducts]
      .sort((a, b) => b.reviews - a.reviews || b.rating - a.rating)
      .slice(0, 4);
  }, [allProducts]);

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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Focus search input when opened + load recent
  useEffect(() => {
    if (searchOpen) {
      setRecent(loadRecent());
      setActiveIdx(-1);
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  // Close suggestions on outside click
  useEffect(() => {
    if (!searchOpen) return;
    const onClick = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [searchOpen]);

  const goToProduct = (p: Product) => {
    saveRecent(p.title);
    setSearchOpen(false);
    setMobileOpen(false);
    setSearchQuery("");
    navigate({ to: "/product/$id", params: { id: p.id } });
  };

  const goToSearch = (q: string) => {
    const term = q.trim();
    if (term) saveRecent(term);
    setSearchOpen(false);
    setMobileOpen(false);
    navigate({
      to: "/shop",
      search: { category: "All", sort: "popular", q: term || undefined } as any,
    });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // If a suggestion is highlighted, go to it
    if (activeIdx >= 0 && activeIdx < suggestions.length) {
      goToProduct(suggestions[activeIdx]);
      return;
    }
    goToSearch(searchQuery);
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    }
  };

  const showDropdown = searchOpen && (suggestions.length > 0 || (!searchQuery.trim() && (recent.length > 0 || trendingProducts.length > 0)));

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-500 ${
        scrolled
          ? "bg-background/85 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.18)] backdrop-blur-2xl"
          : "bg-background"
      }`}
    >
      {/* Announcement bar */}
      <div
        className={`relative overflow-hidden bg-gradient-to-r from-foreground via-[oklch(0.22_0.02_20)] to-foreground text-background transition-all duration-500 ${
          scrolled ? "max-h-0 opacity-0" : "max-h-10 opacity-100"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent bg-[length:200%_100%] animate-[shimmer_5s_linear_infinite]" />
        <div className="relative mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4 text-[12px]">
          <p className="hidden items-center gap-1.5 sm:flex">
            <span>🚚</span>
            <span>Free delivery on orders over <span className="font-bold text-primary-foreground">৳{freeThreshold.toLocaleString()}</span></span>
          </p>
          <p className="sm:hidden">🚚 Free delivery over ৳{freeThreshold.toLocaleString()}</p>
          <div className="hidden items-center gap-4 md:flex">
            <span className="opacity-80">💰 Cash on Delivery</span>
            {phone && (
              <>
                <span className="h-3 w-px bg-background/30" />
                <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 opacity-90 transition hover:text-primary hover:opacity-100">
                  <Phone className="h-3 w-3" /> {phone}
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <div
        className={`transition-all duration-500 ${
          scrolled ? "py-1" : "py-1.5 md:py-2"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 md:gap-6 md:px-6">
          {/* Logo */}
          <Link
            to="/"
            aria-label={`${siteName} — Touch Your Dream`}
            className="group relative flex shrink-0 items-center"
          >
            <span className="pointer-events-none absolute -inset-2 -z-10 rounded-2xl bg-primary/0 blur-xl transition-all duration-500 group-hover:bg-primary/25" />
            <img
              src={logo}
              alt={siteName}
              width={1024}
              height={1024}
              loading="lazy"
              className={`w-auto object-contain transition-all duration-500 group-hover:scale-105 ${
                scrolled ? "h-10 md:h-12" : "h-12 md:h-14"
              }`}
            />
          </Link>

          {/* Desktop categories */}
          <nav className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
            {categories.map((c) => (
              <Link
                key={c.label}
                to="/shop"
                search={{ category: c.category, sort: "popular" } as any}
                className="group relative whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-medium text-foreground/75 transition-colors hover:text-primary xl:px-3 xl:text-sm"
              >
                <span className="relative z-10">{c.label}</span>
                <span className="absolute inset-0 -z-0 scale-90 rounded-full bg-primary/8 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
                <span className="absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-primary transition-all duration-300 group-hover:w-6" />
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1 md:gap-1.5">
            {/* Search */}
            <button
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search"
              className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95 md:h-11 md:w-11"
            >
              <Search className="h-[18px] w-[18px] transition-transform group-hover:scale-110" />
            </button>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95 md:h-11 md:w-11"
            >
              <Heart className="h-[18px] w-[18px] transition-transform group-hover:scale-110" />
              {wishCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] animate-scale-in items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
                  {wishCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <button
              onClick={() => setOpen(true)}
              aria-label="Cart"
              className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95 md:h-11 md:w-11"
            >
              <ShoppingBag className="h-[18px] w-[18px] transition-transform group-hover:scale-110 group-hover:-rotate-12" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] animate-scale-in items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
                  <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary opacity-40" />
                  {count}
                </span>
              )}
            </button>

            {/* Language switcher */}
            <LanguageSwitcher compact />

            <span className="mx-1 hidden h-7 w-px bg-border md:block" />

            {/* Admin link (only for admins) */}
            {isAdmin && (
              <Link
                to="/admin"
                aria-label="Admin"
                title="Admin panel"
                className="hidden h-10 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground md:inline-flex md:h-11"
              >
                <Shield className="h-4 w-4" /> Admin
              </Link>
            )}

            {/* Account */}
            <Link
              to="/account"
              aria-label="Account"
              className="group hidden shrink-0 items-center gap-2.5 rounded-full border border-border bg-background px-3.5 py-2 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_8px_24px_-10px_oklch(0.585_0.245_27.5/0.5)] md:inline-flex"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <User className="h-4 w-4" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account</span>
                <span className="text-xs font-bold text-foreground">Sign in</span>
              </span>
            </Link>

            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={mobileOpen}
              className="group relative ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95 lg:hidden"
            >
              <span className="relative inline-flex h-5 w-5 items-center justify-center">
                <Menu className={`absolute h-5 w-5 transition-all duration-300 ${mobileOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"}`} />
                <X className={`absolute h-5 w-5 transition-all duration-300 ${mobileOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"}`} />
              </span>
            </button>
          </div>
        </div>

        {/* Expandable search with autocomplete */}
        <div
          ref={searchWrapperRef}
          className={`mx-auto max-w-7xl overflow-visible px-4 transition-all duration-300 md:px-6 ${
            searchOpen ? "mt-3 opacity-100" : "pointer-events-none mt-0 max-h-0 opacity-0"
          }`}
        >
          <form onSubmit={submitSearch} className="relative">
            <div className="relative rounded-full border border-border bg-background shadow-[0_8px_30px_-10px_rgba(0,0,0,0.15)]">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveIdx(-1);
                }}
                onKeyDown={handleSearchKey}
                placeholder="Search gadgets, gifts, decor…"
                className="h-12 w-full rounded-full bg-transparent pl-12 pr-28 text-sm outline-none focus:ring-4 focus:ring-primary/15"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveIdx(-1);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-24 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition hover:scale-105 active:scale-95"
              >
                Search
              </button>
            </div>

            {showDropdown && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-background p-2 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]">
                {suggestions.length > 0 ? (
                  <div>
                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Products</p>
                    {suggestions.map((p, i) => (
                      <button
                        type="button"
                        key={p.id}
                        onMouseEnter={() => setActiveIdx(i)}
                        onClick={() => goToProduct(p)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                          activeIdx === i ? "bg-primary/10" : "hover:bg-muted/60"
                        }`}
                      >
                        <img src={p.image} alt={p.title} loading="lazy" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{p.category}</p>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-primary">৳{p.price.toLocaleString()}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => goToSearch(searchQuery)}
                      className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-semibold text-foreground/80 transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                    >
                      <Search className="h-3.5 w-3.5" /> See all results for &ldquo;{searchQuery}&rdquo;
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recent.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between px-3 py-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent</p>
                          <button
                            type="button"
                            onClick={() => {
                              try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
                              setRecent([]);
                            }}
                            className="text-[10px] font-medium text-muted-foreground hover:text-primary"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 px-3 pb-1">
                          {recent.map((r) => (
                            <button
                              type="button"
                              key={r}
                              onClick={() => {
                                setSearchQuery(r);
                                searchInputRef.current?.focus();
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-foreground transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                            >
                              <Clock className="h-3 w-3" /> {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {trendingProducts.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <TrendingUp className="h-3 w-3" /> Trending
                        </p>
                        {trendingProducts.map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => goToProduct(p)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-muted/60"
                          >
                            <img src={p.image} alt={p.title} loading="lazy" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                              <p className="truncate text-[11px] text-muted-foreground">{p.category}</p>
                            </div>
                            <span className="shrink-0 text-sm font-bold text-primary">৳{p.price.toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Mobile drawer */}
        <div
          className={`mx-auto max-w-7xl overflow-hidden px-4 transition-all duration-300 lg:hidden ${
            mobileOpen ? "mt-3 max-h-[75vh] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <nav className="flex flex-col rounded-2xl border border-border bg-background p-2 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.2)]">
            {categories.map((c) => (
              <Link
                key={c.label}
                to="/shop"
                search={{ category: c.category, sort: "popular" } as any}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"
              >
                {c.label}
              </Link>
            ))}
            <Link
              to="/account"
              onClick={() => setMobileOpen(false)}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground shadow-[0_8px_24px_-8px_oklch(0.585_0.245_27.5/0.6)]"
            >
              <User className="h-4 w-4" /> Sign in
            </Link>
          </nav>
        </div>
      </div>

      {/* Scroll progress */}
      <div className="h-0.5 w-full overflow-hidden bg-border/40">
        <div
          className="h-full bg-gradient-to-r from-primary via-primary to-primary/60 shadow-[0_0_8px_var(--primary)] transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}
