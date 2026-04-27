import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { useProducts } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
import { BD_DISTRICTS } from "@/lib/bd-locations";
import { validateCoupon, type Coupon } from "@/lib/coupons";
import { getOrderAttributionPayload } from "@/lib/session-tracking";
import { fbTrack, META_CURRENCY } from "@/lib/meta-pixel";
import { clarityEvent, clarityTag, clarityUpgrade } from "@/lib/clarity";
import { toast } from "sonner";
import {
  Truck,
  ShieldCheck,
  Loader2,
  Lock,
  CheckCircle2,
  Phone,
  MapPin,
  User as UserIcon,
  Wallet,
  Gift,
  ChevronLeft,
  Minus,
  Plus,
  Trash2,
  Tag,
} from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — HobbyShop" },
      { name: "description", content: "Fast, secure one-page checkout. Cash on delivery available." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { items, total, clear, add, setQty, remove } = useCart();
  const { data: allProducts = [] } = useProducts();
  const navigate = useNavigate();
  const [bump] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shipMethod, setShipMethod] = useState<"inside" | "outside">("inside");
  const [payMethod, setPayMethod] = useState<"cod" | "bkash">("cod");
  const [payNumber, setPayNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", district: "" });

  // Meta Pixel: InitiateCheckout (fires once on mount when cart has items)
  useEffect(() => {
    if (items.length === 0) return;
    fbTrack("InitiateCheckout", {
      content_ids: items.map((i) => i.product.id),
      contents: items.map((i) => ({
        id: i.product.id,
        quantity: i.qty,
        item_price: i.product.price,
      })),
      num_items: items.reduce((s, i) => s + i.qty, 0),
      value: total,
      currency: META_CURRENCY,
    });
    // Clarity: high-intent — upgrade and tag the session for funnel filtering.
    clarityEvent("initiate_checkout");
    clarityTag("reached_checkout", "true");
    clarityTag("checkout_value_bdt", String(Math.round(total)));
    clarityUpgrade("initiate_checkout");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill from default address if logged in
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", session.user.id)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();
              if (data) {
        setForm({
          name: data.full_name,
          phone: data.phone,
          address: data.address_line,
          city: data.city,
          district: data.district,
        });
        setShipMethod(data.district === "Dhaka" ? "inside" : "outside");
      }
    })();
  }, []);

  const bumpItem = allProducts[1] ?? allProducts[0];
  const bumpPrice = 199;
  const shippingFee = shipMethod === "inside" ? 60 : 130;
  const subtotalWithBump = total + (bump ? bumpPrice : 0);
  const couponDiscount = appliedCoupon
    ? appliedCoupon.type === "percentage"
      ? Math.min(
          Math.round((subtotalWithBump * Number(appliedCoupon.value)) / 100),
          appliedCoupon.max_discount ? Number(appliedCoupon.max_discount) : Infinity,
        )
      : Math.min(Number(appliedCoupon.value), subtotalWithBump)
    : 0;
  const grand = Math.max(0, subtotalWithBump + shippingFee - couponDiscount);

  const applyCoupon = async () => {
    if (validatingCoupon) return;
    setValidatingCoupon(true);
    const productIds = items.map((i) => i.product.id);
    const result = await validateCoupon(coupon, subtotalWithBump, productIds);
    setValidatingCoupon(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setAppliedCoupon(result.coupon);
    toast.success(`Coupon ${result.coupon.code} applied — ৳${result.discount} off!`);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCoupon("");
  };

  // Normalize BD phone: strip spaces/dashes/+88 prefix, then validate.
  const normalizePhone = (raw: string): string => {
    let p = (raw || "").replace(/[\s\-()]/g, "");
    if (p.startsWith("+88")) p = p.slice(3);
    else if (p.startsWith("88") && p.length === 13) p = p.slice(2);
    return p;
  };
  const normalizedPhone = normalizePhone(form.phone);
  const phoneValid = /^01[3-9]\d{8}$/.test(normalizedPhone);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    // ---- Pre-flight validation ----
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    const trimmedName = form.name.trim();
    const trimmedAddress = form.address.trim();
    if (!trimmedName || !form.phone || !trimmedAddress) {
      toast.error("Please fill in name, phone and address.");
      return;
    }
    if (!phoneValid) {
      toast.error("Please enter a valid Bangladeshi phone number (e.g. 01712345678).");
      return;
    }
    if (!form.district) {
      toast.error("Please select your district.");
      return;
    }

    setSubmitting(true);
    let createdOrderId: string | null = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isGuest = !session;

      const allItems = bump ? [...items, { product: bumpItem, qty: 1 }] : items;
      // Guard: every item must have a valid product id and price.
      const invalidItem = allItems.find(
        (i) => !i?.product?.id || typeof i.product.price !== "number" || i.qty < 1,
      );
      if (invalidItem) {
        toast.error("One of the items in your cart is invalid. Please refresh and try again.");
        setSubmitting(false);
        return;
      }

      const subtotal = allItems.reduce((s, i) => s + i.product.price * i.qty, 0);
      // Recompute discount against the actual subtotal to avoid drift vs the
      // validate_order_totals DB trigger (tolerance is 1 unit).
      const finalDiscount = appliedCoupon
        ? appliedCoupon.type === "percentage"
          ? Math.min(
              Math.round((subtotal * Number(appliedCoupon.value)) / 100),
              appliedCoupon.max_discount ? Number(appliedCoupon.max_discount) : Infinity,
            )
          : Math.min(Number(appliedCoupon.value), subtotal)
        : 0;
      const orderTotal = Math.max(0, subtotal + shippingFee - finalDiscount);

      const attribution = getOrderAttributionPayload();
      const baseOrder = {
        status: "new" as const,
        subtotal,
        shipping_fee: shippingFee,
        discount_amount: finalDiscount,
        coupon_code: appliedCoupon?.code ?? null,
        total: orderTotal,
        payment_method: payMethod,
        shipping_name: trimmedName,
        shipping_phone: normalizedPhone,
        shipping_address: trimmedAddress,
        shipping_city: form.city.trim() || form.district,
        shipping_district: form.district,
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
        : {
            ...baseOrder,
            user_id: session!.user.id,
          };

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert(orderInsert)
        .select("id")
        .single();

      if (orderErr || !order) {
        console.error("Order insert failed:", orderErr, "payload:", orderInsert);
        toast.error(
          orderErr?.message
            ? `Could not place order: ${orderErr.message}`
            : "Could not place order. Please check your connection and try again.",
        );
        setSubmitting(false);
        return;
      }
      createdOrderId = order.id;

      const orderItemsPayload = allItems.map((i) => ({
        order_id: order.id,
        user_id: isGuest ? null : session!.user.id,
        product_id: i.product.id,
        name: i.product.title,
        image: i.product.image,
        price: i.product.price,
        quantity: i.qty,
        variant_id: i.variantId ?? null,
        variant_label: i.variantLabel ?? null,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(orderItemsPayload);
      if (itemsErr) {
        console.error("Order items insert failed:", itemsErr, "payload:", orderItemsPayload);
        // Clean up the orphaned order row so the user can retry cleanly.
        // Guest rows can't be deleted by the user under RLS — that's OK; the
        // order will simply remain empty and admins can purge it.
        if (!isGuest) {
          await supabase.from("orders").delete().eq("id", order.id);
        }
        toast.error(`Could not save your items: ${itemsErr.message}. Please try again.`);
        setSubmitting(false);
        return;
      }

      if (!isGuest && appliedCoupon && finalDiscount > 0) {
        // Best-effort — failure here should not block the order.
        const { error: couponErr } = await supabase.from("coupon_usage").insert({
          coupon_id: appliedCoupon.id,
          user_id: session!.user.id,
          order_id: order.id,
          discount_amount: finalDiscount,
        });
        if (couponErr) console.warn("Coupon usage log failed (non-fatal):", couponErr);
      }

      // Fire Telegram notification immediately (don't await — pg_net trigger is too slow)
      void supabase.functions
        .invoke("notify-order-telegram", { body: { order_id: order.id } })
        .catch((e) => console.warn("Telegram notify failed (non-fatal):", e));

      clear();
      toast.success("Order placed! We'll call you to confirm soon.");
      navigate({ to: "/order-success/$orderId", params: { orderId: order.id } });
    } catch (err: any) {
      console.error("Checkout exception:", err, "createdOrderId:", createdOrderId);
      toast.error(
        err?.message
          ? `Order failed: ${err.message}`
          : "Something went wrong. Please check your internet and try again.",
      );
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Wallet className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add something you love to get started.</p>
        <Link to="/shop" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 pb-32 md:pb-0">
      {/* Progress / trust bar */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/shop" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Continue Shopping
          </Link>
          <div className="hidden items-center gap-2 text-xs font-bold sm:flex">
            <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="h-4 w-4" /> Cart</span>
            <span className="h-px w-6 bg-border" />
            <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="h-4 w-4" /> Checkout</span>
            <span className="h-px w-6 bg-border" />
            <span className="inline-flex items-center gap-1 text-muted-foreground">3. Confirm</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
            <Lock className="h-3 w-3" /> Secure
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-4 px-3 py-4 md:grid-cols-[1fr_380px] md:gap-6 md:px-4 md:py-8">
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl">Checkout</h1>
            <p className="text-xs text-muted-foreground">Fill in your details — we'll handle the rest.</p>
          </div>

          {/* Delivery info */}
          <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-extrabold text-primary-foreground">1</span>
              <h2 className="text-sm font-bold">Delivery Information</h2>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Full Name *</label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Your name"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Phone Number *</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={`h-11 w-full rounded-lg border bg-background pl-9 pr-9 text-sm outline-none transition focus:ring-2 ${
                    form.phone && !phoneValid
                      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                      : "border-border focus:border-primary focus:ring-primary/20"
                  }`}
                  placeholder="01XXXXXXXXX"
                />
                {form.phone && phoneValid && (
                  <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                )}
              </div>
              {form.phone && !phoneValid && (
                <p className="mt-1 text-[11px] text-destructive">Enter a valid 11-digit BD number</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">District *</label>
                <select
                  value={form.district}
                  onChange={(e) => {
                    const district = e.target.value;
                    setForm({ ...form, district, city: "" });
                    if (district) setShipMethod(district === "Dhaka" ? "inside" : "outside");
                  }}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select District</option>
                  {BD_DISTRICTS.map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">City / Thana *</label>
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  disabled={!form.district}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                >
                  <option value="">Select City</option>
                  {(BD_DISTRICTS.find((d) => d.name === form.district)?.cities ?? []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Full Address *</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="House, Road, Area"
                />
              </div>
            </div>
          </section>

          {/* Shipping method */}
          <section className="space-y-2.5 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-extrabold text-primary-foreground">2</span>
              <h2 className="text-sm font-bold">Shipping Method</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "inside", label: "Inside Dhaka", time: "1-2 days", fee: 60 },
                { id: "outside", label: "Outside Dhaka", time: "2-4 days", fee: 130 },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setShipMethod(opt.id as "inside" | "outside")}
                  className={`rounded-lg border p-2.5 text-left transition ${
                    shipMethod === opt.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold">{opt.label}</p>
                    {shipMethod === opt.id && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{opt.time}</p>
                  <p className="mt-0.5 text-sm font-extrabold text-primary">৳{opt.fee}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Payment */}
          <section className="space-y-2.5 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-extrabold text-primary-foreground">3</span>
              <h2 className="text-sm font-bold">Payment Method</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "cod", label: "Cash on Delivery", sub: "Pay on receive", color: "oklch(0.585 0.245 27.5)", badge: "POPULAR" },
                { id: "bkash", label: "bKash", sub: "Send Money", color: "oklch(0.55 0.22 0)" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPayMethod(opt.id as typeof payMethod)}
                  className={`relative rounded-lg border p-2.5 text-left transition ${
                    payMethod === opt.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  {opt.badge && (
                    <span className="absolute -right-1 -top-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-extrabold text-primary-foreground">
                      {opt.badge}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-extrabold text-white"
                      style={{ backgroundColor: opt.color }}
                    >
                      {opt.label[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{opt.label}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{opt.sub}</p>
                    </div>
                    {payMethod === opt.id && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </div>
                </button>
              ))}
            </div>

            {payMethod !== "cod" && (
              <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                <p className="text-[11px] leading-relaxed">
                  Send <span className="font-extrabold text-primary">৳{grand}</span> to{" "}
                  <span className="font-mono font-bold">01700-000000</span> (bKash Personal), then enter details below.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={payNumber}
                    onChange={(e) => setPayNumber(e.target.value)}
                    placeholder="Your Number"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                  />
                  <input
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    placeholder="Transaction ID"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="hidden w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-extrabold text-primary-foreground shadow-[var(--shadow-card)] transition hover:opacity-90 disabled:opacity-60 md:flex"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Lock className="h-4 w-4" /> Place Order — ৳{grand}
              </>
            )}
          </button>
        </form>

        {/* Summary */}
        <aside className="space-y-3 md:sticky md:top-6 md:self-start">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold">Order Summary ({items.length})</h2>
            <ul className="space-y-2.5">
              {items.map(({ product, qty }) => (
                <li key={product.id} className="flex gap-2.5">
                  <div className="relative">
                    <img src={product.image} alt="" className="h-14 w-14 rounded-md object-cover" />
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-extrabold text-background">
                      {qty}
                    </span>
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="line-clamp-2 font-semibold leading-snug">{product.title}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => (qty > 1 ? setQty(product.id, qty - 1) : remove(product.id))}
                        className="inline-flex h-5 w-5 items-center justify-center rounded border border-border hover:bg-muted"
                        aria-label="Decrease"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="w-5 text-center text-[11px] font-bold">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(product.id, qty + 1)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded border border-border hover:bg-muted"
                        aria-label="Increase"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(product.id)}
                        className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-bold">৳{product.price * qty}</p>
                </li>
              ))}
            </ul>

            {/* Coupon */}
            <div className="mt-3 border-t border-border pt-3">
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-bold text-primary">
                    <Tag className="h-3 w-3" /> {appliedCoupon.code} applied
                  </span>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="font-semibold text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Tag className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="Coupon code"
                      className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-2 text-[11px] outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={validatingCoupon}
                    className="rounded-md bg-foreground px-3 text-[11px] font-bold text-background hover:opacity-90 disabled:opacity-60"
                  >
                    {validatingCoupon ? "..." : "Apply"}
                  </button>
                </div>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">Have a code? Apply it above.</p>
            </div>

            <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>৳{total}</span></div>
              {bump && <div className="flex justify-between"><span className="text-muted-foreground">Bonus item</span><span>৳{bumpPrice}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>৳{shippingFee}</span></div>
              {appliedCoupon && couponDiscount > 0 && (
                <div className="flex justify-between text-primary"><span>Discount ({appliedCoupon.code})</span><span>-৳{couponDiscount}</span></div>
              )}
              <div className="mt-1 flex justify-between border-t border-border pt-2 text-sm font-extrabold"><span>Total</span><span className="text-primary">৳{grand}</span></div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-4 gap-1.5 text-[10px] md:grid-cols-2 md:gap-2 md:text-xs">
            <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-2 md:flex-row md:p-2.5"><Truck className="h-3.5 w-3.5 shrink-0 text-primary" /> <span className="text-center font-semibold">Fast Delivery</span></div>
            <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-2 md:flex-row md:p-2.5"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" /> <span className="text-center font-semibold">Easy Return</span></div>
            <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-2 md:flex-row md:p-2.5"><Lock className="h-3.5 w-3.5 shrink-0 text-primary" /> <span className="text-center font-semibold">Secure Order</span></div>
            <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-2 md:flex-row md:p-2.5"><Gift className="h-3.5 w-3.5 shrink-0 text-primary" /> <span className="text-center font-semibold">100% Genuine</span></div>
          </div>
        </aside>

        {/* Sticky mobile CTA */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 shadow-2xl backdrop-blur md:hidden">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-muted-foreground">Total ({items.length} items)</span>
            <span className="font-extrabold text-primary">৳{grand}</span>
          </div>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-lg disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Lock className="h-4 w-4" /> Place Order — ৳{grand}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
