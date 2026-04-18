// About page — bilingual story + product request form
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Sparkles, Users, Award, Truck, Languages, Search, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Story — HobbyShop" },
      { name: "description", content: "HobbyShop started in February 2022 with drones and grew into a curated home for unique gadgets, stylish watches and aesthetic room decor across Bangladesh." },
      { property: "og:title", content: "Our Story — HobbyShop" },
      { property: "og:description", content: "We don't just sell products — we sell what you love." },
    ],
  }),
  component: AboutPage,
});

const stats = [
  { icon: Users, label: "Happy Customers", value: "15,000+" },
  { icon: Award, label: "Curated Products", value: "500+" },
  { icon: Truck, label: "Cities Delivered", value: "64" },
  { icon: Heart, label: "Since", value: "Feb 2022" },
];


function AboutPage() {
  const [lang, setLang] = useState<"en" | "bn">("en");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
      {/* Hero */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" /> Our Story
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">
          We don't just sell products… <br className="hidden md:block" />
          we sell <span className="text-primary">what you love</span> ✨
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          HobbyShop is a place for people who love their hobbies.
        </p>
      </div>

      {/* Stats */}
      <div className="mt-10 grid grid-cols-2 gap-3 md:mt-14 md:grid-cols-4 md:gap-5">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 text-center shadow-[var(--shadow-card)]">
            <Icon className="mx-auto h-6 w-6 text-primary" />
            <div className="mt-2 text-xl font-extrabold text-foreground md:text-2xl">{value}</div>
            <div className="text-xs text-muted-foreground md:text-sm">{label}</div>
          </div>
        ))}
      </div>

      {/* Story with language toggle */}
      <section className="mt-14 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] md:p-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Languages className="h-4 w-4 text-primary" /> Read in your language
          </div>
          <div className="inline-flex rounded-full border border-border bg-muted/40 p-1">
            <button
              onClick={() => setLang("en")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                lang === "en" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLang("bn")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                lang === "bn" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>

        {lang === "en" ? (
          <div>
            <h2 className="text-2xl font-extrabold md:text-3xl">
              Our Story – HobbyShop <span className="ml-1">💫</span>
            </h2>
            <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-muted-foreground md:text-base">
              <p>It all started in <span className="font-semibold text-foreground">February 2022</span>… small, simple, but with a big vision.</p>
              <p>
                At the beginning, we were just selling <span className="font-semibold text-foreground">drones</span>. Nothing fancy.
                Just trying to build something of our own. But slowly, we realized something important — people don't just buy products…
                they buy things they love.
              </p>
              <p className="font-semibold text-foreground">That's when HobbyShop started to change.</p>
              <p>
                We began adding <span className="font-semibold text-foreground">unique gadgets, stylish watches, and aesthetic room décor</span> —
                products that actually feel personal. Products that match মানুষের শখ, vibe, আর personality.
              </p>
              <p>
                Today, HobbyShop isn't just a shop. <br />
                It's a place for people who love their hobbies.
              </p>
              <p className="text-lg font-bold text-primary">We don't just sell products… we sell what you love.</p>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-extrabold md:text-3xl">
              আমাদের গল্প – HobbyShop <span className="ml-1">💫</span>
            </h2>
            <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-muted-foreground md:text-base">
              <p><span className="font-semibold text-foreground">২০২২ সালের ফেব্রুয়ারি…</span> ছোট করে শুরু, কিন্তু বড় স্বপ্ন নিয়ে।</p>
              <p>
                শুরুর দিকে আমরা শুধু <span className="font-semibold text-foreground">ড্রোন</span> সেল করতাম। ধীরে ধীরে বুঝলাম —
                মানুষ শুধু প্রোডাক্ট কিনে না, তারা নিজের পছন্দ, শখ আর ভালো লাগার জিনিস খুঁজে।
              </p>
              <p className="font-semibold text-foreground">সেখান থেকেই শুরু হয় পরিবর্তন।</p>
              <p>
                আমরা নিয়ে আসি <span className="font-semibold text-foreground">ইউনিক গ্যাজেট, স্টাইলিশ ঘড়ি আর রুম ডেকর</span> —
                যেগুলো শুধু ব্যবহার করার জন্য না, বরং নিজের মতো করে অনুভব করার জন্য।
              </p>
              <p>
                আজ HobbyShop শুধু একটা শপ না, <br />
                এটা এমন একটা জায়গা যেখানে আপনার শখ বাঁচে।
              </p>
              <p className="text-lg font-bold text-primary">আমরা শুধু প্রোডাক্ট বিক্রি করি না… আমরা আপনার ভালো লাগা বিক্রি করি। ✨</p>
            </div>
          </div>
        )}
      </section>

      {/* Product Request CTA */}
      <section className="mt-14 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-[var(--shadow-card)] md:mt-16 md:p-10">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Search className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {lang === "en" ? "Didn't find what you love?" : "আপনি যেটা খুঁজছেন সেটা পাননি?"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                {lang === "en"
                  ? "Tell us what you're looking for — share a link, image and price. We'll try to bring it for you."
                  : "আপনার পছন্দের প্রোডাক্ট আমাদের জানান — লিংক, ছবি ও দাম দিন, আমরা চেষ্টা করবো নিয়ে আসতে।"}
              </p>
            </div>
          </div>
          <Link
            to="/request"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md transition hover:scale-[1.03]"
          >
            <Send className="h-4 w-4" />
            {lang === "en" ? "Request a Product" : "প্রোডাক্ট রিকোয়েস্ট করুন"}
          </Link>
        </div>
      </section>

      {/* CTA */}
      <div className="mt-14 rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-8 text-center text-primary-foreground md:mt-16 md:p-12">
        <h2 className="text-2xl font-extrabold md:text-3xl">Find what you love</h2>
        <p className="mx-auto mt-2 max-w-md text-sm opacity-90 md:text-base">
          Browse our hand-picked collection of gadgets, watches and decor.
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
