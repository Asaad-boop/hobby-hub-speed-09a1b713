import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductByIdOrSlug, type Product } from "@/lib/products";
import { BD_DISTRICTS } from "@/lib/bd-locations";
import { getOrderAttributionPayload } from "@/lib/session-tracking";
import { fbTrack, META_CURRENCY } from "@/lib/meta-pixel";
import { trackViewItem } from "@/lib/analytics-events";
import { clarityTag } from "@/lib/clarity";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  Phone,
  MapPin,
  User as UserIcon,
  Truck,
  ShieldCheck,
  Star,
  Sparkles,
  Wrench,
  Wind,
  Recycle,
  Link2,
  CheckCircle2,
  Clock,
  Flame,
  Flower2,
  Heart,
  Gift,
} from "lucide-react";

import beforeAfter from "@/assets/curtain-buckle-before-after.webp";
import basketImg from "@/assets/curtain-buckle-basket.jpg";
import handImg from "@/assets/curtain-buckle-hand.webp";
import brownImg from "@/assets/curtain-buckle-brown.webp";
import beigeImg from "@/assets/curtain-buckle-beige.webp";
import heroImg from "@/assets/curtain-buckle-hero.jpg";
import clipsImg from "@/assets/magnetic-curtain-clips.jpg";

const CLIP_PRICE = 50;
const CLIP_NAME = "Magnetic Curtain Clips";

const PRODUCT_SLUG = "flower-pearl-curtain-buckle";
const SHIPPING_INSIDE = 70;
const SHIPPING_OUTSIDE = 130;

type PackKey = "p3" | "p4" | "p6";
type ComboKey = "2b1br" | "1b2br" | "2b2br" | "3b3br";

const PACKS: Record<
  PackKey,
  { qty: number; price: number; old: number; label: string; perPc: string; badge?: string }
> = {
  p3: { qty: 3, price: 549, old: 750, label: "3 Pcs Set", perPc: "183 / pc" },
  p4: { qty: 4, price: 699, old: 950, label: "4 Pcs Set", perPc: "175 / pc", badge: "Popular" },
  p6: { qty: 6, price: 899, old: 1290, label: "6 Pcs Set", perPc: "150 / pc", badge: "Best Value" },
};

const COMBO_LABEL: Record<ComboKey, string> = {
  "2b1br": "2 Beige + 1 Brown",
  "1b2br": "1 Beige + 2 Brown",
  "2b2br": "2 Beige + 2 Brown",
  "3b3br": "3 Beige + 3 Brown",
};

const PACK_COMBOS: Record<PackKey, ComboKey[]> = {
  p3: ["2b1br", "1b2br"],
  p4: ["2b2br"],
  p6: ["3b3br"],
};

export const Route = createFileRoute("/lp/flower-pearl-curtain-buckle")({
  head: () => ({
    meta: [
      {
        title: "Flower Pearl Curtain Buckle — Pordar Stylish Tieback 🌸 | HobbyShop",
      },
      {
        name: "description",
        content:
          "Flower Pearl Curtain Buckle — braided rope tieback, no drilling, soft fabric flower + pearl tassel. Beige & Brown. 3/4/6 Pcs Set. ৳549 theke shuru. COD all over BD.",
      },
      { property: "og:title", content: "Flower Pearl Curtain Buckle — Pordar Stylish Tieback" },
      {
        property: "og:description",
        content:
          "Braided rope tieback · No drilling · Soft fabric flower · Pearl tassel. Cash on Delivery sara Bangladesh.",
      },
      { property: "og:image", content: "/curtain-buckle-cover.webp" },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://hobby-hub-speed.lovable.app/lp/flower-pearl-curtain-buckle",
      },
    ],
  }),
  loader: async () => {
    const product = await fetchProductByIdOrSlug(PRODUCT_SLUG);
    return { product };
  },
  component: CurtainBuckleLanding,
});

const FEATURES = [
  {
    icon: <Link2 className="h-5 w-5" />,
    title: "Braided Rope Tie",
    desc: "Hath diye easily wrap & knot — second-er kaaj",
  },
  {
    icon: <Wrench className="h-5 w-5" />,
    title: "No Drilling",
    desc: "Wall-e fota lagbe na — damage-free install",
  },
  {
    icon: <Flower2 className="h-5 w-5" />,
    title: "Soft Fabric Flower",
    desc: "Premium corduroy petals + wooden center",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Pearl Tassel",
    desc: "Elegant pearl drop — luxe finishing",
  },
  {
    icon: <Recycle className="h-5 w-5" />,
    title: "Reusable",
    desc: "Khule jekono porday lagano jay",
  },
  {
    icon: <Wind className="h-5 w-5" />,
    title: "Clean Look",
    desc: "Ghor ke instantly organized + stylish",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Pordar pichone wrap korun",
    desc: "Braided rope ta pordar peche niye anun",
  },
  { n: "2", title: "Rope diye knot din", desc: "Braided rope duto matha cross kore tie kore din" },
  { n: "3", title: "Flower + Pearl drop", desc: "Decorative flower samne, pearl tassel niche" },
];

const REVIEWS = [
  {
    name: "Nusrat Jahan",
    location: "Dhanmondi, Dhaka",
    rating: 5,
    text: "Ghorer pordar look puro change hoye geche! Rope ta strong, kichu drilling lage nai. Friend ra ese poriche jiggesh kore.",
    date: "2 days ago",
  },
  {
    name: "Sumaiya Akter",
    location: "Chattogram",
    rating: 5,
    text: "Baby room er jonne beige niyechilam — sotti onek cute lagche. 6 pcs set niye 3 ta room shaja korechi. Pearl drop ta khub elegant 💕",
    date: "1 week ago",
  },
  {
    name: "Tahmid Rahman",
    location: "Sylhet",
    rating: 5,
    text: "Wife er jonne gift dilam, khub khushi! Quality and finishing eto valo asha kori nai ei daam-e. Brown color ta deep ar shundor.",
    date: "2 weeks ago",
  },
];

const FAQS = [
  {
    q: "Rope ta koto strong? Porda hold kore?",
    a: "Braided rope ta thick & sturdy — normal sheer, cotton ba medium-weight porda easily hold kore. Heavy velvet porda hole 2 ta buckle use korle better.",
  },
  {
    q: "Pordar size matter kore?",
    a: "Na. Braided rope ta lomba, jekono width er porda accommodate kore.",
  },
  {
    q: "Wash kora jabe?",
    a: "Soft cloth diye spot clean korun. Machine wash recommended na — fabric flower er shape thik thakbe.",
  },
  {
    q: "1 jora-e koto ta thake?",
    a: "1 buckle = 1 pis (1 side er jonne). 1 ta porda er jonne 2 pis lage. 3 pcs set = 1.5 jora, 4 pcs = 2 jora, 6 pcs = 3 jora.",
  },
  {
    q: "Delivery koto din-e pabo?",
    a: "Dhaka-r vetor 1-2 din, baire 2-4 din. Cash on Delivery — hath-e niye taka diben.",
  },
];

function CurtainBuckleLanding() {
  const { product } = Route.useLoaderData() as { product: Product | null };
  const navigate = useNavigate();

  const [pack, setPack] = useState<PackKey>("p4");
  const [combo, setCombo] = useState<ComboKey>(PACK_COMBOS["p4"][0]);
  const [shipMethod, setShipMethod] = useState<"inside" | "outside">("inside");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", district: "" });
  const [clipQty, setClipQty] = useState(0);
  const orderRef = useRef<HTMLDivElement | null>(null);

  const activePack = PACKS[pack];
  const clipsTotal = clipQty * CLIP_PRICE;
  const subtotal = activePack.price + clipsTotal;
  const shippingFee = shipMethod === "inside" ? SHIPPING_INSIDE : SHIPPING_OUTSIDE;
  const totalPay = subtotal + shippingFee;
  const savings = activePack.old - activePack.price;

  // Urgency countdown
  const [secondsLeft, setSecondsLeft] = useState(24 * 60 * 60);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const KEY = "cb_lp_deal_end";
    let end = parseInt(localStorage.getItem(KEY) || "0", 10);
    if (!end || end < Date.now()) {
      end = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(KEY, String(end));
    }
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(Math.floor(secondsLeft / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  useEffect(() => {
    if (!product) return;
    fbTrack("ViewContent", {
      content_ids: [product.id],
      content_name: product.title,
      value: activePack.price,
      currency: META_CURRENCY,
    });
    clarityTag("lp_campaign", "flower-pearl-curtain-buckle");
    clarityTag("lp_pack_selected", pack);
    trackViewItem({ id: product.id, title: product.title, price: activePack.price });
  }, [product, activePack.price, pack]);

  const scrollToOrder = () => {
    orderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) {
      toast.error("Product information missing — page reload korun.");
      return;
    }
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const isGuest = !session;

      const itemSubtotal = activePack.price + clipsTotal;
      const orderTotal = itemSubtotal + shippingFee;
      const attribution = getOrderAttributionPayload();
      const variantLabel = `${activePack.label} — ${COMBO_LABEL[combo]}`;
      const notesText = clipQty > 0
        ? `Variant: ${variantLabel} | Add-on: ${CLIP_NAME} x${clipQty}`
        : `Variant: ${variantLabel}`;

      const baseOrder = {
        status: "new" as const,
        subtotal: itemSubtotal,
        shipping_fee: shippingFee,
        discount_amount: 0,
        coupon_code: null,
        total: orderTotal,
        payment_method: "cod",
        shipping_name: trimmedName,
        shipping_phone: normalizedPhone,
        shipping_address: trimmedAddress,
        shipping_city: form.district,
        shipping_district: form.district,
        source_website: "lp/flower-pearl-curtain-buckle",
        notes: notesText,
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

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert(orderInsert)
        .select("id")
        .single();

      if (orderErr || !order) {
        console.error("Order insert failed:", orderErr);
        toast.error(orderErr?.message ?? "Order place hocche na, abar try korun.");
        setSubmitting(false);
        return;
      }

      const orderItems: Array<Record<string, unknown>> = [
        {
          order_id: order.id,
          user_id: isGuest ? null : session!.user.id,
          product_id: product.id,
          name: `${product.title} — ${variantLabel}`,
          image: product.image,
          price: activePack.price / activePack.qty,
          quantity: activePack.qty,
          variant_id: null,
          variant_label: variantLabel,
        },
      ];
      if (clipQty > 0) {
        orderItems.push({
          order_id: order.id,
          user_id: isGuest ? null : session!.user.id,
          product_id: product.id,
          name: CLIP_NAME,
          image: clipsImg,
          price: CLIP_PRICE,
          quantity: clipQty,
          variant_id: null,
          variant_label: "Add-on",
        });
      }
      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);

      if (itemsErr) {
        console.error("Order items insert failed:", itemsErr);
        if (!isGuest) await supabase.from("orders").delete().eq("id", order.id);
        toast.error(`Items save hoy ni: ${itemsErr.message}`);
        setSubmitting(false);
        return;
      }

      toast.success("Order place hoyeche! Confirm korte call korbo.");
      navigate({ to: "/order-success/$orderId", params: { orderId: order.id } });
    } catch (err: any) {
      console.error("LP checkout exception:", err);
      toast.error(err?.message ?? "Kichu ekta vul hoyeche, abar try korun.");
      setSubmitting(false);
    }
  };

  if (!product) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground">Product paowa jay ni</h1>
        <Link
          to="/shop"
          className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Shop dekhun
        </Link>
      </div>
    );
  }



  return (
    <div className="relative min-h-screen bg-[oklch(0.98_0.012_75)] pb-28 text-[oklch(0.22_0.02_60)] md:pb-0">
      {/* TOP URGENCY BAR */}
      <div className="bg-[oklch(0.45_0.07_45)] text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-[12px] font-semibold sm:text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 animate-pulse text-[oklch(0.85_0.15_70)]" />
            Flash Sale — up to 30% OFF
          </span>
          <span className="hidden opacity-60 sm:inline">·</span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Clock className="h-3.5 w-3.5" />
            Ends in {hh}:{mm}:{ss}
          </span>
          <span className="hidden opacity-60 sm:inline">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" /> COD all over BD
          </span>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Soft blob background */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 80% 10%, oklch(0.92 0.05 60 / 0.6), transparent 70%), radial-gradient(ellipse 50% 40% at 10% 80%, oklch(0.90 0.06 35 / 0.5), transparent 70%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 pt-10 pb-12 md:grid-cols-2 md:gap-12 md:py-20">
          <div className="text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.85_0.04_60)] bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[oklch(0.45_0.07_45)] backdrop-blur">
              <Flower2 className="h-3.5 w-3.5" /> New In · Home Decor
            </span>
            <h1 className="mt-4 font-serif text-3xl font-bold leading-tight text-[oklch(0.25_0.03_50)] sm:text-4xl md:text-5xl">
              Flower Pearl <br className="hidden sm:block" />
              <span className="text-[oklch(0.45_0.10_45)]">Curtain Buckle</span>
            </h1>
            <p className="mt-3 text-base text-[oklch(0.40_0.02_60)] sm:text-lg">
              Pordar stylish tieback — braided rope tie, no drilling. Ghor ke instantly clean,
              organized & beautiful banao.
            </p>

            <div className="mt-4 flex items-center justify-center gap-2 md:justify-start">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-[oklch(0.78_0.16_75)] text-[oklch(0.78_0.16_75)]"
                  />
                ))}
              </div>
              <span className="text-sm font-semibold">4.9</span>
              <span className="text-sm text-[oklch(0.50_0.02_60)]">(248 reviews)</span>
            </div>

            <div className="mt-5 flex items-baseline justify-center gap-3 md:justify-start">
              <span className="text-4xl font-extrabold text-[oklch(0.45_0.10_45)] sm:text-5xl">
                ৳549
              </span>
              <span className="text-xl text-[oklch(0.55_0.02_60)] line-through">৳750</span>
              <span className="rounded-full bg-[oklch(0.92_0.08_70)] px-2.5 py-1 text-xs font-bold text-[oklch(0.40_0.10_45)]">
                Save up to 30%
              </span>
            </div>

            <div className="mt-7 flex flex-col items-center gap-3 md:flex-row md:justify-start">
              <button
                onClick={scrollToOrder}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[oklch(0.45_0.10_45)] px-8 text-base font-bold text-white shadow-lg shadow-[oklch(0.45_0.10_45)]/30 transition hover:bg-[oklch(0.40_0.10_45)] active:scale-[0.98] md:w-auto"
              >
                <Gift className="h-5 w-5" />
                এখনই অর্ডার করুন
              </button>
              <div className="flex items-center gap-1.5 text-xs text-[oklch(0.40_0.02_60)]">
                <ShieldCheck className="h-4 w-4 text-[oklch(0.55_0.12_140)]" />
                Cash on Delivery · 7-day replacement
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-[oklch(0.92_0.06_60)] to-[oklch(0.88_0.08_30)] blur-2xl opacity-60" />
            <div className="relative overflow-hidden rounded-3xl border border-white bg-white shadow-2xl shadow-[oklch(0.45_0.10_45)]/15">
              <img
                src={heroImg}
                alt="Flower pearl curtain buckle holding sheer white curtain in elegant living room"
                className="block aspect-square w-full object-cover"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* COLOR SHOWCASE — display only */}
      <section className="bg-gradient-to-b from-[oklch(0.96_0.02_60)] to-[oklch(0.94_0.03_65)] py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[oklch(0.45_0.10_45)] shadow-sm ring-1 ring-[oklch(0.85_0.04_60)]">
              <Sparkles className="h-3 w-3" /> Available Colors
            </span>
            <h2 className="mt-3 font-serif text-2xl font-bold text-[oklch(0.25_0.03_50)] sm:text-3xl">
              Duto Elegant Shade
            </h2>
            <p className="mt-2 text-sm text-[oklch(0.45_0.02_60)]">
              Beige &amp; Brown — checkout-e mix combo select korben
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:gap-6">
            {(
              [
                { label: "Beige", tag: "Warm & Neutral", img: beigeImg, hex: "oklch(0.88 0.05 75)" },
                { label: "Brown", tag: "Rich & Bold", img: brownImg, hex: "oklch(0.55 0.08 45)" },
              ] as const
            ).map((c) => (
              <div
                key={c.label}
                className="relative overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-[oklch(0.90_0.02_60)]"
              >
                <div className="aspect-[4/5] sm:aspect-[4/3] overflow-hidden">
                  <img
                    src={c.img}
                    alt={`${c.label} curtain buckle`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex items-center gap-3 p-4">
                  <span
                    className="h-8 w-8 flex-shrink-0 rounded-full ring-2 ring-white shadow"
                    style={{ backgroundColor: c.hex }}
                  />
                  <div>
                    <div className="font-serif text-base font-bold text-[oklch(0.25_0.03_50)]">
                      {c.label}
                    </div>
                    <div className="text-[11px] text-[oklch(0.50_0.03_55)]">{c.tag}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* HOW IT WORKS */}
      <section className="bg-[oklch(0.96_0.02_60)] py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div className="relative">
              <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-xl">
                <img
                  src={handImg}
                  alt="Holding the curtain buckle"
                  className="aspect-[4/5] w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-[oklch(0.25_0.03_50)] sm:text-3xl">
                Use korbo kivabe?
              </h2>
              <p className="mt-2 text-sm text-[oklch(0.45_0.02_60)]">
                3 ta easy step — 30 second er kaaj
              </p>
              <ol className="mt-6 space-y-4">
                {STEPS.map((s) => (
                  <li
                    key={s.n}
                    className="flex gap-4 rounded-2xl border border-[oklch(0.92_0.02_60)] bg-white p-4 shadow-sm"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[oklch(0.45_0.10_45)] font-extrabold text-white">
                      {s.n}
                    </span>
                    <div>
                      <h3 className="font-semibold text-[oklch(0.25_0.03_50)]">{s.title}</h3>
                      <p className="mt-0.5 text-sm text-[oklch(0.45_0.02_60)]">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-bold text-[oklch(0.25_0.03_50)] sm:text-3xl">
            Real Homes, Real Vibe ✨
          </h2>
          <p className="mt-2 text-sm text-[oklch(0.45_0.02_60)]">
            Onek family-r ghor-e already shobha barache
          </p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[beforeAfter, beigeImg, brownImg, basketImg].map((img, i) => (
            <div
              key={i}
              className="aspect-square overflow-hidden rounded-2xl border border-[oklch(0.92_0.02_60)] bg-white shadow-sm"
            >
              <img
                src={img}
                alt={`Gallery image ${i + 1}`}
                className="h-full w-full object-cover transition duration-500 hover:scale-105"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </section>


      {/* ORDER FORM */}
      <section
        ref={orderRef}
        className="relative bg-gradient-to-b from-[oklch(0.95_0.03_60)] to-[oklch(0.92_0.05_50)] py-14 md:py-20"
      >
        <div className="mx-auto max-w-3xl px-5">
          <div className="rounded-3xl border border-white bg-white p-6 shadow-2xl shadow-[oklch(0.45_0.10_45)]/15 sm:p-8">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.95_0.04_60)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[oklch(0.45_0.10_45)]">
                <Heart className="h-3.5 w-3.5" /> Order Now
              </span>
              <h2 className="mt-3 font-serif text-2xl font-bold text-[oklch(0.25_0.03_50)] sm:text-3xl">
                অর্ডার কনফার্ম করুন
              </h2>
              <p className="mt-1 text-sm text-[oklch(0.45_0.02_60)]">
                Form fill korun — amra call diye confirm korbo
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              onFocus={() => {
                fbTrack("InitiateCheckout", {
                  content_ids: [product.id],
                  value: activePack.price,
                  currency: META_CURRENCY,
                });
              }}
              className="mt-6 space-y-5"
            >
              {/* Pack selector mini */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[oklch(0.40_0.02_60)]">
                  Package
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(PACKS) as [PackKey, (typeof PACKS)[PackKey]][]).map(
                    ([key, p]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setPack(key);
                          setCombo(PACK_COMBOS[key][0]);
                        }}
                        className={`rounded-xl border-2 p-3 text-center text-xs font-semibold transition ${
                          pack === key
                            ? "border-[oklch(0.45_0.10_45)] bg-[oklch(0.97_0.03_60)] text-[oklch(0.30_0.05_50)]"
                            : "border-[oklch(0.90_0.02_60)] bg-white text-[oklch(0.45_0.02_60)]"
                        }`}
                      >
                        <div>{p.label}</div>
                        <div className="mt-1 text-base font-extrabold text-[oklch(0.45_0.10_45)]">
                          ৳{p.price}
                        </div>
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Color combo */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[oklch(0.40_0.02_60)]">
                  Color Combo
                </p>
                <div className={`grid gap-2 ${PACK_COMBOS[pack].length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {PACK_COMBOS[pack].map((ck) => {
                    const active = combo === ck;
                    const label = COMBO_LABEL[ck];
                    // parse counts from key for swatch row
                    const beigeCount =
                      ck === "2b1br" ? 2 : ck === "1b2br" ? 1 : ck === "2b2br" ? 2 : 3;
                    const brownCount =
                      ck === "2b1br" ? 1 : ck === "1b2br" ? 2 : ck === "2b2br" ? 2 : 3;
                    return (
                      <button
                        key={ck}
                        type="button"
                        onClick={() => setCombo(ck)}
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition ${
                          active
                            ? "border-[oklch(0.45_0.10_45)] bg-[oklch(0.97_0.03_60)] text-[oklch(0.30_0.05_50)]"
                            : "border-[oklch(0.90_0.02_60)] bg-white text-[oklch(0.45_0.02_60)]"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {Array.from({ length: beigeCount }).map((_, i) => (
                            <span
                              key={`b${i}`}
                              className="h-4 w-4 rounded-full border border-[oklch(0.85_0.02_60)]"
                              style={{ backgroundColor: "oklch(0.92 0.04 75)" }}
                            />
                          ))}
                          {Array.from({ length: brownCount }).map((_, i) => (
                            <span
                              key={`br${i}`}
                              className="h-4 w-4 rounded-full border border-[oklch(0.85_0.02_60)]"
                              style={{ backgroundColor: "oklch(0.68 0.09 50)" }}
                            />
                          ))}
                        </div>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
                {PACK_COMBOS[pack].length === 1 && (
                  <p className="mt-1.5 text-[11px] text-[oklch(0.50_0.03_55)]">
                    Ei pack-er jonne ekta-i combo available
                  </p>
                )}
              </div>


              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[oklch(0.40_0.02_60)]">
                  Apnar Naam *
                </label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[oklch(0.55_0.02_60)]" />
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Apnar pura naam"
                    className="h-12 w-full rounded-xl border border-[oklch(0.88_0.02_60)] bg-white pl-10 pr-4 text-sm outline-none focus:border-[oklch(0.45_0.10_45)]"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[oklch(0.40_0.02_60)]">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[oklch(0.55_0.02_60)]" />
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="01XXXXXXXXX"
                    className="h-12 w-full rounded-xl border border-[oklch(0.88_0.02_60)] bg-white pl-10 pr-4 text-sm outline-none focus:border-[oklch(0.45_0.10_45)]"
                  />
                </div>
              </div>

              {/* District */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[oklch(0.40_0.02_60)]">
                  District *
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[oklch(0.55_0.02_60)]" />
                  <select
                    required
                    value={form.district}
                    onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                    className="h-12 w-full appearance-none rounded-xl border border-[oklch(0.88_0.02_60)] bg-white pl-10 pr-4 text-sm outline-none focus:border-[oklch(0.45_0.10_45)]"
                  >
                    <option value="">Select korun…</option>
                    {BD_DISTRICTS.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[oklch(0.40_0.02_60)]">
                  Full Address *
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="House, Road, Area, Thana, City"
                  className="w-full rounded-xl border border-[oklch(0.88_0.02_60)] bg-white px-4 py-3 text-sm outline-none focus:border-[oklch(0.45_0.10_45)]"
                />
              </div>

              {/* Shipping */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[oklch(0.40_0.02_60)]">
                  Shipping
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 text-sm font-semibold transition ${
                      shipMethod === "inside"
                        ? "border-[oklch(0.45_0.10_45)] bg-[oklch(0.97_0.03_60)]"
                        : "border-[oklch(0.90_0.02_60)] bg-white"
                    }`}
                  >
                    <span>Inside Dhaka</span>
                    <span className="text-[oklch(0.45_0.10_45)]">৳70</span>
                    <input
                      type="radio"
                      className="hidden"
                      checked={shipMethod === "inside"}
                      onChange={() => setShipMethod("inside")}
                    />
                  </label>
                  <label
                    className={`flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 text-sm font-semibold transition ${
                      shipMethod === "outside"
                        ? "border-[oklch(0.45_0.10_45)] bg-[oklch(0.97_0.03_60)]"
                        : "border-[oklch(0.90_0.02_60)] bg-white"
                    }`}
                  >
                    <span>Outside Dhaka</span>
                    <span className="text-[oklch(0.45_0.10_45)]">৳130</span>
                    <input
                      type="radio"
                      className="hidden"
                      checked={shipMethod === "outside"}
                      onChange={() => setShipMethod("outside")}
                    />
                  </label>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl bg-[oklch(0.97_0.02_60)] p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[oklch(0.45_0.02_60)]">
                    {activePack.label} · {COMBO_LABEL[combo]}
                  </span>
                  <span className="font-semibold">৳{subtotal}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[oklch(0.45_0.02_60)]">Shipping</span>
                  <span className="font-semibold">৳{shippingFee}</span>
                </div>
                {savings > 0 && (
                  <div className="mt-1 flex items-center justify-between text-[oklch(0.45_0.15_140)]">
                    <span>You save</span>
                    <span className="font-semibold">৳{savings}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-[oklch(0.90_0.02_60)] pt-3 text-base">
                  <span className="font-bold text-[oklch(0.25_0.03_50)]">Total</span>
                  <span className="text-xl font-extrabold text-[oklch(0.45_0.10_45)]">
                    ৳{totalPay}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[oklch(0.45_0.10_45)] text-base font-bold text-white shadow-lg shadow-[oklch(0.45_0.10_45)]/30 transition hover:bg-[oklch(0.40_0.10_45)] active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Processing…
                  </>
                ) : (
                  <>
                    <Gift className="h-5 w-5" /> অর্ডার কনফার্ম করুন (COD)
                  </>
                )}
              </button>

              <p className="text-center text-xs text-[oklch(0.50_0.02_60)]">
                Cash on Delivery · Hath-e niye taka diben
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* MOBILE STICKY CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[oklch(0.90_0.02_60)] bg-white/95 px-4 py-3 shadow-2xl backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[oklch(0.50_0.02_60)]">
              {activePack.label}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-[oklch(0.45_0.10_45)]">
                ৳{activePack.price}
              </span>
              <span className="text-xs text-[oklch(0.55_0.02_60)] line-through">
                ৳{activePack.old}
              </span>
            </div>
          </div>
          <button
            onClick={scrollToOrder}
            className="inline-flex h-12 flex-1 max-w-[200px] items-center justify-center gap-1.5 rounded-full bg-[oklch(0.45_0.10_45)] text-sm font-bold text-white shadow-lg"
          >
            <Gift className="h-4 w-4" /> Order Now
          </button>
        </div>
      </div>

    </div>
  );
}
