import { Link } from "@tanstack/react-router";
import { Home, Search, ShoppingBag, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[calc(100vh-200px)] items-center justify-center overflow-hidden bg-background px-4 py-16">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Lost in the shop
        </p>

        <h1 className="mt-6 text-[80px] font-black leading-none tracking-tight text-foreground sm:text-[120px]">
          <span className="bg-gradient-to-br from-primary via-primary to-primary/50 bg-clip-text text-transparent">
            404
          </span>
        </h1>

        <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
          Oops! Page not found
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          The page you're looking for doesn't exist or has been moved. Try one of these instead:
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_-10px_oklch(0.585_0.245_27.5/0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-10px_oklch(0.585_0.245_27.5/0.7)] active:scale-95"
          >
            <Home className="h-4 w-4" /> Go Home
          </Link>
          <Link
            to="/shop"
            search={{ category: "All", sort: "popular" } as any}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-bold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary active:scale-95"
          >
            <ShoppingBag className="h-4 w-4" /> Browse Shop
          </Link>
        </div>

        <div className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-2">
          <Link
            to="/shop"
            search={{ category: "All", sort: "popular" } as any}
            className="group rounded-xl border border-border bg-card p-3 text-center transition hover:border-primary/40 hover:bg-primary/5"
          >
            <Search className="mx-auto h-4 w-4 text-primary" />
            <span className="mt-1 block text-[11px] font-medium text-foreground">Search</span>
          </Link>
          <Link
            to="/track"
            className="group rounded-xl border border-border bg-card p-3 text-center transition hover:border-primary/40 hover:bg-primary/5"
          >
            <ArrowLeft className="mx-auto h-4 w-4 text-primary" />
            <span className="mt-1 block text-[11px] font-medium text-foreground">Track Order</span>
          </Link>
          <Link
            to="/contact"
            className="group rounded-xl border border-border bg-card p-3 text-center transition hover:border-primary/40 hover:bg-primary/5"
          >
            <Home className="mx-auto h-4 w-4 text-primary" />
            <span className="mt-1 block text-[11px] font-medium text-foreground">Contact</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
