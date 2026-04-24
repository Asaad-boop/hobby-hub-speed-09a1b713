import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductByIdOrSlug, type Product } from "@/lib/products";
import { BD_DISTRICTS } from "@/lib/bd-locations";
import { getOrderAttributionPayload } from "@/lib/session-tracking";
import { fbTrack, META_CURRENCY } from "@/lib/meta-pixel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  CheckCircle2,
  PlayCircle,
  Star,
  Quote,
} from "lucide-react";

const PRODUCT_SLUG = "air-plane-car-combo-2design-combo-origami-paper-1";
const SHIPPING_INSIDE = 70;
const SHIPPING_OUTSIDE = 130;

export const Route = createFileRoute("/lp/origami-combo")({
  head: () => ({
    meta: [
      { title: "Plane + Car Kit Combo — Fold It. Build It. | HobbyShop" },
      {
        name: "description",
        content:
          "A+ hard paper e ১২টি Plane design, hard cardboard e ১০টি 3D Car — step-by-step video instruction soho. Combo te ৳১০০ bachao. COD all over Bangladesh.",
      },
      { property: "og:title", content: "Plane + Car Kit Combo — Fold It. Build It." },
      {
        property: "og:description",
        content: "১২ Plane design + ১০ 3D Car design — combo te ৳১০০ bachao. Video instruction soho.",
      },
    ],
  }),
  loader: async () => {
    const product = await fetchProductByIdOrSlug(PRODUCT_SLUG);
    return { product };
  },
  component: LandingPage,
});

const PLANE_DESIGNS = [
  { icon: "✈️", name: "Classic Dart" },
  { icon: "🛩️", name: "Fighter Jet" },
  { icon: "🛫", name: "Glider" },
  { icon: "🚀", name: "Rocket Wing" },
  { icon: "🦅", name: "Eagle Wing" },
  { icon: "⭐", name: "Star Plane" },
  { icon: "🌊", name: "Wave Glider" },
  { icon: "🔥", name: "Turbo Dart" },
  { icon: "🏹", name: "Arrow Jet" },
  { icon: "🦋", name: "Butterfly" },
  { icon: "💫", name: "Stunt Flyer" },
  { icon: "🛸", name: "UFO Glider" },
];

const CAR_DESIGNS = [
  { icon: "🏎️", name: "Sports Car" },
  { icon: "🚙", name: "SUV" },
  { icon: "🚌", name: "Bus" },
  { icon: "🚒", name: "Fire Truck" },
  { icon: "🏕️", name: "Jeep" },
  { icon: "🚓", name: "Police Car" },
  { icon: "🚕", name: "Taxi Cab" },
  { icon: "🚛", name: "Truck" },
  { icon: "🏍️", name: "Muscle Car" },
  { icon: "🚑", name: "Ambulance" },
];

const INCLUDES = [
  { text: "A+ Hard Paper — ১২ Plane design (প্রতিটি ৩টি)", qty: "৩৬ শিট" },
  { text: "Hard Cardboard — ১০ Car design (প্রতিটি ৩টি)", qty: "৩০ শিট" },
  { text: "Step-by-step Video Instruction (QR code soho)", qty: "২২টি" },
  { text: "প্রতিটি ডিজাইনের আলাদা ডিজাইন কার্ড", qty: "২২টি" },
  { text: "Premium gift box packaging", qty: "১টি" },
];

const VIDEOS = [
  { title: "Plane — Classic Dart কীভাবে বানাবেন", duration: "2:14", thumb: "✈️" },
  { title: "Plane — Fighter Jet step-by-step", duration: "3:08", thumb: "🛩️" },
  { title: "Car — Sports Car 3D assembly", duration: "4:22", thumb: "🏎️" },
  { title: "Car — Fire Truck full build", duration: "5:10", thumb: "🚒" },
];

const REVIEWS = [
  {
    name: "Sumaiya Akter",
    location: "Dhanmondi, Dhaka",
    rating: 5,
    text: "Amar 8 bochorer chele eta peye onek khushi! Video dekhe nije nije banaite parche. Quality o khub valo, hard paper.",
    date: "12 days ago",
    verified: true,
  },
  {
    name: "Rakib Hasan",
    location: "Chattogram",
    rating: 5,
    text: "Combo nilam — Plane ar Car dutoi. Packaging gift box er moto, delivery o fast chilo. Bachchara onek enjoy korche.",
    date: "1 month ago",
    verified: true,
  },
  {
    name: "Nusrat Jahan",
    location: "Sylhet",
    rating: 4,
    text: "Video instruction tao khub kaaj e diyeche, bangla manual chara o sohoje bujha jay. Mobile e dekhe banano gelo.",
    date: "3 weeks ago",
    verified: true,
  },
  {
    name: "Tanvir Ahmed",
    location: "Mirpur, Dhaka",
    rating: 5,
    text: "Birthday gift hisebe nilam vagner jonno — onek pochondo korche. Worth the price, recommend korbo.",
    date: "2 months ago",
    verified: true,
  },
];

const FAQS = [
  {
    q: "Boyosh koto theke koto bochorer bachchader jonno?",
    a: "5 bochor theke 14 bochor — sob ages-e perfect. Choto bachcha-der jonno parents help korte hobe pratham.",
  },
  {
    q: "Combo te ki ki thakbe?",
    a: "Plane Kit (১২ design, ৩৬ shit A+ hard paper) + Car Kit (১০ design, ৩০ shit hard cardboard) + step-by-step video instruction (QR code scan kore dekhben) + 22ti design card + premium gift box.",
  },
  {
    q: "Manual nai? Kivabe banabo?",
    a: "Protyek design er alada video instruction ache — QR code scan korle phone e direct video chole asbe. Bangla voice over soho, bachcha rao sohoje bujhte parbe.",
  },
  {
    q: "Single nile Plane na Car — kun ta pabo?",
    a: "Single nile order form e apni nije Plane ba Car select korte parben. Combo nile dutoi pawa jabe.",
  },
  {
    q: "Delivery koto din-e pabo?",
    a: "Dhaka-r vetor 1-2 din, Dhaka-r baire 2-4 din. Cash on Delivery available — product hath-e niye taka diben.",
  },
  {
    q: "Damaged ele ki korbo?",
    a: "Delivery man er samne open kore check korben. Kono problem hole 100% replacement guarantee.",
  },
];

function LandingPage() {
  const { product } = Route.useLoaderData() as { product: Product | null };
  const navigate = useNavigate();

  const [variant, setVariant] = useState<"single" | "combo">("combo");
  const [singleKit, setSingleKit] = useState<"plane" | "car">("plane");
  const [qty, setQty] = useState(1);
  const [shipMethod, setShipMethod] = useState<"inside" | "outside">("inside");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", district: "" });
  const orderRef = useRef<HTMLDivElement | null>(null);

  const SINGLE_PRICE = 695;
  const COMBO_PRICE = 1290;
  const SINGLE_OLD = 795;
  const COMBO_OLD = 1390;

  const unitPrice = variant === "combo" ? COMBO_PRICE : SINGLE_PRICE;
  const oldPrice = variant === "combo" ? COMBO_OLD : SINGLE_OLD;

  useEffect(() => {
    if (!product) return;
    fbTrack("ViewContent", {
      content_ids: [product.id],
      content_name: product.title,
      value: unitPrice,
      currency: META_CURRENCY,
    });
  }, [product, unitPrice]);

  const subtotal = unitPrice * qty;
  const shippingFee = shipMethod === "inside" ? SHIPPING_INSIDE : SHIPPING_OUTSIDE;
  const totalPay = subtotal + shippingFee;

  const scrollToOrder = () => {
    orderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

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

      const itemSubtotal = unitPrice * qty;
      const orderTotal = itemSubtotal + shippingFee;
      const attribution = getOrderAttributionPayload();
      const variantLabel =
        variant === "combo"
          ? "Plane + Car Combo"
          : singleKit === "plane"
            ? "Single Kit — Plane (12 designs)"
            : "Single Kit — Car (10 designs)";

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
        source_website: "lp/origami-combo",
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

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert(orderInsert)
        .select("id")
        .single();

      if (orderErr || !order) {
        console.error("Order insert failed:", orderErr);
        toast.error(orderErr?.message ? `Order falure: ${orderErr.message}` : "Order place hocche na, abar try korun.");
        setSubmitting(false);
        return;
      }

      const { error: itemsErr } = await supabase.from("order_items").insert([
        {
          order_id: order.id,
          user_id: isGuest ? null : session!.user.id,
          product_id: product.id,
          name: `${product.title} — ${variantLabel}`,
          image: product.image,
          price: unitPrice,
          quantity: qty,
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

      fbTrack("Purchase", {
        content_ids: [product.id],
        value: orderTotal,
        currency: META_CURRENCY,
      });

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
        <Link to="/shop" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">
          Shop e firte ja
        </Link>
      </div>
    );
  }

  const savings = COMBO_OLD - COMBO_PRICE;

  return (
    <div className="bg-background text-foreground">
      {/* HERO — bold brand gradient */}
      <section
        className="relative overflow-hidden px-5 pt-12 pb-10 text-center"
        style={{ background: "var(--gradient-dark)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, oklch(0.585 0.245 27.5 / 0.55), transparent 70%)",
          }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-brand)]">
            <Sparkles className="h-3 w-3" /> Limited Combo Offer
          </span>
          <h1 className="mx-auto mt-5 max-w-xl text-balance text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Fold It. Build It.
            <br />
            <span className="bg-gradient-to-r from-primary to-[oklch(0.72_0.20_30)] bg-clip-text text-transparent">
              Plane + 3D Car Combo
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/70">
            A+ সাইজ হার্ড পেপারে ১২টি Plane ডিজাইন, হার্ড কার্ডবোর্ডে ১০টি 3D Car — প্রতিটি ডিজাইনের জন্য আলাদা ভিডিও ইনস্ট্রাকশন।
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/85 backdrop-blur">
              ✈️ ১২ Plane
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/85 backdrop-blur">
              🚗 ১০ Car
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/85 backdrop-blur">
              🎬 Video Instruction
            </span>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <Button
              onClick={scrollToOrder}
              className="h-12 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90"
            >
              এখনই অর্ডার করুন →
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById("designs")?.scrollIntoView({ behavior: "smooth" })}
              className="h-12 rounded-full border-white/20 bg-white/5 px-6 text-sm font-medium text-white backdrop-blur hover:bg-white/10 hover:text-white"
            >
              বিস্তারিত দেখুন
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-white/60">
            <ShieldCheck className="h-3.5 w-3.5" /> Cash on Delivery · 100% Replacement Guarantee
          </div>
        </div>
      </section>

      {/* TWO KIT CARDS */}
      <section className="-mt-6 grid grid-cols-2 gap-3.5 px-5">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex min-h-[120px] items-center justify-center bg-muted p-6">
            <svg viewBox="0 0 120 90" className="h-20 w-28">
              <polygon points="10,60 60,20 110,60 60,50" fill="oklch(0.92 0 0)" stroke="oklch(0.18 0 0)" strokeWidth="1.5" />
              <polygon points="60,20 110,60 60,50" fill="oklch(0.82 0 0)" stroke="oklch(0.18 0 0)" strokeWidth="1.5" />
              <polygon points="60,50 110,60 90,75" fill="oklch(0.97 0 0)" stroke="oklch(0.18 0 0)" strokeWidth="1.5" />
              <polygon points="60,50 10,60 30,75" fill="oklch(0.92 0 0)" stroke="oklch(0.18 0 0)" strokeWidth="1.5" />
              <line x1="60" y1="20" x2="60" y2="70" stroke="oklch(0.18 0 0)" strokeWidth="0.8" strokeDasharray="3,2" />
            </svg>
          </div>
          <div className="p-4">
            <div className="text-sm font-semibold text-foreground">✈️ Paper Plane Kit</div>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
              A+ হার্ড পেপার · ১২টি ডিজাইন · ৩৬ শিট
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex min-h-[120px] items-center justify-center bg-muted p-6">
            <svg viewBox="0 0 120 90" className="h-20 w-28">
              <rect x="20" y="35" width="80" height="30" rx="4" fill="oklch(0.585 0.245 27.5)" stroke="oklch(0.18 0 0)" strokeWidth="1.5" />
              <rect x="30" y="22" width="55" height="20" rx="4" fill="oklch(0.95 0.05 27)" stroke="oklch(0.18 0 0)" strokeWidth="1.5" />
              <circle cx="35" cy="67" r="9" fill="oklch(0.18 0 0)" stroke="oklch(0.10 0 0)" strokeWidth="1.5" />
              <circle cx="35" cy="67" r="5" fill="oklch(0.55 0 0)" />
              <circle cx="85" cy="67" r="9" fill="oklch(0.18 0 0)" stroke="oklch(0.10 0 0)" strokeWidth="1.5" />
              <circle cx="85" cy="67" r="5" fill="oklch(0.55 0 0)" />
              <rect x="35" y="26" width="18" height="12" rx="2" fill="oklch(0.85 0 0)" stroke="oklch(0.18 0 0)" strokeWidth="1" />
              <rect x="60" y="26" width="18" height="12" rx="2" fill="oklch(0.85 0 0)" stroke="oklch(0.18 0 0)" strokeWidth="1" />
              <rect x="20" y="50" width="12" height="8" rx="1" fill="oklch(0.96 0.07 90)" stroke="oklch(0.18 0 0)" strokeWidth="1" />
              <rect x="88" y="50" width="12" height="8" rx="1" fill="oklch(0.96 0.07 90)" stroke="oklch(0.18 0 0)" strokeWidth="1" />
            </svg>
          </div>
          <div className="p-4">
            <div className="text-sm font-semibold text-foreground">🚗 3D Car Kit</div>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
              হার্ড কার্ডবোর্ড · ১০টি ডিজাইন · 3D শেপ
            </div>
          </div>
        </div>
      </section>

      {/* SPECIFICATIONS */}
      <section className="px-5 py-10">
        <SectionHeading kicker="Specifications" title="কিটের স্পেসিফিকেশন" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <KitTag>✈️ Plane Kit</KitTag>
            <div className="grid grid-cols-2 gap-2.5">
              <SpecCard label="মোট শিট" value="৩৬টি" sub="প্রতি ডিজাইন ৩টি" />
              <SpecCard label="ডিজাইন" value="১২টি" sub="ইউনিক" />
              <SpecCard label="পেপার" value="A+ Hard" />
              <SpecCard label="ইনস্ট্রাকশন" value="Video" sub="QR scan" />
            </div>
          </div>
          <div>
            <KitTag>🚗 Car Kit</KitTag>
            <div className="grid grid-cols-2 gap-2.5">
              <SpecCard label="মোট শিট" value="৩০টি" sub="প্রতি ডিজাইন ৩টি" />
              <SpecCard label="ডিজাইন" value="১০টি" sub="ইউনিক" />
              <SpecCard label="মেটেরিয়াল" value="Cardboard" />
              <SpecCard label="শেপ" value="3D" />
            </div>
          </div>
        </div>
      </section>

      {/* DESIGNS */}
      <section id="designs" className="bg-muted/40 px-5 py-10">
        <SectionHeading kicker="Designs" title="কোন কোন ডিজাইন থাকছে?" />

        <div className="mb-6">
          <KitTag>✈️ Plane — ১২টি ডিজাইন</KitTag>
          <div className="grid grid-cols-4 gap-2">
            {PLANE_DESIGNS.map((d) => (
              <DesignPill key={d.name} icon={d.icon} name={d.name} />
            ))}
          </div>
        </div>

        <div>
          <KitTag>🚗 Car — ১০টি ডিজাইন</KitTag>
          <div className="grid grid-cols-5 gap-2">
            {CAR_DESIGNS.map((d) => (
              <DesignPill key={d.name} icon={d.icon} name={d.name} />
            ))}
          </div>
        </div>
      </section>

      {/* INCLUDES */}
      <section className="px-5 py-10">
        <SectionHeading kicker="What's inside" title="কিটে কী কী থাকছে?" />
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          {INCLUDES.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 py-3 text-sm text-foreground ${
                i < INCLUDES.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="flex-1">{item.text}</span>
              <span className="text-xs font-semibold text-muted-foreground">{item.qty}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="px-5 py-10">
        <SectionHeading kicker="Pricing" title="আপনার জন্য সেরা অফার" />
        <div className="grid grid-cols-2 gap-3">
          {/* Single */}
          <button
            type="button"
            onClick={() => {
              setVariant("single");
              scrollToOrder();
            }}
            className={`relative rounded-2xl border bg-card p-5 text-center transition ${
              variant === "single"
                ? "border-2 border-primary shadow-[var(--shadow-brand)]"
                : "border-border hover:border-foreground/20"
            }`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Single Kit</div>
            <div className="mt-2 text-xs text-muted-foreground line-through">৳ ৭৯৫</div>
            <div className="mt-1 text-3xl font-extrabold text-foreground">৳ ৬৯৫</div>
            <div className="h-3" />
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              ১টি Plane Kit (১২ ডিজাইন)
              <br />
              <strong className="text-foreground">অথবা</strong>
              <br />
              ১টি Car Kit (১০ ডিজাইন)
              <br />
              <br />
              ভিডিও ইনস্ট্রাকশন সহ
            </p>
            <div className="rounded-full border border-border py-2 text-xs font-semibold text-foreground">
              অর্ডার করুন →
            </div>
          </button>

          {/* Combo */}
          <button
            type="button"
            onClick={() => {
              setVariant("combo");
              scrollToOrder();
            }}
            className={`relative rounded-2xl p-5 text-center text-white transition ${
              variant === "combo" ? "shadow-[var(--shadow-brand)]" : "shadow-[var(--shadow-card)]"
            }`}
            style={{ background: "var(--gradient-dark)" }}
          >
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
              Best Value
            </span>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Plane + Car Combo</div>
            <div className="mt-2 text-xs text-white/50 line-through">৳ ১৩৯০</div>
            <div className="mt-1 text-3xl font-extrabold text-white">৳ ১২৯০</div>
            <div className="mt-1.5 inline-block rounded-full bg-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              ৳ {savings} বাঁচছেন!
            </div>
            <p className="mb-3 mt-2 text-xs leading-relaxed text-white/70">
              Plane Kit (১২ ডিজাইন, ৩৬ শিট)
              <br />+<br />
              Car Kit (১০ ডিজাইন, ৩০ শিট)
              <br />
              <br />
              ভিডিও ইনস্ট্রাকশন সহ
            </p>
            <div className="rounded-full bg-primary py-2 text-xs font-bold text-primary-foreground">
              কম্বো নিন →
            </div>
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" /> দ্রুত ডেলিভারি
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> ৭ দিনের রিটার্ন
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5">
            <PackageCheck className="h-3.5 w-3.5" /> গিফট প্যাকেজিং
          </span>
        </div>
      </section>

      {/* MID CTA */}
      <section
        className="mx-5 my-6 overflow-hidden rounded-2xl px-6 py-10 text-center text-white shadow-[var(--shadow-brand)]"
        style={{ background: "var(--gradient-brand)" }}
      >
        <h2 className="text-lg font-bold">Plane আর Car — দুটোই নিন, ৳ {savings} বাঁচান!</h2>
        <p className="mt-2 text-xs text-white/85">
          স্টক সীমিত। কম্বো অফার যেকোনো সময় শেষ হতে পারে।
        </p>
        <Button
          onClick={() => {
            setVariant("combo");
            scrollToOrder();
          }}
          className="mt-5 h-12 rounded-full bg-white px-8 text-sm font-bold text-primary hover:bg-white/90"
        >
          Combo নিন — ৳ ১২৯০ →
        </Button>
      </section>

      {/* ORDER FORM */}
      <section ref={orderRef} className="scroll-mt-4 px-5 py-10">
        <div className="mx-auto max-w-xl">
          <SectionHeading kicker="Order now" title="অর্ডার ফর্ম" />
          <p className="-mt-4 mb-6 text-center text-sm text-muted-foreground">
            ফর্ম পূরণ করুন — আমরা কনফার্ম করতে কল করব। Cash on Delivery।
          </p>

          <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 border-b border-border bg-muted/50 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {variant === "combo" ? "Plane + Car Combo" : "Single Kit"}
                </p>
                <p className="mt-0.5 text-base font-extrabold text-primary">
                  ৳ {unitPrice.toLocaleString()}
                  <span className="ml-2 text-xs font-normal text-muted-foreground line-through">
                    ৳ {oldPrice.toLocaleString()}
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
                <Label className="mb-2 block text-sm font-semibold">কোন কিট নিতে চান?</Label>
                <RadioGroup
                  value={variant}
                  onValueChange={(v) => setVariant(v as "single" | "combo")}
                  className="grid grid-cols-2 gap-2.5"
                >
                  <VariantOption id="v-single" value="single" current={variant} title="Single — ৳৬৯৫" sub="Plane বা Car" />
                  <VariantOption id="v-combo" value="combo" current={variant} title="Combo — ৳১২৯০" sub={`দুটোই + ৳${savings} off`} />
                </RadioGroup>
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

              <FormField id="lp-phone" label="মোবাইল নাম্বার *" icon={<Phone className="h-3.5 w-3.5" />}>
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
                <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}>
                  <SelectTrigger id="lp-district" className="h-11 rounded-lg">
                    <SelectValue placeholder="আপনার জেলা সিলেক্ট করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {BD_DISTRICTS.map((d) => (
                      <SelectItem key={d.name} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField id="lp-address" label="সঠিক ঠিকানা *" icon={<MapPin className="h-3.5 w-3.5" />}>
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
                  <VariantOption id="ship-inside" value="inside" current={shipMethod} title="ঢাকার ভেতরে" sub={`৳${SHIPPING_INSIDE}`} />
                  <VariantOption id="ship-outside" value="outside" current={shipMethod} title="ঢাকার বাইরে" sub={`৳${SHIPPING_OUTSIDE}`} />
                </RadioGroup>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({qty} × ৳{unitPrice})</span>
                  <span className="font-semibold text-foreground">৳ {subtotal.toLocaleString()}</span>
                </div>
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
                    <Gift className="mr-2 h-4 w-4" /> অর্ডার কনফার্ম করুন — ৳ {totalPay.toLocaleString()}
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

      {/* FAQ */}
      <section className="bg-muted/40 px-5 py-10">
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

      {/* Mobile sticky Order Now bar — updates with selected variant */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[var(--shadow-elevated)] backdrop-blur-xl md:hidden">
        {/* Quick-select pills */}
        <div className="mb-2 grid grid-cols-2 gap-1.5 rounded-full bg-muted p-1">
          <button
            type="button"
            onClick={() => setVariant("single")}
            className={`rounded-full px-2 py-1.5 text-[11px] font-bold transition-all ${
              variant === "single"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Single · ৳{SINGLE_PRICE}
          </button>
          <button
            type="button"
            onClick={() => setVariant("combo")}
            className={`relative rounded-full px-2 py-1.5 text-[11px] font-bold transition-all ${
              variant === "combo"
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]"
                : "text-muted-foreground"
            }`}
          >
            Combo · ৳{COMBO_PRICE}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {variant === "combo" ? "Plane + Car Combo" : "Single Kit"}
            </p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-lg font-extrabold leading-none text-primary">
                ৳{unitPrice.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground line-through">
                ৳{oldPrice.toLocaleString()}
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
    </div>
  );
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-6 text-center">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{kicker}</span>
      <h2 className="mt-1 text-xl font-bold text-foreground">{title}</h2>
    </div>
  );
}

function KitTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-3 inline-block rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-secondary-foreground">
      {children}
    </span>
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

function DesignPill({ icon, name }: { icon: string; name: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-2 py-2.5 text-center transition hover:border-primary/40 hover:shadow-[var(--shadow-card)]">
      <div className="text-xl leading-none">{icon}</div>
      <div className="mt-1 text-[10px] leading-tight text-muted-foreground">{name}</div>
    </div>
  );
}

function VariantOption({
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
      className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition ${
        active ? "border-2 border-primary bg-primary/5" : "border-border hover:border-foreground/20"
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
