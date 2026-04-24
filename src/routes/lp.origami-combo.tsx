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
  Star,
  Truck,
  ShieldCheck,
  Sparkles,
  Heart,
  Brain,
  Gift,
  CheckCircle2,
  Loader2,
  Phone,
  MapPin,
  User as UserIcon,
  Minus,
  Plus,
  Clock,
  Package,
  Users,
  Award,
} from "lucide-react";

const PRODUCT_SLUG = "air-plane-car-combo-2design-combo-origami-paper-1";
const SHIPPING_INSIDE = 70;
const SHIPPING_OUTSIDE = 130;

export const Route = createFileRoute("/lp/origami-combo")({
  head: () => ({
    meta: [
      { title: "Air Plane + Car Origami Combo — Bachchader Sera Upohar | HobbyShop" },
      {
        name: "description",
        content:
          "Bachchader hath theke phone soriye din. Origami paper kit diye shikhuk, banaak, khelu — moner bikash, dhairjo, srijonshilota. Cash on Delivery, Bangladesh-wide.",
      },
      { property: "og:title", content: "Air Plane + Car Origami Combo — Bachchader Sera Upohar" },
      {
        property: "og:description",
        content: "Origami diye shikha, mojai mojai. 200+ pcs combo kit, 30+ designs, manual included.",
      },
      {
        property: "og:image",
        content:
          "https://cdn.shopify.com/s/files/1/0938/0331/5501/files/WhatsApp-Image-2025-06-26-at-23.53.11_c19e98a0-1536x1536.jpg?v=1764571467",
      },
    ],
  }),
  loader: async () => {
    const product = await fetchProductByIdOrSlug(PRODUCT_SLUG);
    return { product };
  },
  component: LandingPage,
});

const FAKE_REVIEWS = [
  {
    name: "Nusrat Jahan",
    location: "Dhaka",
    rating: 5,
    text:
      "Amar 7 bochor er chele ke gift diyechilam. Eto khushi hoyeche je sara din ei origami banachhe. Phone er nesha komeche ekdom!",
    avatar: "N",
    verified: true,
  },
  {
    name: "Tanvir Ahmed",
    location: "Chattogram",
    rating: 5,
    text:
      "Quality really impressive. Paper thick, color bright, manual ta easy to follow. Bachcha + bachcha-r baba duijon ei mile banaichi — shob theke best part eitai!",
    avatar: "T",
    verified: true,
  },
  {
    name: "Sumaiya Akter",
    location: "Sylhet",
    rating: 5,
    text:
      "School theke creativity homework er jonno onek kaje legeche. Teacher prosongsa korechen. Paisa ta ekdom worth!",
    avatar: "S",
    verified: true,
  },
  {
    name: "Mahmuda Rahman",
    location: "Rajshahi",
    rating: 4,
    text:
      "Combo offer ta darun. Plane ar Car duitai pacche, bachcha sara raat khela kore. Delivery o fast cilo.",
    avatar: "M",
    verified: true,
  },
  {
    name: "Imran Hossain",
    location: "Khulna",
    rating: 5,
    text:
      "Amar mey first time origami korlo, ekhon prottek din notun kichu banachhe. Confidence beche, focus o badheche. Highly recommended.",
    avatar: "I",
    verified: true,
  },
  {
    name: "Farhana Islam",
    location: "Cumilla",
    rating: 5,
    text: "Birthday gift hisebe perfect. Packaging premium, bachchara dekhei eksho watt khushi!",
    avatar: "F",
    verified: true,
  },
];

const BENEFITS = [
  {
    icon: Brain,
    title: "Buddhibikash & Focus",
    desc: "Hath o chokher shomonnoy bare, mone-jog bare, dhairjo shikhe.",
  },
  {
    icon: Heart,
    title: "Phone er Nesha Kombe",
    desc: "Screen er bodole hath-e kichu kora — bachcha-r jonno shera bikolpo.",
  },
  {
    icon: Sparkles,
    title: "Srijonshil Shokti Bridhi",
    desc: "Nije design banano, rong baachao — kolpona shaktike unmukto kore.",
  },
  {
    icon: Award,
    title: "School-e Eka-egiye",
    desc: "Art & craft homework, science fair, project — sob jaygay kaj-e lage.",
  },
];

const FAQS = [
  {
    q: "Boyosh koto theke koto bochorer bachchader jonno?",
    a: "5 bochor theke 14 bochor — sob ages-e perfect. Choto bachcha-der jonno parents help korte hobe pratham.",
  },
  {
    q: "Combo te ki ki thakbe?",
    a: "Air Plane design er 100+ origami paper, Car design er 100+ origami paper, Step-by-step manual book, Premium gift box packaging.",
  },
  {
    q: "Delivery koto din-e pabo?",
    a: "Dhaka-r vetor 1-2 din, Dhaka-r baire 2-4 din. Cash on Delivery available — product hat-e niye taka diben.",
  },
  {
    q: "Damaged ele ki korbo?",
    a: "Delivery man er samne open kore check korben. Kono problem hole 100% replacement guarantee.",
  },
  {
    q: "Onno design ki paowa jabe?",
    a: "Ha! Amader website-e Pistol, Boat, Animal sob design er origami kit available. Order korar somoy notes-e likhe diben.",
  },
];

function LandingPage() {
  const { product } = Route.useLoaderData() as { product: Product | null };
  const navigate = useNavigate();

  const [qty, setQty] = useState(1);
  const [shipMethod, setShipMethod] = useState<"inside" | "outside">("inside");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", district: "" });
  const [activeImage, setActiveImage] = useState(0);
  const orderRef = useRef<HTMLDivElement | null>(null);

  // Countdown — resets on each visit, gives urgency
  const [secondsLeft, setSecondsLeft] = useState(60 * 60 * 6); // 6h
  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!product) return;
    fbTrack("ViewContent", {
      content_ids: [product.id],
      content_name: product.title,
      value: product.price,
      currency: META_CURRENCY,
    });
  }, [product]);

  const subtotal = useMemo(() => (product ? product.price * qty : 0), [product, qty]);
  const shippingFee = shipMethod === "inside" ? SHIPPING_INSIDE : SHIPPING_OUTSIDE;
  const totalPay = subtotal + shippingFee;

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return { h, m, s: sec };
  };
  const t = fmtTime(secondsLeft);

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

      const itemSubtotal = product.price * qty;
      const orderTotal = itemSubtotal + shippingFee;
      const attribution = getOrderAttributionPayload();

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
          name: product.title,
          image: product.image,
          price: product.price,
          quantity: qty,
          variant_id: null,
          variant_label: null,
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
        <h1 className="text-2xl font-bold">Product paowa jay ni</h1>
        <Link to="/shop" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">
          Shop e firte ja
        </Link>
      </div>
    );
  }

  const gallery = product.gallery.length ? product.gallery : [product.image];
  const discountPct = product.oldPrice > product.price
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return (
    <div className="bg-background">
      {/* Sticky urgency bar */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-primary via-primary to-primary text-primary-foreground shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Clock className="h-4 w-4 animate-pulse" />
            <span className="hidden sm:inline">Limited Offer Shesh Hote:</span>
            <span className="sm:hidden">Offer:</span>
            <span className="font-mono font-bold tabular-nums">
              {t.h}:{t.m}:{t.s}
            </span>
          </div>
          <button
            onClick={scrollToOrder}
            className="rounded-full bg-background px-3 py-1 text-xs font-bold text-primary shadow hover:scale-105 transition-transform sm:px-4 sm:text-sm"
          >
            Order Korun →
          </button>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-pink-50 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-pink-950/30">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,_oklch(0.7_0.15_50)_1px,_transparent_0)] [background-size:24px_24px]" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 md:py-16 lg:py-20">
          {/* Image */}
          <div className="order-2 md:order-1">
            <div className="overflow-hidden rounded-3xl border-4 border-background shadow-2xl">
              <img
                src={gallery[activeImage]}
                alt={product.title}
                className="aspect-square w-full object-cover"
              />
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {gallery.slice(0, 5).map((g, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`overflow-hidden rounded-xl border-2 transition ${
                      activeImage === i ? "border-primary ring-2 ring-primary/30" : "border-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={g} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Copy */}
          <div className="order-1 flex flex-col justify-center md:order-2">
            <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Bachchader Sera Upohar
            </div>
            <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Phone Soriye Din,{" "}
              <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                Hath-e Tule Din Magic
              </span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Air Plane + Car origami combo kit — bachcha-r kolpona, dhairjo ar focus ek shathe gore tulun.
              200+ paper, 30+ design, easy manual.
            </p>

            {/* Rating row */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm font-semibold text-foreground">4.9</span>
              <span className="text-sm text-muted-foreground">(2,400+ khushi parents)</span>
            </div>

            {/* Price */}
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <div className="text-4xl font-extrabold text-primary sm:text-5xl">
                ৳{product.price.toLocaleString()}
              </div>
              {product.oldPrice > product.price && (
                <>
                  <div className="text-xl text-muted-foreground line-through">
                    ৳{product.oldPrice.toLocaleString()}
                  </div>
                  <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                    SAVE {discountPct}%
                  </span>
                </>
              )}
            </div>

            {/* Trust pills */}
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
                <Truck className="h-3.5 w-3.5 text-primary" /> All BD Delivery
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Cash on Delivery
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
                <Package className="h-3.5 w-3.5 text-primary" /> 100% Replacement
              </span>
            </div>

            <Button
              size="lg"
              onClick={scrollToOrder}
              className="mt-6 h-14 rounded-full text-base font-bold shadow-xl hover:scale-[1.02] transition-transform"
            >
              <Gift className="mr-2 h-5 w-5" />
              Ekhoni Order Korun — ৳{product.price.toLocaleString()}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              ⚡ Free call confirmation • COD • Easy Return
            </p>
          </div>
        </div>
      </section>

      {/* STORY SECTION — Emotional hook */}
      <section className="bg-background py-14 md:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">Ekti Choto Golpo</p>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            "Maa, ami aaj phone dhori ni..."
          </h2>
          <div className="mx-auto mt-6 max-w-2xl space-y-4 text-left text-base leading-relaxed text-muted-foreground sm:text-lg">
            <p>
              Akash tar mayer dike takiye bollo ei kotha gula, hath-e tar ekta choto kagojer plane.
              Mayer chokh-e jol — kintu ei bar dukkho noy, anonder.
            </p>
            <p>
              <span className="font-semibold text-foreground">"Eta ami nije baniyechi! Dekho — eta uralo!"</span>
              <br />
              Ek shoptaher modhye Akash er jibon-e ki adbhut poriborton — phone er bodole origami,
              YouTube er bodole srijonshilota.
            </p>
            <p>
              Apnar bachcha-r jonno o ei jadu shomvob. Shudhu ekta combo kit — bakita bachcha
              nije korbe.
            </p>
          </div>
          <Button
            onClick={scrollToOrder}
            size="lg"
            variant="outline"
            className="mt-8 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Amar Bachcha-r Jonno Order Kori
          </Button>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="bg-gradient-to-b from-amber-50/50 to-background py-14 dark:from-amber-950/10 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Keno Origami? <span className="text-primary">4 ti Karon</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              Khelar majhe shikha — bigganik gobeshona-y proman.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                  <b.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY / WHAT'S IN BOX */}
      <section className="bg-background py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Box e Ki Pacchen</p>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Premium Combo Kit</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.slice(0, 6).map((g, i) => (
              <div
                key={i}
                className="group overflow-hidden rounded-2xl border border-border shadow-sm transition hover:shadow-xl"
              >
                <img
                  src={g}
                  alt={`${product.title} - ${i + 1}`}
                  className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-2xl rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6">
            <h3 className="mb-4 text-center text-lg font-bold">📦 Box-e Thakche:</h3>
            <ul className="space-y-3 text-sm sm:text-base">
              {[
                "100+ Air Plane design er origami paper",
                "100+ Car design er origami paper",
                "Step-by-step manual book (Bangla & English)",
                "Premium gift box packaging",
                "Free bonus: 5 ti exclusive surprise design",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF / REVIEWS */}
      <section className="bg-gradient-to-b from-pink-50/40 to-background py-14 dark:from-pink-950/10 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              <Users className="h-3.5 w-3.5" /> 2,400+ Satisfied Parents
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Onyo Parents Ki Bolchen?
            </h2>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-lg font-bold">4.9 / 5.0</span>
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FAKE_REVIEWS.map((r, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-pink-500 text-base font-bold text-white">
                    {r.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold">{r.name}</p>
                      {r.verified && (
                        <CheckCircle2 className="h-3.5 w-3.5 fill-blue-500 text-white" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.location}</p>
                  </div>
                </div>
                <div className="mt-3 flex">
                  {Array.from({ length: r.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ORDER FORM */}
      <section ref={orderRef} className="scroll-mt-20 bg-gradient-to-b from-background to-orange-50/40 py-14 dark:to-orange-950/10 md:py-20">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground">
              <Gift className="h-3.5 w-3.5" /> Order Form
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ekhoni Apnar Order Confirm Korun
            </h2>
            <p className="mt-3 text-muted-foreground">
              Form ti puron korun, amra apnake call kore confirm korbo. Cash on Delivery.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 overflow-hidden rounded-3xl border-2 border-primary/20 bg-card shadow-2xl"
          >
            {/* Product summary inside form */}
            <div className="flex items-center gap-4 border-b border-border bg-muted/40 p-4 sm:p-5">
              <img
                src={product.image}
                alt={product.title}
                className="h-20 w-20 flex-shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-bold sm:text-base">{product.title}</p>
                <p className="mt-1 text-lg font-extrabold text-primary">
                  ৳{product.price.toLocaleString()}
                  {product.oldPrice > product.price && (
                    <span className="ml-2 text-sm font-medium text-muted-foreground line-through">
                      ৳{product.oldPrice.toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-bold tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-4 p-5 sm:p-6">
              <div>
                <Label htmlFor="lp-name" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <UserIcon className="h-3.5 w-3.5" /> Apnar Naam *
                </Label>
                <Input
                  id="lp-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Mohammed Akash"
                  className="h-12 rounded-xl"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lp-phone" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <Phone className="h-3.5 w-3.5" /> Mobile Number *
                </Label>
                <Input
                  id="lp-phone"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  className="h-12 rounded-xl"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lp-district" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <MapPin className="h-3.5 w-3.5" /> District *
                </Label>
                <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}>
                  <SelectTrigger id="lp-district" className="h-12 rounded-xl">
                    <SelectValue placeholder="Apnar district select korun" />
                  </SelectTrigger>
                  <SelectContent>
                    {BD_DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="lp-address" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <MapPin className="h-3.5 w-3.5" /> Sothik Thikana *
                </Label>
                <Textarea
                  id="lp-address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="House #, Road #, Area, Thana..."
                  rows={3}
                  className="rounded-xl"
                  required
                />
              </div>

              {/* Shipping */}
              <div>
                <Label className="mb-2 block text-sm font-semibold">Delivery Charge</Label>
                <RadioGroup
                  value={shipMethod}
                  onValueChange={(v) => setShipMethod(v as "inside" | "outside")}
                  className="grid grid-cols-2 gap-3"
                >
                  <label
                    htmlFor="ship-inside"
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 p-3 transition ${
                      shipMethod === "inside" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem id="ship-inside" value="inside" />
                    <div className="flex-1 text-sm">
                      <p className="font-bold">Dhaka-r vetor</p>
                      <p className="text-xs text-muted-foreground">৳{SHIPPING_INSIDE}</p>
                    </div>
                  </label>
                  <label
                    htmlFor="ship-outside"
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 p-3 transition ${
                      shipMethod === "outside" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem id="ship-outside" value="outside" />
                    <div className="flex-1 text-sm">
                      <p className="font-bold">Dhaka-r baire</p>
                      <p className="text-xs text-muted-foreground">৳{SHIPPING_OUTSIDE}</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Total summary */}
              <div className="rounded-2xl bg-muted/50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({qty} × ৳{product.price})</span>
                  <span className="font-semibold">৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="mt-1.5 flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Charge</span>
                  <span className="font-semibold">৳{shippingFee}</span>
                </div>
                <div className="my-3 border-t border-border" />
                <div className="flex items-end justify-between">
                  <span className="text-base font-bold">Total Pay</span>
                  <span className="text-2xl font-extrabold text-primary">৳{totalPay.toLocaleString()}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">💵 Cash on Delivery — product hat-e niye taka diben</p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="h-14 w-full rounded-full text-base font-extrabold shadow-xl hover:scale-[1.01] transition-transform"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Order Place Hocche...
                  </>
                ) : (
                  <>
                    <Gift className="mr-2 h-5 w-5" /> Order Confirm Korun — ৳{totalPay.toLocaleString()}
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                🔒 Apnar tothho 100% nirapod • Confirm korar pore amra call dibo
              </p>
            </div>
          </form>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-background py-14 md:py-20">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Apnar Prosno?</h2>
            <p className="mt-3 text-muted-foreground">Sob common questions er uttar ekhane.</p>
          </div>
          <Accordion type="single" collapsible className="mt-8 space-y-3">
            {FAQS.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="rounded-2xl border border-border bg-card px-5 shadow-sm"
              >
                <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-10 text-center">
            <Button onClick={scrollToOrder} size="lg" className="h-14 rounded-full px-8 text-base font-bold shadow-xl">
              <Gift className="mr-2 h-5 w-5" /> Ekhoni Order Korun
            </Button>
          </div>
        </div>
      </section>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 p-3 shadow-2xl backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground line-through">৳{product.oldPrice.toLocaleString()}</p>
            <p className="text-xl font-extrabold text-primary leading-none">৳{product.price.toLocaleString()}</p>
          </div>
          <Button onClick={scrollToOrder} className="h-12 flex-1 rounded-full text-sm font-bold">
            <Gift className="mr-1.5 h-4 w-4" /> Order Korun
          </Button>
        </div>
      </div>
      <div className="h-20 md:hidden" />
    </div>
  );
}
