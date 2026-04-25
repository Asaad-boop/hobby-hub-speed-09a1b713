import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductByIdOrSlug, type Product } from "@/lib/products";
import { BD_DISTRICTS } from "@/lib/bd-locations";
import { getOrderAttributionPayload } from "@/lib/session-tracking";
import { fbTrack, META_CURRENCY } from "@/lib/meta-pixel";
import { clarityTag } from "@/lib/clarity";
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
  Loader2,
  Phone,
  MapPin,
  User as UserIcon,
  Minus,
  Plus,
  Gift,
  Truck,
  RotateCcw,
  PackageCheck,
  Sparkles,
  ShieldCheck,
  Star,
  Lightbulb,
  Heart,
  Wand2,
  Zap,
  Palette,
  Radio,
  Clock,
  Eye,
  CheckCircle2,
  Flame,
  X,
  Award,
  ThumbsUp,
} from "lucide-react";

import beforeRoom from "@/assets/aurora-before-room.jpg";
import afterRoom from "@/assets/aurora-after-room.jpg";
import rippleProjection from "@/assets/aurora-ripple-projection.jpg";
import nebulaProjection from "@/assets/aurora-nebula-projection.jpg";
import lensSystem from "@/assets/aurora-lens-system.webp";
import bedsideLamp from "@/assets/aurora-bedside-lamp.webp";
import deskLamp from "@/assets/aurora-desk-lamp.jpg";

const PRODUCT_SLUG = "aurora-galaxy-ripple-lamp-4-way-use-light";
const SHIPPING_INSIDE = 70;
const SHIPPING_OUTSIDE = 130;

const SINGLE_PRICE = 1290;
const SINGLE_OLD = 1890;
const COMBO_PRICE = 2322; // 2 pcs (10% off)
const COMBO_OLD = 2580;
const TRIO_PRICE = 3291; // 3 pcs (15% off)
const TRIO_OLD = 3870;

export const Route = createFileRoute("/lp/aurora-lamp")({
  head: () => ({
    meta: [
      { title: "Aurora Galaxy Ripple Lamp — Room ke Galaxy Banao 🌌 | HobbyShop" },
      {
        name: "description",
        content:
          "Aurora Galaxy Ripple Lamp — 3-in-1 use, water ripple + galaxy nebula projection, 16 RGB colours, remote control. Bedroom ke turant magical kore din. COD all over BD.",
      },
      { property: "og:title", content: "Aurora Galaxy Ripple Lamp — Room ke Galaxy Banao 🌌" },
      {
        property: "og:description",
        content:
          "Water ripple + galaxy nebula projection · 16 RGB colours · Remote control. ৳1290 only — COD all over BD.",
      },
      {
        property: "og:image",
        content:
          "https://cdn.shopify.com/s/files/1/0938/0331/5501/files/ChatGPTImageFeb2_2026_11_43_15PM.png?v=1770054209",
      },
    ],
  }),
  loader: async () => {
    const product = await fetchProductByIdOrSlug(PRODUCT_SLUG);
    return { product };
  },
  component: AuroraLampLanding,
});

const FEATURES = [
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Galaxy + Aurora projection",
    desc: "Northern-lights ripple effect — পুরো ঘরে nebula art ভেসে উঠবে",
  },
  {
    icon: <Lightbulb className="h-5 w-5" />,
    title: "16 RGB রঙ",
    desc: "Mood অনুযায়ী রঙ change — single colour, breathing বা auto cycle",
  },
  {
    icon: <Palette className="h-5 w-5" />,
    title: "Multi-mode lighting",
    desc: "Single colour, breathing, auto-cycle — moment er sathe match",
  },
  {
    icon: <Wand2 className="h-5 w-5" />,
    title: "3-in-1 use",
    desc: "Night lamp · Galaxy projector · Aurora ripple — ek device-e shob",
  },
  {
    icon: <Radio className="h-5 w-5" />,
    title: "Remote control included",
    desc: "Distance theke colour, mode, brightness — sob set kora jay",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "USB powered, low heat",
    desc: "Plug-and-play · ghonta-r por ghonta chalalei o gorom hoy na",
  },
];

const USE_CASES = [
  { emoji: "🛌", title: "Bedroom mood light", desc: "ঘুমানোর আগে relaxing ambient nebula" },
  { emoji: "🎂", title: "Birthday vibe", desc: "Cake-cutting, party decor — instant wow factor" },
  { emoji: "📸", title: "TikTok / Reels background", desc: "Aesthetic content এর জন্য perfect prop" },
  { emoji: "💑", title: "Date night-এ", desc: "Romantic dinner, anniversary set-up" },
  { emoji: "🧘", title: "Yoga / meditation", desc: "Calming colour-flow — focus বাড়ায়" },
  { emoji: "🎁", title: "Gift হিসাবে", desc: "Friend, partner, sibling — সবাই পাগল হবে" },
];

const SPECS = [
  { label: "Power", value: "USB / 5V", sub: "Cable included" },
  { label: "Colours", value: "16 RGB", sub: "Auto-cycle mode" },
  { label: "Modes", value: "3-in-1", sub: "Lamp · Aurora · Galaxy" },
  { label: "Control", value: "Remote", sub: "+ Touch button" },
  { label: "Projection", value: "360°", sub: "Wall + ceiling" },
  { label: "Material", value: "Premium ABS", sub: "Low-heat LED" },
];

type Review = {
  name: string;
  location: string;
  rating: number;
  text: string;
  date: string;
};

const REVIEWS: Review[] = [
  {
    name: "Tanjila Akter",
    location: "Dhanmondi, Dhaka",
    rating: 5,
    text: "Bedroom এ on করার পর mone holo বিদেশের কোনো hotel-এ আছি 😍 Husband এত খুশি! Sound quality o boss.",
    date: "3 days ago",
  },
  {
    name: "Rifat Hossain",
    location: "Chattogram",
    rating: 5,
    text: "TikTok video bananor jonno kinechilam. Engagement double hoye gece! Quality eto valo asha kori nai ei daam-e.",
    date: "1 week ago",
  },
  {
    name: "Nusrat Jahan",
    location: "Sylhet",
    rating: 5,
    text: "Anniversary-r jonno husband-ke gift dilam. Pure ghor galaxy banaye dilo. Best gift ever 💜 fast delivery o pelam.",
    date: "2 weeks ago",
  },
];

const FAQS = [
  {
    q: "Lamp ta ki actually multi-mode use hoy?",
    a: "Ji — (1) Soft night lamp, (2) Aurora ripple wall projector, (3) Galaxy nebula projection. Sob mode remote diye ba touch button diye control korben.",
  },
  {
    q: "Charge dite hoy naki USB plug-in?",
    a: "USB cable diye chole — phone charger ba power bank-e plug korle on hoye jay. Battery alada nai, taai 24/7 chalano jay heat chara.",
  },
  {
    q: "Remote control included?",
    a: "Han, full remote box-er sathe free. Distance theke colour, mode, brightness sob set kora jay.",
  },
  {
    q: "Delivery koto din-e pabo?",
    a: "Dhaka-r vetor 1-2 din, Dhaka-r baire 2-4 din. Cash on Delivery — product hath-e niye taka diben.",
  },
  {
    q: "Damaged ele ki hobe?",
    a: "Delivery-r somoy parcel khule check korben. Kono problem hole 7 days-er moddhe 100% replacement guarantee.",
  },
];

function AuroraLampLanding() {
  const { product } = Route.useLoaderData() as { product: Product | null };
  const navigate = useNavigate();

  const [pack, setPack] = useState<"single" | "double" | "triple">("single");
  const [qty, setQty] = useState(1);
  const [shipMethod, setShipMethod] = useState<"inside" | "outside">("inside");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", district: "" });
  const orderRef = useRef<HTMLDivElement | null>(null);

  // Slider position for before/after (0-100)
  const [sliderPos, setSliderPos] = useState(50);
  const [lensPreview, setLensPreview] = useState<"ripple" | "nebula">("ripple");

  // Urgency countdown — 24h flash sale (persists across reloads via localStorage)
  const [secondsLeft, setSecondsLeft] = useState(24 * 60 * 60);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const KEY = "aurora_lp_deal_end";
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

  // Live visitor count (simulated, deterministic-ish)
  const [viewers, setViewers] = useState(38);
  useEffect(() => {
    const id = setInterval(() => {
      setViewers((v) => Math.max(22, Math.min(74, v + Math.floor(Math.random() * 7) - 3)));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Stock remaining (out of 100)
  const stockLeft = 23;

  // Social-proof toasts — recent buyers
  const [proofIdx, setProofIdx] = useState(0);
  const [proofVisible, setProofVisible] = useState(false);
  useEffect(() => {
    const buyers = [
      { name: "Sadia R.", city: "Mirpur", min: 2 },
      { name: "Tanvir A.", city: "Uttara", min: 5 },
      { name: "Mehedi H.", city: "Chattogram", min: 8 },
      { name: "Lamia K.", city: "Sylhet", min: 12 },
      { name: "Rakib M.", city: "Khulna", min: 18 },
    ];
    let i = 0;
    const cycle = () => {
      setProofIdx(i % buyers.length);
      setProofVisible(true);
      setTimeout(() => setProofVisible(false), 4500);
      i++;
    };
    const first = setTimeout(cycle, 3000);
    const id = setInterval(cycle, 11000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  const buyers = [
    { name: "Sadia R.", city: "Mirpur", min: 2 },
    { name: "Tanvir A.", city: "Uttara", min: 5 },
    { name: "Mehedi H.", city: "Chattogram", min: 8 },
    { name: "Lamia K.", city: "Sylhet", min: 12 },
    { name: "Rakib M.", city: "Khulna", min: 18 },
  ];
  const currentBuyer = buyers[proofIdx];

  const packMeta = {
    single: { qty: 1, price: SINGLE_PRICE, old: SINGLE_OLD, label: "1 pc" },
    double: { qty: 2, price: COMBO_PRICE, old: COMBO_OLD, label: "2 pcs · 10% OFF" },
    triple: { qty: 3, price: TRIO_PRICE, old: TRIO_OLD, label: "3 pcs · 15% OFF" },
  } as const;
  const activePack = packMeta[pack];

  // Use the product's gallery for the showcase if present, else fall back to image
  const galleryImages = (product?.gallery?.length ? product.gallery : [product?.image]).filter(
    Boolean,
  ) as string[];

  const heroImage = galleryImages[0] ?? afterRoom;

  useEffect(() => {
    if (!product) return;
    fbTrack("ViewContent", {
      content_ids: [product.id],
      content_name: product.title,
      value: activePack.price,
      currency: META_CURRENCY,
    });
    clarityTag("lp_campaign", "aurora-lamp");
    clarityTag("lp_pack_selected", pack);
  }, [product, activePack.price, pack]);

  const subtotal = activePack.price * qty;
  const shippingFee = shipMethod === "inside" ? SHIPPING_INSIDE : SHIPPING_OUTSIDE;
  const totalPay = subtotal + shippingFee;
  const savings = (activePack.old - activePack.price) * qty;

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

      const itemSubtotal = activePack.price * qty;
      const orderTotal = itemSubtotal + shippingFee;
      const attribution = getOrderAttributionPayload();
      const variantLabel = `${activePack.label} pack`;

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
        source_website: "lp/aurora-lamp",
        notes: `Variant: ${variantLabel} × ${qty}`,
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
        toast.error(
          orderErr?.message
            ? `Order falure: ${orderErr.message}`
            : "Order place hocche na, abar try korun.",
        );
        setSubmitting(false);
        return;
      }

      const totalUnits = activePack.qty * qty;
      const { error: itemsErr } = await supabase.from("order_items").insert([
        {
          order_id: order.id,
          user_id: isGuest ? null : session!.user.id,
          product_id: product.id,
          name: `${product.title} — ${variantLabel}`,
          image: product.image,
          price: activePack.price / activePack.qty, // per-unit price
          quantity: totalUnits,
          variant_id: null,
          variant_label: variantLabel,
        },
      ]);

      if (itemsErr) {
        console.error("Order items insert failed:", itemsErr);
        if (!isGuest) await supabase.from("orders").delete().eq("id", order.id);
        toast.error(`Items save hoy ni: ${itemsErr.message}`);
        setSubmitting(false);
        return;
      }

      // Purchase event fires on /order-success page (single source of truth, deduped per order)

      toast.success("Order place hoyeche! Confirm korar jonno call korbo.");
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
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* ============ TOP URGENCY BAR ============ */}
      <div
        className="relative overflow-hidden text-white"
        style={{
          background:
            "linear-gradient(90deg, oklch(0.45 0.22 320), oklch(0.45 0.22 290), oklch(0.45 0.22 260))",
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-[12px] font-semibold sm:text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 animate-pulse text-yellow-300" />
            Flash Sale 32% OFF
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

      {/* HERO — cosmic, full-bleed */}
      <section className="relative overflow-hidden">
        {/* Cosmic gradient backdrop */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, oklch(0.45 0.22 290 / 0.45), transparent 55%), radial-gradient(ellipse at 75% 70%, oklch(0.55 0.20 200 / 0.40), transparent 55%), linear-gradient(180deg, oklch(0.18 0.05 280) 0%, oklch(0.10 0.04 280) 100%)",
          }}
          aria-hidden
        />
        {/* Star dust */}
        <div
          className="absolute inset-0 -z-10 opacity-40 mix-blend-screen"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 20% 30%, white, transparent), radial-gradient(1px 1px at 80% 60%, white, transparent), radial-gradient(2px 2px at 40% 80%, white, transparent), radial-gradient(1px 1px at 65% 20%, white, transparent), radial-gradient(1px 1px at 10% 70%, white, transparent)",
            backgroundSize: "200px 200px",
          }}
          aria-hidden
        />

        <div className="mx-auto grid max-w-6xl gap-8 px-5 pt-10 pb-12 md:grid-cols-2 md:gap-12 md:py-20">
          <div className="text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Best Seller · Trending
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-5xl lg:text-6xl">
              Aapnar Bedroom-ke{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(120deg, #b993ff, #5ee5d0 35%, #ff84d9 70%, #b993ff)",
                }}
              >
                Galaxy
              </span>{" "}
              baniye din ✨
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/75 md:text-lg">
              Aurora Ripple + Galaxy nebula projection · 16 RGB rang · Remote control included.{" "}
              <strong className="text-white">3-in-1 magical lamp</strong> — ekta switch-e mood ekdom
              palte jabe.
            </p>

            {/* Price */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <span className="text-4xl font-extrabold text-white md:text-5xl">
                ৳{SINGLE_PRICE.toLocaleString()}
              </span>
              <span className="text-lg text-white/50 line-through">
                ৳{SINGLE_OLD.toLocaleString()}
              </span>
              <span className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-3 py-1 text-xs font-bold text-white">
                32% OFF
              </span>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Button
                onClick={scrollToOrder}
                className="h-14 rounded-full bg-white px-8 text-base font-extrabold text-slate-900 shadow-2xl hover:bg-white/90"
              >
                <Gift className="mr-2 h-5 w-5" /> এখনই অর্ডার করুন
              </Button>
              <a
                href="#features"
                className="inline-flex h-14 items-center justify-center rounded-full border border-white/25 bg-white/5 px-8 text-base font-semibold text-white backdrop-blur hover:bg-white/10"
              >
                Demo দেখুন ↓
              </a>
            </div>

            {/* Live viewers + stock urgency */}
            <div className="mt-6 grid gap-3 rounded-2xl border border-white/15 bg-white/5 p-3.5 backdrop-blur sm:grid-cols-2">
              <div className="flex items-center gap-2.5 text-sm text-white/85">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                <Eye className="h-4 w-4 text-white/70" />
                <span>
                  <strong className="text-white tabular-nums">{viewers}</strong> jon ekhon ei page-e
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] text-white/75">
                  <span className="inline-flex items-center gap-1">
                    <Flame className="h-3 w-3 text-orange-300" /> Stock: only {stockLeft} left
                  </span>
                  <span className="font-bold text-orange-200">{stockLeft}/100</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-pink-500"
                    style={{ width: `${stockLeft}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Trust strip */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/70 md:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" /> Cash on Delivery
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> 7-Day Replacement
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> 100% Authentic
              </span>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-fuchsia-500/30 via-violet-500/20 to-cyan-400/30 blur-3xl" />
            <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 shadow-[0_20px_60px_-15px_rgba(120,80,255,0.6)] backdrop-blur">
              <img
                src={heroImage}
                alt={product.title}
                className="h-full w-full object-cover"
                width={1024}
                height={1024}
              />
              {/* Floating badge */}
              <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
                🌌 3-in-1 Magic
              </div>
              <div className="absolute bottom-4 right-4 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-900 shadow-lg">
                ৳{SINGLE_PRICE.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ BEFORE / AFTER SLIDER ============ */}
      <section className="relative overflow-hidden bg-slate-950 px-5 py-14">
        <div className="mx-auto max-w-4xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-fuchsia-300">
            Before · After
          </span>
          <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">
            Same room. <span className="text-fuchsia-300">Different planet.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/65 md:text-base">
            Slider ta drag korun — dekhun apnar boring bedroom kibhabe ekta galaxy theme room hoye
            jay 🌌
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-4xl">
          <BeforeAfterSlider
            beforeSrc={beforeRoom}
            afterSrc={afterRoom}
            position={sliderPos}
            onChange={setSliderPos}
          />
          <p className="mt-3 text-center text-[11px] text-white/50">
            👆 Slider ta tene dekhun · Lights off → Magic on
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-3 text-center">
          <MiniStat label="Modes" value="3" sub="in 1 device" />
          <MiniStat label="Colours" value="16" sub="RGB" />
          <MiniStat label="Remote" value="✓" sub="Included" />
        </div>
      </section>

      {/* ============ KEY FEATURES ============ */}
      <section id="features" className="relative px-5 py-14">
        <div className="mx-auto max-w-5xl">
          <SectionHeading kicker="Features" title="Keno ei lamp ta sobaike pagol korche" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-card)]"
              >
                <div
                  className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 blur-2xl transition group-hover:opacity-60"
                  style={{
                    background:
                      "radial-gradient(circle, oklch(0.65 0.22 300 / 0.6), transparent 70%)",
                  }}
                  aria-hidden
                />
                <div className="relative">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {f.icon}
                  </div>
                  <h3 className="mt-3 text-base font-bold text-foreground">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ GALLERY ============ */}
      {galleryImages.length > 1 && (
        <section className="relative px-5 py-14" style={{ background: "oklch(0.97 0.01 280)" }}>
          <div className="mx-auto max-w-5xl">
            <SectionHeading kicker="Gallery" title="Real product shots — ekdom genuine" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {galleryImages.slice(0, 8).map((src, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-black/5 shadow-md transition hover:shadow-xl"
                >
                  <img
                    src={src}
                    alt={`${product.title} ${i + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ 1 LAMP · 4 WAYS ============ */}
      <section className="relative overflow-hidden px-5 py-16">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, oklch(0.25 0.18 290 / 0.15), transparent 60%), radial-gradient(circle at 80% 80%, oklch(0.30 0.18 200 / 0.15), transparent 60%), oklch(0.12 0.04 280)",
          }}
          aria-hidden
        />
        <div className="mx-auto max-w-6xl text-white">
          <div className="text-center">
            <span className="inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-white/80 backdrop-blur">
              1 Lamp · 4 Ways
            </span>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Ekta lamp e <span style={{ color: "oklch(0.85 0.18 320)" }}>4 rokom</span> use 🌌
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-white/70">
              Cap khulle full-room projector · Cap lagale soft mood lamp. 2-ta interchangeable lens diye
              4 ta unique experience.
            </p>
          </div>

          {/* Tappable lens preview */}
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[16/7]">
              <img
                src={rippleProjection}
                alt="Aurora water ripple projection preview"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                  lensPreview === "ripple" ? "opacity-100" : "opacity-0"
                }`}
              />
              <img
                src={nebulaProjection}
                alt="Galaxy nebula projection preview"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                  lensPreview === "nebula" ? "opacity-100" : "opacity-0"
                }`}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                  {lensPreview === "ripple" ? "Aurora Lens · Way 1" : "Spiral Lens · Way 2"}
                </p>
                <h3 className="text-lg font-extrabold text-white sm:text-xl">
                  {lensPreview === "ripple"
                    ? "🌊 Water Ripple Projection"
                    : "🌌 Galaxy Nebula Projection"}
                </h3>
              </div>
            </div>
            <div className="flex gap-2 p-3 sm:p-4">
              <button
                type="button"
                onClick={() => setLensPreview("ripple")}
                aria-pressed={lensPreview === "ripple"}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition active:scale-[0.98] ${
                  lensPreview === "ripple"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
                    : "bg-white/10 text-white/80 hover:bg-white/15"
                }`}
              >
                🌊 Water Ripple
              </button>
              <button
                type="button"
                onClick={() => setLensPreview("nebula")}
                aria-pressed={lensPreview === "nebula"}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition active:scale-[0.98] ${
                  lensPreview === "nebula"
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white/10 text-white/80 hover:bg-white/15"
                }`}
              >
                🌌 Galaxy Nebula
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {/* Way 1: Water Ripple Projection */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur transition hover:border-white/20">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={rippleProjection}
                  alt="Aurora water ripple projection on ceiling"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-200">
                    Way 1
                  </span>
                  <span className="text-xs text-white/60">Aurora Lens</span>
                </div>
                <h3 className="mt-2 text-lg font-bold">🌊 Water Ripple Projection</h3>
                <p className="mt-1 text-sm text-white/70">
                  Full ceiling-e wavy water ripple effect — calm, soothing, hypnotic. Perfect for
                  sleep & meditation.
                </p>
              </div>
            </div>

            {/* Way 2: Galaxy Nebula */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur transition hover:border-white/20">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={nebulaProjection}
                  alt="Galaxy nebula projection on bedroom ceiling"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-200">
                    Way 2
                  </span>
                  <span className="text-xs text-white/60">Spiral Lens</span>
                </div>
                <h3 className="mt-2 text-lg font-bold">🌌 Galaxy Nebula Projection</h3>
                <p className="mt-1 text-sm text-white/70">
                  Pure room cosmic galaxy nebula te bhore jay — TikTok / Reels & date night-er
                  jonno perfect.
                </p>
              </div>
            </div>

            {/* Way 3: Bedside Lamp (cap on) */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur transition hover:border-white/20">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={bedsideLamp}
                  alt="Aurora lamp used as soft bedside lamp"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-pink-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-200">
                    Way 3
                  </span>
                  <span className="text-xs text-white/60">Cap On</span>
                </div>
                <h3 className="mt-2 text-lg font-bold">🛌 Bedside Mood Lamp</h3>
                <p className="mt-1 text-sm text-white/70">
                  Cap lagale soft glowing globe lamp — bedside table-e perfect ambient light, eye
                  friendly.
                </p>
              </div>
            </div>

            {/* Way 4: Desk Lamp */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur transition hover:border-white/20">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={deskLamp}
                  alt="Aurora lamp used as decorative desk lamp"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                    Way 4
                  </span>
                  <span className="text-xs text-white/60">Decor Mode</span>
                </div>
                <h3 className="mt-2 text-lg font-bold">💡 Decor / Desk Lamp</h3>
                <p className="mt-1 text-sm text-white/70">
                  Reading table, study desk ba shelf-e — 16 RGB color cycle decorative lamp hisebe
                  use korun.
                </p>
              </div>
            </div>
          </div>

          {/* Lens swap explainer */}
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur md:p-8">
            <div className="grid items-center gap-6 md:grid-cols-2">
              <div>
                <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                  Interchangeable Lens System
                </span>
                <h3 className="mt-3 text-2xl font-extrabold">
                  Cap khulun · Lens badlan · Notun mood
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  Box-e <strong className="text-white">2-ta precision lens</strong> pacchen — Aurora
                  (wavy ripple) ar Spiral (cosmic nebula). 5 second-e swap kore notun effect upobhog
                  korun. Cap lagiye dile abar soft bedside lamp.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-purple-300">✦</span> Aurora Lens — water ripple wave
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-300">✦</span> Spiral Lens — galaxy nebula
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-pink-300">✦</span> Cap on — soft mood / desk lamp
                  </li>
                </ul>
              </div>
              <div className="overflow-hidden rounded-2xl">
                <img
                  src={lensSystem}
                  alt="Interchangeable Aurora and Spiral lens system"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ USE CASES ============ */}
      <section className="relative overflow-hidden px-5 py-14">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.96 0.04 320 / 0.4), oklch(0.96 0.04 200 / 0.4))",
          }}
          aria-hidden
        />
        <div className="mx-auto max-w-5xl">
          <SectionHeading kicker="Perfect for" title="Kothay use korben?" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {USE_CASES.map((u, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card/80 p-5 backdrop-blur transition hover:border-primary/40 hover:shadow-[var(--shadow-card)]"
              >
                <div className="text-3xl">{u.emoji}</div>
                <h3 className="mt-2 text-sm font-bold text-foreground">{u.title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SPECS ============ */}
      <section className="px-5 py-14">
        <div className="mx-auto max-w-3xl">
          <SectionHeading kicker="Specifications" title="Box-e ki ki pacchen" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SPECS.map((s, i) => (
              <SpecCard key={i} {...s} />
            ))}
          </div>

          <div
            className="mt-8 rounded-2xl p-6 text-white"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.45 0.20 290), oklch(0.55 0.18 200))",
            }}
          >
            <h3 className="text-lg font-bold">📦 Box e ki thakbe</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✓</span> 1× Aurora Galaxy Ripple Lamp
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✓</span> 1× Remote control (battery soho)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✓</span> 1× USB power cable
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✓</span> 2× Interchangeable lens (Aurora + Galaxy)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✓</span> 1× Premium gift box packaging
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ============ REVIEWS ============ */}
      <section className="bg-muted/40 px-5 py-14">
        <div className="mx-auto max-w-5xl">
          <SectionHeading kicker="Customer Love" title="Real customer-der review" />
          <div className="mb-5 flex items-center justify-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-sm font-bold text-foreground">4.9 / 5</span>
            <span className="text-xs text-muted-foreground">· 280+ verified reviews</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {REVIEWS.map((r, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, oklch(0.55 0.20 ${
                        (i * 80) % 360
                      }), oklch(0.65 0.18 ${(i * 80 + 60) % 360}))`,
                    }}
                  >
                    {r.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground">{r.location}</p>
                  </div>
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">
                    ✓ Verified
                  </span>
                </div>
                <div className="mt-3 flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3.5 w-3.5 ${
                        s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85">"{r.text}"</p>
                <p className="mt-3 text-[11px] text-muted-foreground">{r.date}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMPARISON TABLE ============ */}
      <section className="px-5 py-14">
        <div className="mx-auto max-w-3xl">
          <SectionHeading kicker="Why Us" title="HobbyShop vs onno seller" />
          <div className="overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 text-foreground">
                  <th className="p-3 text-left font-semibold">Feature</th>
                  <th className="p-3 text-center font-bold text-primary">HobbyShop ✓</th>
                  <th className="p-3 text-center font-medium text-muted-foreground">Others</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {[
                  ["3-in-1 use (Lamp + Aurora + Galaxy)", true, false],
                  ["Remote + 2 interchangeable lens", true, false],
                  ["Premium gift box packaging", true, false],
                  ["7-day replacement guarantee", true, false],
                  ["Cash on Delivery all over BD", true, true],
                  ["Verified original product", true, false],
                  ["Same-day shipping", true, false],
                ].map(([feat, us, them], i) => (
                  <tr key={i}>
                    <td className="p-3 text-foreground">{feat as string}</td>
                    <td className="p-3 text-center">
                      {us ? (
                        <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-muted-foreground/50" />
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {them ? (
                        <CheckCircle2 className="mx-auto h-5 w-5 text-muted-foreground/60" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-rose-400" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============ GUARANTEES STRIP ============ */}
      <section className="px-5 pb-4">
        <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <ShieldCheck className="h-5 w-5" />, t: "100% Authentic", s: "Verified original product" },
            { icon: <RotateCcw className="h-5 w-5" />, t: "7-Day Replacement", s: "Damage হলে free swap" },
            { icon: <Truck className="h-5 w-5" />, t: "Fast Delivery", s: "Dhaka 1-2 din · BD 2-4 din" },
            { icon: <Award className="h-5 w-5" />, t: "Cash on Delivery", s: "Hath-e niye taka diben" },
          ].map((g, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {g.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{g.t}</p>
                <p className="text-xs text-muted-foreground">{g.s}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ MID CTA WITH COUNTDOWN ============ */}
      <section
        className="mx-5 my-8 overflow-hidden rounded-3xl px-6 py-12 text-center text-white shadow-[var(--shadow-brand)]"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.40 0.22 290), oklch(0.50 0.20 320), oklch(0.55 0.18 200))",
        }}
      >
        <Heart className="mx-auto h-7 w-7 text-white/90" />
        <h2 className="mt-3 text-xl font-extrabold leading-tight md:text-2xl">
          Flash sale shesh hote{" "}
          <span className="underline decoration-pink-300 underline-offset-4">baki ache:</span>
        </h2>
        <div className="mt-4 flex justify-center gap-2 sm:gap-3">
          {[
            { v: hh, l: "ghonta" },
            { v: mm, l: "minute" },
            { v: ss, l: "second" },
          ].map((t, i) => (
            <div
              key={i}
              className="min-w-[68px] rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur sm:min-w-[80px]"
            >
              <div className="text-2xl font-extrabold tabular-nums sm:text-3xl">{t.v}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-widest text-white/70">{t.l}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-white/80 md:text-sm">
          Daily 200+ orders · last 24 hours-e 47 jon kinechen
        </p>
        <Button
          onClick={scrollToOrder}
          className="mt-5 h-12 rounded-full bg-white px-8 text-sm font-extrabold text-slate-900 hover:bg-white/90"
        >
          🌌 Aamar Galaxy Lamp Chai →
        </Button>
      </section>


      {/* ============ ORDER FORM ============ */}
      <section ref={orderRef} className="scroll-mt-4 px-5 py-12">
        <div className="mx-auto max-w-xl">
          <SectionHeading kicker="Order Now" title="অর্ডার ফর্ম পূরণ করুন" />
          <p className="-mt-4 mb-6 text-center text-sm text-muted-foreground">
            ফর্ম পূরণ করুন — আমরা কনফার্ম করতে কল করব। Cash on Delivery।
          </p>

          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-3 border-b border-border bg-muted/50 p-4">
              <img
                src={product.image}
                alt={product.title}
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  Aurora Galaxy Ripple Lamp
                </p>
                <p className="mt-0.5 text-base font-extrabold text-primary">
                  ৳{activePack.price.toLocaleString()}
                  <span className="ml-2 text-xs font-normal text-muted-foreground line-through">
                    ৳{activePack.old.toLocaleString()}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-bold tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <Label className="mb-2 block text-sm font-semibold">
                  🎁 Pack Select korun (besi nile besi save)
                </Label>
                <div className="grid gap-2.5">
                  <PackOption
                    active={pack === "single"}
                    onClick={() => setPack("single")}
                    title="1 piece"
                    sub="Ekta lamp"
                    price={SINGLE_PRICE}
                    old={SINGLE_OLD}
                  />
                  <PackOption
                    active={pack === "double"}
                    onClick={() => setPack("double")}
                    title="2 pieces · 10% OFF"
                    sub="Friend/Family-r jonno extra"
                    price={COMBO_PRICE}
                    old={COMBO_OLD}
                    badge="POPULAR"
                  />
                  <PackOption
                    active={pack === "triple"}
                    onClick={() => setPack("triple")}
                    title="3 pieces · 15% OFF"
                    sub="Best value — gift kore dewar jonno"
                    price={TRIO_PRICE}
                    old={TRIO_OLD}
                    badge="BEST VALUE"
                  />
                </div>
              </div>

              <FormField id="lp-name" label="আপনার নাম *" icon={<UserIcon className="h-3.5 w-3.5" />}>
                <Input
                  id="lp-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Mohammed Akash"
                  className="h-11 rounded-lg"
                  required
                />
              </FormField>

              <FormField
                id="lp-phone"
                label="মোবাইল নাম্বার *"
                icon={<Phone className="h-3.5 w-3.5" />}
              >
                <Input
                  id="lp-phone"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  className="h-11 rounded-lg"
                  required
                />
              </FormField>

              <FormField id="lp-district" label="জেলা *" icon={<MapPin className="h-3.5 w-3.5" />}>
                <select
                  id="lp-district"
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="" disabled>
                    আপনার জেলা সিলেক্ট করুন
                  </option>
                  {BD_DISTRICTS.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                id="lp-address"
                label="সঠিক ঠিকানা *"
                icon={<MapPin className="h-3.5 w-3.5" />}
              >
                <Textarea
                  id="lp-address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="House #, Road #, Area, Thana..."
                  rows={3}
                  className="rounded-lg"
                  required
                />
              </FormField>

              <div>
                <Label className="mb-2 block text-sm font-semibold">ডেলিভারি চার্জ</Label>
                <RadioGroup
                  value={shipMethod}
                  onValueChange={(v) => setShipMethod(v as "inside" | "outside")}
                  className="grid grid-cols-2 gap-2.5"
                >
                  <ShipOption
                    id="ship-inside"
                    value="inside"
                    current={shipMethod}
                    title="ঢাকার ভেতরে"
                    sub={`৳${SHIPPING_INSIDE}`}
                  />
                  <ShipOption
                    id="ship-outside"
                    value="outside"
                    current={shipMethod}
                    title="ঢাকার বাইরে"
                    sub={`৳${SHIPPING_OUTSIDE}`}
                  />
                </RadioGroup>
              </div>

              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Subtotal ({qty} × ৳{activePack.price.toLocaleString()})
                  </span>
                  <span className="font-semibold text-foreground">
                    ৳ {subtotal.toLocaleString()}
                  </span>
                </div>
                {savings > 0 && (
                  <div className="mt-1.5 flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400">আপনি save করছেন</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      − ৳{savings.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="mt-1.5 flex justify-between text-sm">
                  <span className="text-muted-foreground">ডেলিভারি চার্জ</span>
                  <span className="font-semibold text-foreground">৳ {shippingFee}</span>
                </div>
                <div className="my-3 border-t border-border" />
                <div className="flex items-end justify-between">
                  <span className="text-sm font-semibold text-foreground">মোট পেমেন্ট</span>
                  <span className="text-2xl font-extrabold text-primary">
                    ৳ {totalPay.toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  💵 Cash on Delivery — পণ্য হাতে পেয়ে টাকা দিবেন
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> অর্ডার প্লেস হচ্ছে...
                  </>
                ) : (
                  <>
                    <Gift className="mr-2 h-4 w-4" /> অর্ডার কনফার্ম করুন — ৳{" "}
                    {totalPay.toLocaleString()}
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                🔒 আপনার তথ্য ১০০% নিরাপদ
              </p>
            </div>
          </form>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="bg-muted/40 px-5 py-14">
        <div className="mx-auto max-w-xl">
          <SectionHeading kicker="FAQ" title="আপনার প্রশ্ন?" />
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="rounded-xl border border-border bg-card px-4"
              >
                <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Mobile sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[var(--shadow-elevated)] backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Aurora Galaxy Lamp
            </p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-lg font-extrabold leading-none text-primary">
                ৳{activePack.price.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground line-through">
                ৳{activePack.old.toLocaleString()}
              </p>
            </div>
          </div>
          <Button
            onClick={scrollToOrder}
            className="h-12 flex-1 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90"
          >
            <Gift className="mr-1.5 h-4 w-4" /> অর্ডার করুন
          </Button>
        </div>
      </div>
      <div className="h-24 md:hidden" />

      {/* ============ SOCIAL PROOF TOAST ============ */}
      <div
        className={`pointer-events-none fixed bottom-24 left-3 z-50 max-w-[280px] transition-all duration-500 md:bottom-6 md:left-6 ${
          proofVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        aria-live="polite"
      >
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-[var(--shadow-elevated)] backdrop-blur-xl">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.55 0.22 320), oklch(0.55 0.22 260))",
            }}
          >
            {currentBuyer.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">
              {currentBuyer.name} · {currentBuyer.city}
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
              Aurora Galaxy Lamp order korechen
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ThumbsUp className="h-2.5 w-2.5" /> {currentBuyer.min} min ago
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ===================== Sub-components ===================== */

function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  position,
  onChange,
}: {
  beforeSrc: string;
  afterSrc: string;
  position: number;
  onChange: (n: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const setFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    onChange(Math.max(0, Math.min(100, pct)));
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-2xl border border-white/10 shadow-[0_25px_60px_-20px_rgba(120,80,255,0.5)] sm:aspect-[16/10]"
      onMouseDown={(e) => {
        draggingRef.current = true;
        setFromClientX(e.clientX);
      }}
      onMouseMove={(e) => draggingRef.current && setFromClientX(e.clientX)}
      onMouseUp={() => (draggingRef.current = false)}
      onMouseLeave={() => (draggingRef.current = false)}
      onTouchStart={(e) => {
        draggingRef.current = true;
        setFromClientX(e.touches[0].clientX);
      }}
      onTouchMove={(e) => draggingRef.current && setFromClientX(e.touches[0].clientX)}
      onTouchEnd={() => (draggingRef.current = false)}
    >
      {/* AFTER (full layer) */}
      <img
        src={afterSrc}
        alt="With Aurora lamp on"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* BEFORE (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={beforeSrc}
          alt="Without lamp"
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Labels */}
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
        Before
      </span>
      <span className="absolute right-3 top-3 rounded-full bg-fuchsia-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
        After ✨
      </span>

      {/* Divider line + handle */}
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.7)]"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="pointer-events-auto absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-fuchsia-500 text-white shadow-xl">
          <span className="text-xs font-bold">⇆</span>
        </div>
      </div>

      {/* Native range for accessibility / mobile fallback */}
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Before / after slider"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur">
      <div className="text-[10px] uppercase tracking-wider text-white/60">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-white">{value}</div>
      {sub && <div className="text-[10px] text-white/50">{sub}</div>}
    </div>
  );
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-6 text-center">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        {kicker}
      </span>
      <h2 className="mt-1 text-xl font-bold text-foreground md:text-2xl">{title}</h2>
    </div>
  );
}

function SpecCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground/80">{sub}</div>}
    </div>
  );
}

function PackOption({
  active,
  onClick,
  title,
  sub,
  price,
  old,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
  price: number;
  old: number;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-3 rounded-xl border p-3 text-left transition ${
        active
          ? "border-2 border-primary bg-primary/5"
          : "border-border hover:border-foreground/20"
      }`}
    >
      {badge && (
        <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow">
          {badge}
        </span>
      )}
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          active ? "border-primary" : "border-border"
        }`}
      >
        {active && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-extrabold text-primary">৳{price.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground line-through">৳{old.toLocaleString()}</p>
      </div>
    </button>
  );
}

function ShipOption({
  id,
  value,
  current,
  title,
  sub,
}: {
  id: string;
  value: string;
  current: string;
  title: string;
  sub: string;
}) {
  const active = current === value;
  return (
    <label
      htmlFor={id}
      className={`relative flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition ${
        active
          ? "border-2 border-primary bg-primary/5"
          : "border-border hover:border-foreground/20"
      }`}
    >
      <RadioGroupItem id={id} value={value} />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </label>
  );
}

function FormField({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
        {icon} {label}
      </Label>
      {children}
    </div>
  );
}
