// Footer with highlighted product-request CTA
import { Link } from "@tanstack/react-router";
import {
  Facebook,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Send,
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
  Heart,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Footer() {
  const [email, setEmail] = useState("");

  const onSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    toast.success("Subscribed! Check your inbox 🎉");
    setEmail("");
  };

  return (
    <footer className="relative mt-20 overflow-hidden border-t border-border bg-gradient-to-b from-muted/30 via-background to-muted/40">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      {/* Trust strip */}
      <div className="relative border-b border-border/60">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 sm:grid-cols-4 md:py-8">
          {[
            { icon: Truck, label: "Free Delivery", desc: "Orders over ৳1990" },
            { icon: ShieldCheck, label: "100% Authentic", desc: "Verified products" },
            { icon: RotateCcw, label: "Easy Returns", desc: "7-day exchange" },
            { icon: CreditCard, label: "Cash on Delivery", desc: "Pay on arrival" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">{f.label}</div>
                <div className="truncate text-[11px] text-muted-foreground">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 md:grid-cols-12 md:gap-8">
        {/* Brand + newsletter */}
        <div className="md:col-span-5">
          <Link to="/" className="inline-flex items-center gap-1 text-2xl font-extrabold tracking-tight">
            <span className="text-foreground">Hobby</span>
            <span className="text-primary">Shop</span>
            <Heart className="ml-1 h-5 w-5 fill-primary text-primary" />
          </Link>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Curated gadgets, decor &amp; gifts shipped fast across Bangladesh. Free delivery over ৳1990 — Cash on
            Delivery nationwide.
          </p>

          <form onSubmit={onSubscribe} className="mt-5 flex max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                aria-label="Email for newsletter"
                className="h-11 w-full rounded-full border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md transition hover:scale-[1.03]"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Subscribe</span>
            </button>
          </form>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Get flash sales, new arrivals &amp; exclusive deals — no spam, ever.
          </p>
        </div>

        {/* Shop links */}
        <div className="md:col-span-2">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Shop</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/shop" className="transition hover:text-primary">All Products</Link></li>
            <li><Link to="/shop" search={{ category: "Home Decor", sort: "popular" }} className="transition hover:text-primary">Home Decor</Link></li>
            <li><Link to="/shop" search={{ category: "Gadgets", sort: "popular" }} className="transition hover:text-primary">Gadgets</Link></li>
            <li><Link to="/shop" search={{ category: "DIY Kits", sort: "popular" }} className="transition hover:text-primary">DIY Kits</Link></li>
            <li><Link to="/wishlist" className="transition hover:text-primary">Wishlist</Link></li>
          </ul>
        </div>

        {/* Help links */}
        <div className="md:col-span-2">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Help</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="transition hover:text-primary">About Us</Link></li>
            <li><Link to="/contact" className="transition hover:text-primary">Contact</Link></li>
            <li>
              <Link
                to="/request"
                className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-md transition hover:scale-105 hover:shadow-lg"
              >
                <Sparkles className="h-3 w-3 animate-pulse" />
                Request a Product
                <span className="ml-0.5 rounded-full bg-background/25 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider">New</span>
              </Link>
            </li>
            <li><Link to="/shipping" className="transition hover:text-primary">Shipping & Returns</Link></li>
            <li><Link to="/faq" className="transition hover:text-primary">FAQ</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div className="md:col-span-3">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Get in Touch</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Dhanmondi, Dhaka 1209<br />Bangladesh</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              <a href="tel:+8801700000000" className="transition hover:text-primary">+880 1700 000 000</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              <a href="mailto:hello@hobbyshop.com" className="transition hover:text-primary">hello@hobbyshop.com</a>
            </li>
          </ul>

          <div className="mt-4 flex items-center gap-2">
            {[
              { icon: Facebook, label: "Facebook", href: "#" },
              { icon: Instagram, label: "Instagram", href: "#" },
              { icon: Youtube, label: "YouTube", href: "#" },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:scale-110 hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-border/60 bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-1.5">
            <span>© {new Date().getFullYear()} HobbyShop. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Made with</span>
            <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
            <span>in Bangladesh</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/privacy" className="transition hover:text-primary">Privacy</Link>
            <span className="opacity-40">•</span>
            <Link to="/terms" className="transition hover:text-primary">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
