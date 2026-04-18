import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Sparkles, Users, Target, Award, Truck } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — HobbyShop" },
      { name: "description", content: "Learn about HobbyShop's mission to bring curated gadgets, decor and gifts to every home in Bangladesh." },
      { property: "og:title", content: "About Us — HobbyShop" },
      { property: "og:description", content: "Curated gadgets, decor & gifts shipped fast across Bangladesh." },
    ],
  }),
  component: AboutPage,
});

const stats = [
  { icon: Users, label: "Happy Customers", value: "50,000+" },
  { icon: Award, label: "Authentic Products", value: "500+" },
  { icon: Truck, label: "Cities Delivered", value: "64" },
  { icon: Heart, label: "5-Star Reviews", value: "12,400+" },
];

const values = [
  { icon: Sparkles, title: "Curated Quality", desc: "Every product is hand-picked and tested before it ever reaches our shelves." },
  { icon: Target, title: "Fair Prices", desc: "We cut the middlemen and pass the savings to you — no inflated markups." },
  { icon: Heart, title: "Customer First", desc: "Real humans answer your questions. Real solutions, not scripts." },
];

function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" /> Our Story
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">
          Bringing <span className="text-primary">joy</span> to every home in Bangladesh
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          HobbyShop started in 2022 with a simple idea — make unique, useful and beautiful products
          accessible to everyone. From gadgets that simplify your day to decor that transforms your
          space, we believe every home deserves a little upgrade.
        </p>
      </div>

      {/* Stats */}
      <div className="mt-12 grid grid-cols-2 gap-4 md:mt-16 md:grid-cols-4 md:gap-6">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 text-center shadow-[var(--shadow-card)]">
            <Icon className="mx-auto h-6 w-6 text-primary" />
            <div className="mt-2 text-2xl font-extrabold text-foreground md:text-3xl">{value}</div>
            <div className="text-xs text-muted-foreground md:text-sm">{label}</div>
          </div>
        ))}
      </div>

      {/* Values */}
      <div className="mt-16 md:mt-20">
        <h2 className="text-center text-2xl font-extrabold tracking-tight md:text-3xl">What we stand for</h2>
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {values.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-16 rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-8 text-center text-primary-foreground md:mt-20 md:p-12">
        <h2 className="text-2xl font-extrabold md:text-3xl">Ready to explore?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm opacity-90 md:text-base">
          Browse our hand-picked collection and find something that brings you joy.
        </p>
        <Link
          to="/shop"
          className="mt-5 inline-flex rounded-full bg-background px-7 py-3 text-sm font-bold text-primary shadow-md transition hover:scale-105"
        >
          Shop Now
        </Link>
      </div>
    </div>
  );
}
