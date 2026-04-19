import { createFileRoute, Link } from "@tanstack/react-router";
import { RotateCcw, ShieldCheck, Clock, Package, CheckCircle2, XCircle, Phone, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: "Returns & Refund Policy — HobbyShop" },
      { name: "description", content: "7-day easy return & refund policy. Damaged or wrong product? We'll exchange or refund — hassle free, anywhere in Bangladesh." },
      { property: "og:title", content: "Returns & Refund Policy — HobbyShop" },
      { property: "og:description", content: "7-day easy return & refund policy across Bangladesh." },
    ],
  }),
  component: ReturnsPage,
});

function ReturnsPage() {
  const eligible = [
    "Product damaged or defective on arrival",
    "Wrong product delivered (different model/color)",
    "Product significantly different from description",
    "Manufacturing defect within warranty period",
  ];
  const notEligible = [
    "Used/opened items without defect",
    "Items damaged due to misuse",
    "Request placed after 7 days from delivery",
    "Free gift items or promotional bundles",
  ];

  const steps = [
    { n: 1, title: "Contact Us", desc: "Call/WhatsApp within 7 days of delivery with order ID and photos." },
    { n: 2, title: "Approval", desc: "Our team reviews and approves return within 24 hours." },
    { n: 3, title: "Pickup/Return", desc: "We arrange pickup (Dhaka) or you courier the item back." },
    { n: 4, title: "Refund/Exchange", desc: "Refund processed in 3-5 business days or replacement shipped." },
  ];

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="mx-auto max-w-5xl px-4 py-14 text-center md:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Buyer Protection
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Easy 7-Day <span className="text-primary">Returns & Refunds</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Not happy with your purchase? No worries. We'll make it right — quick refund or replacement, hassle-free.
          </p>
        </div>
      </section>

      {/* Quick stats */}
      <section className="mx-auto -mt-6 max-w-5xl px-4">
        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:gap-4 sm:p-6">
          {[
            { icon: Clock, label: "7 Days", sub: "Return window" },
            { icon: RotateCcw, label: "100%", sub: "Refund guarantee" },
            { icon: Package, label: "Free Pickup", sub: "Dhaka city" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className="mx-auto h-5 w-5 text-primary sm:h-6 sm:w-6" />
              <div className="mt-1 text-base font-extrabold text-foreground sm:text-lg">{s.label}</div>
              <div className="text-[11px] text-muted-foreground sm:text-xs">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">How It Works</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-md">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">{s.n}</div>
              <h3 className="mt-3 text-base font-bold text-foreground">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Eligible / Not eligible */}
      <section className="mx-auto max-w-5xl px-4 pb-12">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-[oklch(0.65_0.18_150)]/30 bg-[oklch(0.65_0.18_150)]/5 p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <CheckCircle2 className="h-5 w-5 text-[oklch(0.55_0.18_150)]" /> Eligible for Return
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-foreground">
              {eligible.map((e) => (
                <li key={e} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.55_0.18_150)]" />
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <XCircle className="h-5 w-5 text-destructive" /> Not Eligible
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-foreground">
              {notEligible.map((e) => (
                <li key={e} className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Refund timeline */}
      <section className="mx-auto max-w-5xl px-4 pb-12">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h3 className="text-lg font-bold text-foreground sm:text-xl">Refund Timeline</h3>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Cash on Delivery:</strong> Refund via bKash/Nagad within 3-5 business days after we receive the returned item.</p>
            <p><strong className="text-foreground">Online Payment:</strong> Refund to original payment method within 5-7 business days.</p>
            <p><strong className="text-foreground">Exchange:</strong> Replacement shipped within 1-2 business days of receiving the returned item.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 text-center sm:p-10">
          <h3 className="text-xl font-bold text-foreground sm:text-2xl">Need to return an item?</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Our friendly support team is ready to help. Reach out via phone, WhatsApp or our contact form.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a href="tel:09638779900" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition hover:scale-105">
              <Phone className="h-4 w-4" /> 09638779900
            </a>
            <a href="https://wa.me/8809638779900" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary">
              Contact Form
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
