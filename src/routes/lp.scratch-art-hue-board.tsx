import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BD_DISTRICTS } from "@/lib/bd-locations";
import { getOrderAttributionPayload } from "@/lib/session-tracking";
import { placeOrder } from "@/lib/place-order.functions";
import { fbTrack, META_CURRENCY } from "@/lib/meta-pixel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sparkles,
  ShieldCheck,
  Truck,
  BadgeCheck,
  Star,
  Quote,
  Brain,
  Smile,
  Eye,
  Palette,
  Hand,
  Loader2,
  Phone,
  Minus,
  Plus,
  Gift,
  Clock,
  CheckCircle2,
  Heart,
  PackageCheck,
  Smartphone,
} from "lucide-react";

import heroImg from "@/assets/scratch-hero.jpg";
import kidImg from "@/assets/scratch-kid.jpg";
import resultImg from "@/assets/scratch-result.jpg";
import kitImg from "@/assets/scratch-kit.jpg";
import reviewPhoto1 from "@/assets/review-customer-1.webp";
import reviewPhoto2 from "@/assets/review-customer-2.webp";

// A real product row in the DB so order_items.product_id satisfies NOT NULL.
const TARGET_PRODUCT_ID = "3d27aa15-5761-4550-b5b1-28e21ea675df"; // Dream Castle – A3 Scratch Art Hue Board
const SHIPPING_INSIDE = 70;
const SHIPPING_OUTSIDE = 130;
const WHATSAPP_NUMBER = "8801700000000"; // Update with real number

const SINGLE_PRICE = 590;
const SINGLE_OLD = 890;
const COMBO_PRICE = 1090;
const COMBO_OLD = 1780;

export const Route = createFileRoute("/lp/scratch-art-hue-board")({
  head: () => ({
    meta: [
      { title: "Scratch Art Hue Board — Bacchar Creativity Baran 🎨 | COD" },
      {
        name: "description",
        content:
          "Scratch Art Hue Board — bacchara khelar maddhome shikhbe art & imagination. Screen time koman, creativity baran. Cash on Delivery sara Bangladesh.",
      },
      { property: "og:title", content: "Scratch Art Hue Board — Kids Creativity Kit" },
      {
        property: "og:description",
        content:
          "Black scratch korle bere ashbe rangin design. Bacchar best gift 🎁 — COD available.",
      },
    ],
  }),
  component: LP,
});

// -- helpers --------------------------------------------------------------
function Stars({ n = 5 }: { n?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < n ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg">
          <Sparkles className="h-3 w-3" /> {eyebrow}
        </span>
      ) : null}
      <h2 className="mt-3 text-balance text-2xl font-extrabold leading-tight text-foreground sm:text-3xl md:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

// -------------------------------------------------------------------------
function LP() {
  const navigate = useNavigate();
  const placeOrderFn = useServerFn(placeOrder);
  const orderRef = useRef<HTMLDivElement | null>(null);

  const [variant, setVariant] = useState<"single" | "combo">("single");
  const [qty, setQty] = useState(1);
  const [shipMethod, setShipMethod] = useState<"inside" | "outside">("inside");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", district: "" });

  // Countdown for urgency (resets each visit)
  const [secondsLeft, setSecondsLeft] = useState(() => 3 * 60 * 60 + 47 * 60); // ~3h47m
  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(Math.floor(secondsLeft / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const unitPrice = variant === "combo" ? COMBO_PRICE : SINGLE_PRICE;
  const oldPrice = variant === "combo" ? COMBO_OLD : SINGLE_OLD;
  const subtotal = unitPrice * qty;
  const shippingFee = shipMethod === "inside" ? SHIPPING_INSIDE : SHIPPING_OUTSIDE;
  const totalPay = subtotal + shippingFee;
  const savings = oldPrice * qty - subtotal;

  useEffect(() => {
    fbTrack("ViewContent", {
      content_ids: [TARGET_PRODUCT_ID],
      content_name: "Scratch Art Hue Board",
      value: unitPrice,
      currency: META_CURRENCY,
    });
  }, [unitPrice]);

  const scrollToOrder = () =>
    orderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const variantLabel = useMemo(
    () =>
      variant === "combo"
        ? "Buy 2 Combo (2 Boards + Pen Set)"
        : "Single Board (1 Board + Pen Set)",
    [variant]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.name.trim();
    const trimmedAddress = form.address.trim();
    const normalizedPhone = form.phone.trim().replace(/\s|-/g, "");
    const phoneValid = /^(\+?880|0)1[3-9]\d{8}$/.test(normalizedPhone);

    if (!trimmedName || !normalizedPhone || !trimmedAddress) {
      toast.error("Naam, phone, address fill korun.");
      return;
    }
    if (!phoneValid) {
      toast.error("Sothik Bangladeshi phone number din (e.g. 01712345678).");
      return;
    }
    if (!form.district) {
      toast.error("District select korun.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isGuest = !session;
      const attribution = getOrderAttributionPayload();

      const baseOrder = {
        status: "new" as const,
        subtotal,
        shipping_fee: shippingFee,
        discount_amount: 0,
        coupon_code: null,
        total: totalPay,
        payment_method: "cod",
        shipping_name: trimmedName,
        shipping_phone: normalizedPhone,
        shipping_address: trimmedAddress,
        shipping_city: form.district,
        shipping_district: form.district,
        source_website: "lp/scratch-art-hue-board",
        notes: `Variant: ${variantLabel}`,
        ...attribution,
      };

      const orderInsert = isGuest
        ? {
            ...baseOrder,
            user_id: null,
            is_guest_order: true,
            guest_name: trimmedName,
            guest_phone: normalizedPhone,
          }
        : { ...baseOrder, user_id: session!.user.id };

      const userId = isGuest ? null : session!.user.id;
      const items = [
        {
          user_id: userId,
          product_id: TARGET_PRODUCT_ID,
          name: `Scratch Art Hue Board — ${variantLabel}`,
          image: heroImg,
          price: unitPrice,
          quantity: variant === "combo" ? qty * 2 : qty,
          variant_id: null,
          variant_label: variantLabel,
        },
      ];

      const placeRes = await placeOrderFn({ data: { order: orderInsert, items } });
      if (!placeRes.ok) {
        console.error("Order error:", placeRes.error, "payload:", orderInsert);
        toast.error(placeRes.error ?? "Order place hocche na, abar try korun.");
        setSubmitting(false);
        return;
      }

      toast.success("Order place hoyeche! Confirm korar jonno call korbo.");
      navigate({ to: "/order-success/$orderId", params: { orderId: placeRes.orderId } });
    } catch (err: any) {
      console.error("Order error:", err);
      toast.error(err?.message ?? "Kichu ekta vul hoyeche, abar try korun.");
      setSubmitting(false);
    }
  };

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "Assalamu alaikum, ami Scratch Art Hue Board order korte chai 🎨"
  )}`;

  return (
    <div className="bg-background text-foreground">
      {/* Top urgency strip */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-[12px] font-semibold sm:text-sm">
          <Clock className="h-3.5 w-3.5" />
          <span>Ajker offer ses hote</span>
          <span className="rounded bg-white/20 px-2 py-0.5 font-mono tabular-nums">
            {hh}:{mm}:{ss}
          </span>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 10%, oklch(0.78 0.18 320 / 0.35), transparent 60%), radial-gradient(50% 40% at 90% 30%, oklch(0.78 0.18 50 / 0.30), transparent 70%), linear-gradient(180deg, #fff, #fff)",
          }}
        />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-12 pt-8 md:grid-cols-2 md:gap-10 md:pb-20 md:pt-14">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg">
              <Sparkles className="h-3 w-3" /> Best Gift for Kids 3–10
            </span>
            <h1 className="mt-4 text-balance text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl md:text-5xl">
              Screen time koman,{" "}
              <span className="bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-500 bg-clip-text text-transparent">
                creativity baran
              </span>{" "}
              🎨
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Scratch Art Hue Board diye bacchara khelar maddhome shikhbe art &
              imagination. Black surface scratch korle bere ashbe rangin rainbow design!
            </p>

            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-3xl font-black text-foreground sm:text-4xl">
                ৳{SINGLE_PRICE}
              </span>
              <span className="text-lg text-muted-foreground line-through">৳{SINGLE_OLD}</span>
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                {Math.round(((SINGLE_OLD - SINGLE_PRICE) / SINGLE_OLD) * 100)}% OFF
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={scrollToOrder}
                className="buy-jiggle h-14 rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600 text-base font-bold text-white hover:opacity-95"
              >
                Order Now – Cash on Delivery 🚚
              </Button>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-emerald-500 bg-white px-6 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
              >
                <Smartphone className="h-4 w-4" /> WhatsApp Order
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { icon: ShieldCheck, label: "100% Safe for Kids" },
                { icon: Truck, label: "Fast Delivery" },
                { icon: BadgeCheck, label: "COD Available" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-2xl border border-border/60 bg-white/70 p-2.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur sm:text-xs"
                >
                  <Icon className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero image */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-fuchsia-300/40 via-amber-200/40 to-cyan-200/40 blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white shadow-[0_20px_60px_-20px_oklch(0.6_0.2_300/0.45)]">
              <img
                src={heroImg}
                alt="Scratch Art Hue Board — kids scratch black to reveal rainbow art"
                width={1280}
                height={1280}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 left-4 hidden rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-border sm:flex sm:items-center sm:gap-3">
              <div className="flex -space-x-2">
                <img
                  src={reviewPhoto1}
                  alt=""
                  className="h-9 w-9 rounded-full border-2 border-white object-cover"
                />
                <img
                  src={reviewPhoto2}
                  alt=""
                  className="h-9 w-9 rounded-full border-2 border-white object-cover"
                />
                <div className="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-fuchsia-500 text-[10px] font-bold text-white">
                  +2k
                </div>
              </div>
              <div className="text-xs">
                <Stars />
                <div className="font-semibold text-foreground">2,400+ happy parents</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM → SOLUTION */}
      <section className="bg-gradient-to-b from-white to-violet-50/40 px-4 py-14 md:py-20">
        <SectionTitle
          eyebrow="Problem & Solution"
          title="Mobile addiction theke baccha k baire anun"
          subtitle="Screen time besi hole creativity, focus, ar imagination komey jay. Scratch Art Hue Board hocche moja-moja shikhar bikolpo path."
        />
        <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-rose-700">
              ❌ Problem
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-rose-900/80">
              <li>Sara din mobile-e cartoon dekhe</li>
              <li>Hate kaaj korte chay na, focus nei</li>
              <li>Creativity ar imagination komey jacche</li>
              <li>Eyes & sleep er upor karap effect</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-emerald-700">
              ✅ Solution
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-emerald-900/80">
              <li>Scratch korar moja — sob bacchara obak</li>
              <li>Hate kalam dhore fine motor skill barbe</li>
              <li>Nije design banaye creativity baray</li>
              <li>Mobile-er bodole offline shikhar khela</li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-4 py-14 md:py-20">
        <SectionTitle
          eyebrow="How It Works"
          title="3 step-e satisfying scratch art!"
        />
        <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-3">
          {[
            {
              n: 1,
              icon: Hand,
              title: "Scratch pen niye nin",
              desc: "Kit-e thakbe wooden scratch pen + stencil ruler.",
              tone: "from-fuchsia-500 to-pink-500",
            },
            {
              n: 2,
              icon: Palette,
              title: "Black surface scratch korun",
              desc: "Hat diye gently scratch korlei rainbow color uthbe.",
              tone: "from-amber-400 to-orange-500",
            },
            {
              n: 3,
              icon: Sparkles,
              title: "Colorful art reveal!",
              desc: "Sundor rangin design dekhe baccha magic feel korbe.",
              tone: "from-violet-500 to-indigo-600",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="group relative overflow-hidden rounded-3xl border border-border/60 bg-white p-6 shadow-sm transition hover:shadow-xl"
            >
              <div
                className={`absolute -right-6 -top-6 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br ${s.tone} text-3xl font-black text-white opacity-90`}
              >
                {s.n}
              </div>
              <s.icon className="h-8 w-8 text-fuchsia-600" />
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BENEFITS */}
      <section className="bg-gradient-to-b from-violet-50/40 to-amber-50/40 px-4 py-14 md:py-20">
        <SectionTitle eyebrow="Benefits" title="Bacchar jonno keno eta perfect?" />
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Brain, title: "Creativity baray", desc: "Nije design banano ar imagination develop kore." },
            { icon: Smartphone, title: "Screen time komay", desc: "Mobile theke baccha k offline kore aanay." },
            { icon: Eye, title: "Focus barae", desc: "Patience ar concentration practice hoy." },
            { icon: Hand, title: "Motor skill", desc: "Hat-er fine motor control develop kore." },
            { icon: Smile, title: "Fun + Educational", desc: "Khelar maddhome shikha — moja-o, shikha-o." },
            { icon: ShieldCheck, title: "100% Kid-safe", desc: "Non-toxic material, sharp edge nei." },
          ].map((b) => (
            <div
              key={b.title}
              className="group rounded-3xl border border-white bg-white/70 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-md">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-bold">{b.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCT SHOWCASE */}
      <section className="px-4 py-14 md:py-20">
        <SectionTitle
          eyebrow="Product Showcase"
          title="Premium quality, vibrant colors"
          subtitle="Hard cardboard base, non-toxic neon coating, smooth scratch experience."
        />
        <div className="mx-auto mt-10 grid max-w-6xl gap-4 md:grid-cols-3">
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-white shadow-sm">
            <img
              src={kidImg}
              alt="Kid happily scratching the art board"
              loading="lazy"
              width={1280}
              height={1280}
              className="aspect-square w-full object-cover"
            />
            <div className="p-4">
              <h3 className="font-bold">Bacchar prio khela</h3>
              <p className="text-sm text-muted-foreground">Hour-er por hour boshe thake.</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-white shadow-sm">
            <img
              src={resultImg}
              alt="Finished colorful scratch art"
              loading="lazy"
              width={1280}
              height={1280}
              className="aspect-square w-full object-cover"
            />
            <div className="p-4">
              <h3 className="font-bold">Rangin Result</h3>
              <p className="text-sm text-muted-foreground">Black scratch → Neon rainbow.</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-white shadow-sm">
            <img
              src={kitImg}
              alt="Full kit contents"
              loading="lazy"
              width={1280}
              height={1280}
              className="aspect-square w-full object-cover"
            />
            <div className="p-4">
              <h3 className="font-bold">Complete Kit</h3>
              <p className="text-sm text-muted-foreground">Boards + pens + stencil ruler.</p>
            </div>
          </div>
        </div>
      </section>

      {/* OFFER + ORDER FORM */}
      <section
        ref={orderRef}
        className="relative scroll-mt-24 bg-gradient-to-b from-white via-fuchsia-50/40 to-violet-50/50 px-4 py-14 md:py-20"
      >
        <SectionTitle
          eyebrow="Today's Offer"
          title="Ajker offer — stock limited!"
          subtitle="Buy 2 nile bachao ৳690. COD all over Bangladesh."
        />

        <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* Variant + qty card */}
          <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-lg font-bold">Package select korun</h3>
            <RadioGroup
              value={variant}
              onValueChange={(v) => setVariant(v as "single" | "combo")}
              className="mt-4 space-y-3"
            >
              <label
                htmlFor="v-single"
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 p-4 transition ${
                  variant === "single"
                    ? "border-fuchsia-500 bg-fuchsia-50/60 shadow-sm"
                    : "border-border hover:border-fuchsia-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="single" id="v-single" />
                  <div>
                    <div className="font-bold">Single Board</div>
                    <div className="text-xs text-muted-foreground">
                      1 Board + Scratch Pen Set
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black">৳{SINGLE_PRICE}</div>
                  <div className="text-xs text-muted-foreground line-through">৳{SINGLE_OLD}</div>
                </div>
              </label>

              <label
                htmlFor="v-combo"
                className={`relative flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 p-4 transition ${
                  variant === "combo"
                    ? "border-fuchsia-500 bg-fuchsia-50/60 shadow-sm"
                    : "border-border hover:border-fuchsia-300"
                }`}
              >
                <span className="absolute -top-3 left-4 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white shadow">
                  Best Value · Save ৳690
                </span>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="combo" id="v-combo" />
                  <div>
                    <div className="font-bold">Buy 2 Combo 🎁</div>
                    <div className="text-xs text-muted-foreground">
                      2 Boards + Scratch Pen Set
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black">৳{COMBO_PRICE}</div>
                  <div className="text-xs text-muted-foreground line-through">৳{COMBO_OLD}</div>
                </div>
              </label>
            </RadioGroup>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-muted/50 p-3">
              <span className="text-sm font-semibold">Quantity</span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-lg font-bold tabular-nums">{qty}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setQty((q) => Math.min(10, q + 1))}
                  aria-label="Increase"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-fuchsia-300 bg-fuchsia-50/40 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">৳{subtotal}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Shipping</span>
                <span className="font-semibold">৳{shippingFee}</span>
              </div>
              {savings > 0 ? (
                <div className="mt-1 flex items-center justify-between text-emerald-700">
                  <span>You save</span>
                  <span className="font-semibold">৳{savings}</span>
                </div>
              ) : null}
              <div className="mt-2 flex items-center justify-between border-t border-fuchsia-200 pt-2 text-base">
                <span className="font-bold">Total (COD)</span>
                <span className="text-xl font-black text-fuchsia-700">৳{totalPay}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
              <PackageCheck className="h-4 w-4" /> Hate peye taka din — Cash on Delivery
            </div>
          </div>

          {/* Order form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6"
          >
            <h3 className="text-lg font-bold">Order details</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Form fill korun — amra 24 ghontay call kore confirm korbo.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="name">Apnar Naam *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Apnar full name"
                  className="mt-1 h-11"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Mobile Number *</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="01XXXXXXXXX"
                    inputMode="tel"
                    className="h-11 pl-9"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="district">District *</Label>
                <select
                  id="district"
                  value={form.district}
                  onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  <option value="">Select district</option>
                  {BD_DISTRICTS.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="address">Full Address *</Label>
                <Textarea
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="House, Road, Area, Thana"
                  className="mt-1 min-h-[80px]"
                  required
                />
              </div>
              <div>
                <Label>Shipping</Label>
                <RadioGroup
                  value={shipMethod}
                  onValueChange={(v) => setShipMethod(v as "inside" | "outside")}
                  className="mt-1 grid grid-cols-2 gap-2"
                >
                  <label
                    htmlFor="ship-in"
                    className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-3 text-sm ${
                      shipMethod === "inside" ? "border-fuchsia-500 bg-fuchsia-50/40" : "border-border"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <RadioGroupItem id="ship-in" value="inside" />
                      Inside Dhaka
                    </span>
                    <span className="font-bold">৳{SHIPPING_INSIDE}</span>
                  </label>
                  <label
                    htmlFor="ship-out"
                    className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-3 text-sm ${
                      shipMethod === "outside" ? "border-fuchsia-500 bg-fuchsia-50/40" : "border-border"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <RadioGroupItem id="ship-out" value="outside" />
                      Outside
                    </span>
                    <span className="font-bold">৳{SHIPPING_OUTSIDE}</span>
                  </label>
                </RadioGroup>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="mt-5 h-14 w-full rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600 text-base font-bold text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Placing order…
                </>
              ) : (
                <>Confirm Order — ৳{totalPay} (COD) 🚚</>
              )}
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              No advance payment. Hate peye taka din.
            </p>
          </form>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="px-4 py-14 md:py-20">
        <SectionTitle
          eyebrow="Real Reviews"
          title="2,400+ happy parents 💖"
          subtitle="Bangladesh-er bivinno jelar parents-er feedback"
        />
        <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-3">
          {[
            {
              name: "Sumaiya Rahman",
              place: "Dhanmondi, Dhaka",
              text:
                "Amar chele pura din mobile chaito, ekhon eta niye boshe thake 😍 ekta board 2 din-e ses kore felse. Ami aro 2ta order korbo!",
              photo: reviewPhoto1,
            },
            {
              name: "Rashed Khan",
              place: "Chattogram",
              text:
                "Quality onek bhalo, color uthe jacche durdantbhabe. Meye ke gift kore choke pani esheche khushi-te. Definitely recommended.",
              photo: reviewPhoto2,
            },
            {
              name: "Tania Akter",
              place: "Sylhet",
              text:
                "COD-e order kore amar 2 baccha-r jonno 2ta nilam. Time-e delivery peyechi, package safe chilo. Bacchara onek enjoy korche.",
              photo: reviewPhoto1,
            },
          ].map((r, i) => (
            <div
              key={i}
              className="relative rounded-3xl border border-border/60 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <Quote className="absolute right-5 top-5 h-8 w-8 text-fuchsia-200" />
              <Stars />
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                "{r.text}"
              </p>
              <div className="mt-4 flex items-center gap-3 border-t border-border/60 pt-4">
                <img src={r.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <div className="text-sm font-bold">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.place}</div>
                </div>
                <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gradient-to-b from-violet-50/40 to-white px-4 py-14 md:py-20">
        <SectionTitle eyebrow="FAQ" title="Common questions" />
        <div className="mx-auto mt-8 max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="cod">
              <AccordionTrigger className="text-left text-base font-semibold">
                COD ase ki?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Hae, sara Bangladesh-e Cash on Delivery available. Hate peye taka din — kono advance lagbe na.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="time">
              <AccordionTrigger className="text-left text-base font-semibold">
                Delivery time koto din?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Inside Dhaka 1–2 din. Outside Dhaka 2–4 din. Order place korar por amra confirm-er jonno call korbo.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="safe">
              <AccordionTrigger className="text-left text-base font-semibold">
                Bacchar jonno safe to?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Hae, 100% non-toxic material diye toiri. Sharp edge nei. 3+ ages-er jonno suitable. Tarpor-o parents-er supervision recommended.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="box">
              <AccordionTrigger className="text-left text-base font-semibold">
                Box-e ki ki pabo?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Single: 1 Scratch Art Board (A3) + Wooden Scratch Pen + Stencil Ruler. Combo: 2 Boards + Pen Set + Stencil Ruler — design vary korte pare.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="return">
              <AccordionTrigger className="text-left text-base font-semibold">
                Damage hole ki korbo?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Delivery-er somoy box check korun. Damage hole amader number-e jananor 24 ghonta-r modhye replace kora hobe.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden px-4 py-16 md:py-24">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.55 0.22 320), oklch(0.58 0.24 27.5))",
          }}
        />
        <div className="mx-auto max-w-3xl text-center text-white">
          <Heart className="mx-auto h-10 w-10 fill-white/30 text-white" />
          <h2 className="mt-3 text-balance text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
            Apnar bacchar jonno best gift 🎁
          </h2>
          <p className="mt-4 text-base text-white/85 sm:text-lg">
            Aj-i order korun — stock limited, ajker offer ses hote{" "}
            <span className="font-mono font-bold">
              {hh}:{mm}:{ss}
            </span>
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={scrollToOrder}
              className="buy-jiggle h-14 rounded-full bg-white px-8 text-base font-bold text-fuchsia-700 hover:bg-white/95"
            >
              <Gift className="mr-2 h-5 w-5" />
              Order Now — COD
            </Button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-white/80 px-6 text-sm font-bold text-white hover:bg-white/10"
            >
              <Smartphone className="h-4 w-4" /> WhatsApp Order
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-white/85">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> 100% Safe
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-4 w-4" /> Fast Delivery
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4" /> COD All Bangladesh
            </span>
          </div>
        </div>
      </section>

      {/* footer mini */}
      <footer className="border-t border-border bg-white px-4 py-6 text-center text-xs text-muted-foreground">
        <Link to="/" className="font-semibold text-foreground hover:underline">
          ← Back to home
        </Link>
        <p className="mt-1">© {new Date().getFullYear()} Scratch Art Hue Board · COD all over BD</p>
      </footer>

      {/* Sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 p-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.2)] backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-lg"
            aria-label="WhatsApp"
          >
            <Smartphone className="h-5 w-5" />
          </a>
          <Button
            onClick={scrollToOrder}
            className="buy-jiggle h-12 flex-1 rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600 text-sm font-bold text-white"
          >
            Order Now — ৳{unitPrice} (COD)
          </Button>
        </div>
      </div>
    </div>
  );
}

