import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, RotateCcw, MapPin, Clock, Package, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/shipping")({
  head: () => ({
    meta: [
      { title: "Shipping & Returns — HobbyShop" },
      { name: "description", content: "Delivery times, shipping fees, and easy 7-day return policy across Bangladesh." },
      { property: "og:title", content: "Shipping & Returns — HobbyShop" },
      { property: "og:description", content: "Fast nationwide delivery and hassle-free returns." },
    ],
  }),
  component: ShippingPage,
});

const zones = [
  { area: "Inside Dhaka", time: "1 – 2 days", fee: "৳60", icon: MapPin },
  { area: "Dhaka Suburb", time: "2 – 3 days", fee: "৳100", icon: MapPin },
  { area: "Outside Dhaka", time: "3 – 5 days", fee: "৳130", icon: MapPin },
];

const returnSteps = [
  { title: "Request a return", desc: "Contact us within 7 days of delivery via WhatsApp, email or phone." },
  { title: "Pack the item", desc: "Place the unused product in its original packaging with all accessories." },
  { title: "Schedule pickup", desc: "We'll arrange a free pickup from your address — no shipping cost on you." },
  { title: "Get refunded", desc: "Refund processed within 3–5 business days after we receive the item." },
];

function ShippingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Truck className="h-3 w-3" /> Delivery & Returns
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">
          Shipping & <span className="text-primary">Returns</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          Fast nationwide delivery, transparent fees, and 7-day no-questions-asked returns.
        </p>
      </div>

      {/* Shipping */}
      <section className="mt-12">
        <div className="mb-5 flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-extrabold md:text-2xl">Shipping Information</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {zones.map(({ area, time, fee, icon: Icon }) => (
            <div key={area} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <Icon className="h-6 w-6 text-primary" />
              <div className="mt-3 text-sm font-bold text-foreground">{area}</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {time}
              </div>
              <div className="mt-1 text-lg font-extrabold text-primary">{fee}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <Package className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="text-sm">
            <div className="font-bold text-foreground">FREE Delivery on orders over ৳1500</div>
            <div className="mt-0.5 text-muted-foreground">No code needed — discount applied automatically at checkout.</div>
          </div>
        </div>
      </section>

      {/* Returns */}
      <section className="mt-14">
        <div className="mb-5 flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-extrabold md:text-2xl">7-Day Easy Returns</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {returnSteps.map((step, i) => (
            <div key={step.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <div className="text-sm font-bold text-foreground">{step.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Return conditions
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>• Product must be unused and in original packaging.</li>
            <li>• All accessories, tags, and freebies must be included.</li>
            <li>• Some categories (e.g., personal care) are non-returnable.</li>
          </ul>
        </div>
      </section>

      <div className="mt-12 text-center">
        <Link to="/contact" className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90">
          Need help with a return? Contact us
        </Link>
      </div>
    </div>
  );
}
