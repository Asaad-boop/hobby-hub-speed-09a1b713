import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
          "A+ hard paper e ১২টি Plane design, hard cardboard e ১০টি 3D Car — Bangla manual soho. Combo te ৳১০০ bachao. COD all over Bangladesh.",
      },
      { property: "og:title", content: "Plane + Car Kit Combo — Fold It. Build It." },
      {
        property: "og:description",
        content: "১২ Plane design + ১০ 3D Car design — combo te ৳১০০ bachao. Bangla manual soho.",
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
  { color: "blue", text: "A+ Hard Paper — ১২ Plane design (প্রতিটি ৩টি)", qty: "৩৬ শিট" },
  { color: "amber", text: "Hard Cardboard — ১০ Car design (প্রতিটি ৩টি)", qty: "৩০ শিট" },
  { color: "blue", text: "Bangla Manual — Plane + Car uvoier nirdeshona", qty: "১টি" },
  { color: "amber", text: "Step-by-step chobi soho design card", qty: "২২টি" },
  { color: "blue", text: "Premium gift box packaging", qty: "১টি" },
];

const FAQS = [
  {
    q: "Boyosh koto theke koto bochorer bachchader jonno?",
    a: "5 bochor theke 14 bochor — sob ages-e perfect. Choto bachcha-der jonno parents help korte hobe pratham.",
  },
  {
    q: "Combo te ki ki thakbe?",
    a: "Plane Kit (১২ design, ৩৬ shit A+ hard paper) + Car Kit (১০ design, ৩০ shit hard cardboard) + dui kit-er Bangla manual + 22ti design card + premium gift box.",
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
      const variantLabel = variant === "combo" ? "Plane + Car Combo" : "Single Kit";

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

  return (
    <div className="bg-background text-foreground">
      {/* HERO */}
      <section className="px-5 pt-10 pb-6 text-center">
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          <span className="inline-block rounded-full bg-sky-100 px-3.5 py-1 text-xs font-medium text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
            ✈️ Plane Kit — ১২ ডিজাইন
          </span>
          <span className="inline-block rounded-full bg-amber-100 px-3.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            🚗 Car Kit — ১০ ডিজাইন
          </span>
        </div>
        <h1 className="mx-auto max-w-xl text-balance text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
          Fold It. Build It.
          <br />
          Plane ও 3D Car — একসাথে!
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          A+ সাইজ হার্ড পেপারে ১২টি Plane ডিজাইন, হার্ড কার্ডবোর্ডে ১০টি 3D Car — বাংলা ম্যানুয়াল সহ।
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Button
            onClick={scrollToOrder}
            className="h-11 rounded-md bg-sky-700 px-6 text-sm font-medium text-white hover:bg-sky-800"
          >
            এখনই অর্ডার করুন →
          </Button>
          <Button
            variant="outline"
            onClick={() => document.getElementById("designs")?.scrollIntoView({ behavior: "smooth" })}
            className="h-11 rounded-md border-border px-6 text-sm font-normal"
          >
            বিস্তারিত দেখুন
          </Button>
        </div>
      </section>

      {/* TWO KIT CARDS */}
      <section className="grid grid-cols-2 gap-3.5 px-5 py-4">
        {/* Plane card */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex min-h-[120px] items-center justify-center bg-sky-50 p-6 dark:bg-sky-950/20">
            <svg viewBox="0 0 120 90" className="h-20 w-28">
              <polygon points="10,60 60,20 110,60 60,50" fill="#B5D4F4" stroke="#378ADD" strokeWidth="1.5" />
              <polygon points="60,20 110,60 60,50" fill="#85B7EB" stroke="#378ADD" strokeWidth="1.5" />
              <polygon points="60,50 110,60 90,75" fill="#E6F1FB" stroke="#378ADD" strokeWidth="1.5" />
              <polygon points="60,50 10,60 30,75" fill="#B5D4F4" stroke="#185FA5" strokeWidth="1.5" />
              <line x1="60" y1="20" x2="60" y2="70" stroke="#185FA5" strokeWidth="0.8" strokeDasharray="3,2" />
            </svg>
          </div>
          <div className="p-4">
            <div className="text-sm font-medium text-foreground">✈️ Paper Plane Kit</div>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
              A+ সাইজ হার্ড পেপার · ১২টি ডিজাইন · ৩৬টি শিট
            </div>
          </div>
        </div>

        {/* Car card */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex min-h-[120px] items-center justify-center bg-amber-50 p-6 dark:bg-amber-950/20">
            <svg viewBox="0 0 120 90" className="h-20 w-28">
              <rect x="20" y="35" width="80" height="30" rx="4" fill="#FAC775" stroke="#BA7517" strokeWidth="1.5" />
              <rect x="30" y="22" width="55" height="20" rx="4" fill="#FAEEDA" stroke="#BA7517" strokeWidth="1.5" />
              <circle cx="35" cy="67" r="9" fill="#444441" stroke="#2C2C2A" strokeWidth="1.5" />
              <circle cx="35" cy="67" r="5" fill="#888780" />
              <circle cx="85" cy="67" r="9" fill="#444441" stroke="#2C2C2A" strokeWidth="1.5" />
              <circle cx="85" cy="67" r="5" fill="#888780" />
              <rect x="35" y="26" width="18" height="12" rx="2" fill="#B5D4F4" stroke="#378ADD" strokeWidth="1" />
              <rect x="60" y="26" width="18" height="12" rx="2" fill="#B5D4F4" stroke="#378ADD" strokeWidth="1" />
              <rect x="20" y="50" width="12" height="8" rx="1" fill="#EF9F27" stroke="#BA7517" strokeWidth="1" />
              <rect x="88" y="50" width="12" height="8" rx="1" fill="#EF9F27" stroke="#BA7517" strokeWidth="1" />
            </svg>
          </div>
          <div className="p-4">
            <div className="text-sm font-medium text-foreground">🚗 3D Car Kit</div>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
              হার্ড কার্ডবোর্ড · ১০টি ডিজাইন · 3D শেপ
            </div>
          </div>
        </div>
      </section>

      {/* SPECIFICATIONS */}
      <section className="px-5 py-6">
        <h2 className="mb-5 text-center text-base font-semibold text-foreground">কিটের স্পেসিফিকেশন</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Plane specs */}
          <div>
            <span className="mb-2.5 inline-block rounded-md bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
              ✈️ Plane Kit
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <SpecCard label="মোট শিট" value="৩৬টি" sub="প্রতি ডিজাইন ৩টি" />
              <SpecCard label="ডিজাইন" value="১২টি" sub="ইউনিক ডিজাইন" />
              <SpecCard label="পেপার" value="A+ Hard" />
              <SpecCard label="ম্যানুয়াল" value="বাংলা" />
            </div>
          </div>
          {/* Car specs */}
          <div>
            <span className="mb-2.5 inline-block rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              🚗 Car Kit
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <SpecCard label="মোট শিট" value="৩০টি" sub="প্রতি ডিজাইন ৩টি" />
              <SpecCard label="ডিজাইন" value="১০টি" sub="ইউনিক ডিজাইন" />
              <SpecCard label="মেটেরিয়াল" value="Cardboard" />
              <SpecCard label="শেপ" value="3D" />
            </div>
          </div>
        </div>
      </section>

      {/* DESIGNS */}
      <section id="designs" className="px-5 py-6">
        <h2 className="mb-5 text-center text-base font-semibold text-foreground">কোন কোন ডিজাইন থাকছে?</h2>

        <div className="mb-6">
          <div className="mb-2.5 inline-block rounded-md bg-sky-100 px-3 py-1.5 text-xs font-medium text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
            ✈️ Plane — ১২টি ডিজাইন
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PLANE_DESIGNS.map((d) => (
              <DesignPill key={d.name} icon={d.icon} name={d.name} />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2.5 inline-block rounded-md bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            🚗 Car — ১০টি ডিজাইন
          </div>
          <div className="grid grid-cols-5 gap-2">
            {CAR_DESIGNS.map((d) => (
              <DesignPill key={d.name} icon={d.icon} name={d.name} />
            ))}
          </div>
        </div>
      </section>

      {/* INCLUDES */}
      <section className="px-5 py-6">
        <h2 className="mb-4 text-center text-base font-semibold text-foreground">কিটে কী কী থাকছে?</h2>
        <div className="rounded-2xl bg-muted/60 p-5">
          {INCLUDES.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 py-2.5 text-sm text-foreground ${
                i < INCLUDES.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span
                className={`h-2 w-2 flex-shrink-0 rounded-full ${
                  item.color === "blue" ? "bg-sky-500" : "bg-amber-500"
                }`}
              />
              <span className="flex-1">{item.text}</span>
              <span className="text-xs font-medium text-muted-foreground">{item.qty}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="px-5 py-6">
        <h2 className="mb-5 text-center text-base font-semibold text-foreground">প্রাইসিং</h2>
        <div className="grid grid-cols-2 gap-3">
          {/* Single */}
          <button
            type="button"
            onClick={() => {
              setVariant("single");
              scrollToOrder();
            }}
            className={`relative rounded-2xl border bg-card p-5 text-center transition ${
              variant === "single" ? "border-2 border-sky-600 shadow-md" : "border-border"
            }`}
          >
            <div className="text-xs text-muted-foreground">Single Kit</div>
            <div className="mt-2 text-xs text-muted-foreground line-through">৳ ৭৯৫</div>
            <div className="mt-1 text-2xl font-semibold text-foreground">৳ ৬৯৫</div>
            <div className="h-5" />
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              ১টি Plane Kit (১২ ডিজাইন)
              <br />
              <strong>অথবা</strong>
              <br />
              ১টি Car Kit (১০ ডিজাইন)
              <br />
              <br />
              বাংলা ম্যানুয়াল সহ
            </p>
            <div className="rounded-md border border-border py-2 text-xs font-medium text-foreground">
              অর্ডার করুন →
            </div>
          </button>

          {/* Combo (featured) */}
          <button
            type="button"
            onClick={() => {
              setVariant("combo");
              scrollToOrder();
            }}
            className={`relative rounded-2xl border-2 bg-card p-5 text-center transition ${
              variant === "combo" ? "border-sky-600 shadow-lg" : "border-sky-300"
            }`}
          >
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-sky-600 px-3 py-0.5 text-[11px] font-medium text-white">
              সাশ্রয়ী কম্বো
            </span>
            <div className="text-xs text-muted-foreground">Plane + Car Combo</div>
            <div className="mt-2 text-xs text-muted-foreground line-through">৳ ১৩৯০</div>
            <div className="mt-1 text-2xl font-semibold text-foreground">৳ ১২৯০</div>
            <div className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              ৳ ১০০ বাঁচছেন!
            </div>
            <p className="mb-3 mt-2 text-xs leading-relaxed text-muted-foreground">
              Plane Kit (১২ ডিজাইন, ৩৬ শিট)
              <br />
              +<br />
              Car Kit (১০ ডিজাইন, ৩০ শিট)
              <br />
              <br />
              দুটো ম্যানুয়াল সহ
            </p>
            <div className="rounded-md bg-sky-700 py-2 text-xs font-medium text-white">
              কম্বো নিন →
            </div>
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Truck className="h-3.5 w-3.5" /> ঢাকায় ফ্রি ডেলিভারি
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <RotateCcw className="h-3.5 w-3.5" /> ৭ দিনের রিটার্ন
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <PackageCheck className="h-3.5 w-3.5" /> গিফট প্যাকেজিং
          </span>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="mx-5 my-6 rounded-2xl bg-sky-50 px-6 py-8 text-center dark:bg-sky-950/30">
        <h2 className="text-base font-semibold text-sky-900 dark:text-sky-100">
          Plane আর Car — দুটোই নিন, ৳ ১০০ বাঁচান!
        </h2>
        <p className="mt-1.5 text-xs text-sky-700 dark:text-sky-300">
          স্টক সীমিত। কম্বো অফার যেকোনো সময় শেষ হতে পারে।
        </p>
        <Button
          onClick={() => {
            setVariant("combo");
            scrollToOrder();
          }}
          className="mt-5 h-12 rounded-md bg-sky-700 px-8 text-sm font-medium text-white hover:bg-sky-800"
        >
          Combo নিন — ৳ ১২৯০ →
        </Button>
      </section>

      {/* ORDER FORM */}
      <section ref={orderRef} className="scroll-mt-4 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">অর্ডার ফর্ম</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              ফর্ম পূরণ করুন — আমরা কনফার্ম করতে কল করব। Cash on Delivery।
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
            {/* Variant + qty summary */}
            <div className="flex items-center gap-3 border-b border-border bg-muted/40 p-4">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {variant === "combo" ? "Plane + Car Combo" : "Single Kit"}
                </p>
                <p className="mt-0.5 text-base font-bold text-sky-700 dark:text-sky-400">
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
              {/* Variant switch */}
              <div>
                <Label className="mb-2 block text-sm font-medium">কোন কিট নিতে চান?</Label>
                <RadioGroup
                  value={variant}
                  onValueChange={(v) => setVariant(v as "single" | "combo")}
                  className="grid grid-cols-2 gap-2.5"
                >
                  <label
                    htmlFor="v-single"
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition ${
                      variant === "single" ? "border-2 border-sky-600 bg-sky-50 dark:bg-sky-950/20" : "border-border"
                    }`}
                  >
                    <RadioGroupItem id="v-single" value="single" />
                    <div className="flex-1 text-sm">
                      <p className="font-semibold">Single — ৳৬৯৫</p>
                      <p className="text-xs text-muted-foreground">Plane বা Car</p>
                    </div>
                  </label>
                  <label
                    htmlFor="v-combo"
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition ${
                      variant === "combo" ? "border-2 border-sky-600 bg-sky-50 dark:bg-sky-950/20" : "border-border"
                    }`}
                  >
                    <RadioGroupItem id="v-combo" value="combo" />
                    <div className="flex-1 text-sm">
                      <p className="font-semibold">Combo — ৳১২৯০</p>
                      <p className="text-xs text-muted-foreground">দুটোই + ৳১০০ off</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="lp-name" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                  <UserIcon className="h-3.5 w-3.5" /> আপনার নাম *
                </Label>
                <Input
                  id="lp-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Mohammed Akash"
                  className="h-11 rounded-lg"
                  required
                />
              </div>

              <div>
                <Label htmlFor="lp-phone" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                  <Phone className="h-3.5 w-3.5" /> মোবাইল নাম্বার *
                </Label>
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
              </div>

              <div>
                <Label htmlFor="lp-district" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                  <MapPin className="h-3.5 w-3.5" /> জেলা *
                </Label>
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
              </div>

              <div>
                <Label htmlFor="lp-address" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                  <MapPin className="h-3.5 w-3.5" /> সঠিক ঠিকানা *
                </Label>
                <Textarea
                  id="lp-address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="House #, Road #, Area, Thana..."
                  rows={3}
                  className="rounded-lg"
                  required
                />
              </div>

              <div>
                <Label className="mb-2 block text-sm font-medium">ডেলিভারি চার্জ</Label>
                <RadioGroup
                  value={shipMethod}
                  onValueChange={(v) => setShipMethod(v as "inside" | "outside")}
                  className="grid grid-cols-2 gap-2.5"
                >
                  <label
                    htmlFor="ship-inside"
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition ${
                      shipMethod === "inside" ? "border-2 border-sky-600 bg-sky-50 dark:bg-sky-950/20" : "border-border"
                    }`}
                  >
                    <RadioGroupItem id="ship-inside" value="inside" />
                    <div className="flex-1 text-sm">
                      <p className="font-semibold">ঢাকার ভেতরে</p>
                      <p className="text-xs text-muted-foreground">৳{SHIPPING_INSIDE}</p>
                    </div>
                  </label>
                  <label
                    htmlFor="ship-outside"
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition ${
                      shipMethod === "outside" ? "border-2 border-sky-600 bg-sky-50 dark:bg-sky-950/20" : "border-border"
                    }`}
                  >
                    <RadioGroupItem id="ship-outside" value="outside" />
                    <div className="flex-1 text-sm">
                      <p className="font-semibold">ঢাকার বাইরে</p>
                      <p className="text-xs text-muted-foreground">৳{SHIPPING_OUTSIDE}</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <div className="rounded-xl bg-muted/50 p-4">
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
                  <span className="text-xl font-bold text-sky-700 dark:text-sky-400">
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
                className="h-12 w-full rounded-md bg-sky-700 text-sm font-semibold text-white hover:bg-sky-800"
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
      <section className="px-5 py-8">
        <div className="mx-auto max-w-xl">
          <h2 className="text-center text-lg font-semibold text-foreground">আপনার প্রশ্ন?</h2>
          <Accordion type="single" collapsible className="mt-5 space-y-2">
            {FAQS.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="rounded-xl border border-border bg-card px-4"
              >
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
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

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 p-3 shadow-lg backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground line-through">৳ {oldPrice.toLocaleString()}</p>
            <p className="text-lg font-bold leading-none text-sky-700 dark:text-sky-400">
              ৳ {unitPrice.toLocaleString()}
            </p>
          </div>
          <Button
            onClick={scrollToOrder}
            className="h-11 flex-1 rounded-md bg-sky-700 text-sm font-semibold text-white hover:bg-sky-800"
          >
            <Gift className="mr-1.5 h-4 w-4" /> অর্ডার করুন
          </Button>
        </div>
      </div>
      <div className="h-20 md:hidden" />
    </div>
  );
}

function SpecCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md bg-muted/60 px-3 py-3 text-center">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground/80">{sub}</div>}
    </div>
  );
}

function DesignPill({ icon, name }: { icon: string; name: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-2 py-2 text-center">
      <div className="text-lg leading-none">{icon}</div>
      <div className="mt-1 text-[10px] leading-tight text-muted-foreground">{name}</div>
    </div>
  );
}
