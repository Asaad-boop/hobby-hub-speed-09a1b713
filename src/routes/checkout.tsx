import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { useCart, cartLineKey } from "@/lib/cart";
import { useProducts } from "@/lib/products";
import { supabase, getClientSessionId } from "@/integrations/supabase/client";
import { BD_DISTRICTS } from "@/lib/bd-locations";
import { validateCoupon, type Coupon } from "@/lib/coupons";
import { getOrderAttributionPayload, getFbAttribution } from "@/lib/session-tracking";
import { placeOrder } from "@/lib/place-order.functions";
import { sendMetaCapiEvent } from "@/lib/meta-capi.functions";
import { fbTrack, META_CURRENCY } from "@/lib/meta-pixel";
import { clarityEvent, clarityTag, clarityUpgrade } from "@/lib/clarity";
import { trackBeginCheckout, trackPurchase } from "@/lib/analytics-events";
import { toast } from "sonner";
import { cdnImage, handleImgError } from "@/lib/cdn-image";
import { computeBundleDiscount } from "@/lib/product-tiers";
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
  const { items, total, clear, add, setQty, remove, setOpen } = useCart();
  const { data: allProducts = [] } = useProducts();
  const navigate = useNavigate();
  const placeOrderFn = useServerFn(placeOrder);
  const capiFn = useServerFn(sendMetaCapiEvent);
  const [bump, setBump] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitGuardRef = useRef(false);
  const redirectingRef = useRef(false);
  const clientOrderIdRef = useRef<string | null>(null);
  const [shipMethod, setShipMethod] = useState<"inside" | "outside">("inside");
  const [payMethod, setPayMethod] = useState<"cod" | "bkash">("cod");
  const [payNumber, setPayNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", district: "" });

  useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  // Meta Pixel: InitiateCheckout (fires once on mount when cart has items)
  useEffect(() => {
    if (items.length === 0) return;
    const eventId = fbTrack("InitiateCheckout", {
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
    // Mirror to CAPI for server-side dedup (best-effort, never blocks).
    if (eventId) {
      const fb = getFbAttribution();
      capiFn({
        data: {
          eventName: "InitiateCheckout",
          eventId,
          eventSourceUrl: typeof window !== "undefined" ? window.location.href : null,
          userData: {
            fbclid: fb?.fbclid ?? null,
            client_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          },
          customData: {
            value: total,
            currency: META_CURRENCY,
            content_ids: items.map((i) => i.product.id),
            num_items: items.reduce((s, i) => s + i.qty, 0),
          },
        },
      }).catch(() => {});
    }
    // Clarity: high-intent — upgrade and tag the session for funnel filtering.
    clarityEvent("initiate_checkout");
    clarityTag("reached_checkout", "true");
    clarityTag("checkout_value_bdt", String(Math.round(total)));
    clarityUpgrade("initiate_checkout");
    // GA4-style begin_checkout for source -> conversion reporting.
    trackBeginCheckout({
      value: total,
      items: items.map((i) => ({
        item_id: i.product.id,
        item_name: i.product.title,
        price: i.product.price,
        quantity: i.qty,
        variant: i.variantLabel ?? null,
      })),
    });
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

  // Persist partial checkout info as an "abandoned cart" so admins can
  // recover incomplete orders. Debounced — only fires when the customer has
  // typed at least a name or phone.
  const [abandonedId, setAbandonedId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (items.length === 0) return;
    const hasInfo = form.name.trim() || form.phone.trim() || form.address.trim();
    if (!hasInfo) return;

    const timer = setTimeout(async () => {
      try {
        const sid = getClientSessionId();
        const cartItems = items.map((i) => ({
          product_id: i.product.id,
          name: i.product.title,
          image: i.product.image,
          price: i.product.price,
          qty: i.qty,
          variant_id: i.variantId ?? null,
          variant_label: i.variantLabel ?? null,
        }));
        const { data, error } = await supabase.rpc("upsert_abandoned_cart", {
          _id: abandonedId,
          _session_id: sid,
          _customer_name: form.name.trim() || null,
          _customer_phone: form.phone.trim() || null,
          _customer_email: null,
          _shipping_address: form.address.trim() || null,
          _shipping_city: form.city.trim() || null,
          _shipping_district: form.district || null,
          _shipping_thana: null,
          _subtotal: total,
          _cart_items: cartItems,
          _last_step: "checkout",
        } as never);
        if (!error && data && !abandonedId) setAbandonedId(data as string);
      } catch {
        // best-effort — never block checkout
      }
    }, 1200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, form.phone, form.address, form.city, form.district, items, total]);

  const BUMP_SLUG = "compressed-travel-towel-disposable-face-towel";
  const bumpItem = allProducts.find((p) => p.slug === BUMP_SLUG) ?? null;
  const bumpPrice = bumpItem?.price ?? 199;
  const bumpAlreadyInCart = bumpItem ? items.some((i) => i.product.id === bumpItem.id) : false;
  const showBump = !!bumpItem && !bumpAlreadyInCart;
  const bumpActive = showBump && bump;
  const defaultShippingFee = shipMethod === "inside" ? 60 : 130;
  const perItemFees = items.map((i) => {
    const override = shipMethod === "inside" ? i.product.shippingFeeInside : i.product.shippingFeeOutside;
    return typeof override === "number" && !Number.isNaN(override) ? override : defaultShippingFee;
  });
  const shippingFee = perItemFees.length ? Math.max(...perItemFees) : defaultShippingFee;
  const subtotalWithBump = total + (bumpActive ? bumpPrice : 0);
  // Auto bundle discount: 2 of the same line = 10% off, 3+ of the same line = 15% off.
  // Computed per cart line so it shows up as a real "Discount" in billing & saves to the order.
  const bundleDiscount = items.reduce((sum, i) => {
    const pct = i.qty >= 3 ? 15 : i.qty === 2 ? 10 : 0;
    if (!pct) return sum;
    return sum + Math.round(i.product.price * i.qty * (pct / 100));
  }, 0);
  const couponDiscount = appliedCoupon
    ? appliedCoupon.type === "percentage"
      ? Math.min(
          Math.round((subtotalWithBump * Number(appliedCoupon.value)) / 100),
          appliedCoupon.max_discount ? Number(appliedCoupon.max_discount) : Infinity,
        )
      : Math.min(Number(appliedCoupon.value), subtotalWithBump)
    : 0;
  const totalDiscount = bundleDiscount + couponDiscount;
  const grand = Math.max(0, subtotalWithBump + shippingFee - totalDiscount);

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

  const getClientOrderId = () => {
    if (!clientOrderIdRef.current) {
      clientOrderIdRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === "x" ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });
    }
    return clientOrderIdRef.current;
  };

  const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const shouldRetryOrder = (message?: string) => /network|fetch|timeout|failed to fetch|load failed/i.test(message ?? "");

  const goToOrderSuccess = async (orderId: string) => {
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    const successPath = `/order-success/${encodeURIComponent(orderId)}`;
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("hh_last_confirmed_order_id", orderId);
        window.localStorage.removeItem("hh_cart_v1");
      } catch {
        // ignore storage failures — navigation is the priority
      }
    }

    clear();

    try {
      await navigate({ to: "/order-success/$orderId", params: { orderId }, replace: true });
    } catch (navErr) {
      console.error("Order success navigation failed:", navErr);
    }

    // Fallback for any router/navigation interruption. Preserve Lovable preview
    // token query if present so the success route can still open in preview.
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        if (window.location.pathname !== successPath) {
          const previewSearch = window.location.search.includes("__lovable_token")
            ? window.location.search
            : "";
          window.location.assign(`${successPath}${previewSearch}`);
        }
      }, 150);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitGuardRef.current) return;
    submitGuardRef.current = true;
    setSubmitting(true);
    setOpen(false);

    const releaseSubmit = () => {
      submitGuardRef.current = false;
      setSubmitting(false);
    };

    // ---- Pre-flight validation ----
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      releaseSubmit();
      return;
    }
    const trimmedName = form.name.trim();
    const trimmedAddress = form.address.trim();
    if (!trimmedName || !form.phone || !trimmedAddress) {
      toast.error("Please fill in name, phone and address.");
      releaseSubmit();
      return;
    }
    if (!phoneValid) {
      toast.error("Please enter a valid Bangladeshi phone number (e.g. 01712345678).");
      releaseSubmit();
      return;
    }
    const deliveryDistrict = form.district || (shipMethod === "inside" ? "Dhaka" : "Outside Dhaka");
    const deliveryCity = form.city.trim() || deliveryDistrict;

    let createdOrderId: string | null = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isGuest = !session;

      const allItems = bumpActive && bumpItem ? [...items, { product: bumpItem, qty: 1, variantId: null, variantLabel: null }] : items;
      // Guard: every item must have a valid product id and price.
      const invalidItem = allItems.find(
        (i) => !i?.product?.id || typeof i.product.price !== "number" || i.qty < 1,
      );
      if (invalidItem) {
        toast.error("One of the items in your cart is invalid. Please refresh and try again.");
        releaseSubmit();
        return;
      }

      const subtotal = allItems.reduce((s, i) => s + i.product.price * i.qty, 0);
      // Recompute discount against the actual subtotal to avoid drift vs the
      // validate_order_totals DB trigger (tolerance is 1 unit).
      const finalCouponDiscount = appliedCoupon
        ? appliedCoupon.type === "percentage"
          ? Math.min(
              Math.round((subtotal * Number(appliedCoupon.value)) / 100),
              appliedCoupon.max_discount ? Number(appliedCoupon.max_discount) : Infinity,
            )
          : Math.min(Number(appliedCoupon.value), subtotal)
        : 0;
      // Auto bundle discount per line (qty >= 3 → 15%, qty === 2 → 10%).
      const finalBundleDiscount = allItems.reduce((sum, i) => {
        const pct = i.qty >= 3 ? 15 : i.qty === 2 ? 10 : 0;
        if (!pct) return sum;
        return sum + Math.round(i.product.price * i.qty * (pct / 100));
      }, 0);
      const finalDiscount = finalCouponDiscount + finalBundleDiscount;
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
        shipping_city: deliveryCity,
        shipping_district: deliveryDistrict,
        ...attribution,
      };
      const orderInsert = isGuest
        ? {
            ...baseOrder,
            id: getClientOrderId(),
            brand_id: "1f1f366d-ad85-4513-85ab-2dbb6b23c513",
            user_id: null,
            is_guest_order: true,
            guest_name: trimmedName,
            guest_phone: normalizedPhone,
          }
        : {
            ...baseOrder,
            id: getClientOrderId(),
            brand_id: "1f1f366d-ad85-4513-85ab-2dbb6b23c513",
            user_id: session!.user.id,
          };

      const orderItemsPayload = allItems.map((i) => ({
        user_id: isGuest ? null : session!.user.id,
        product_id: i.product.id,
        name: i.product.title,
        image: i.product.image,
        price: i.product.price,
        unit_price: i.product.price,
        line_total: i.product.price * i.qty,
        quantity: i.qty,
        variant_id: i.variantId ?? null,
        variant_label: i.variantLabel ?? null,
      }));

      let placeRes = await placeOrderFn({
        data: { order: orderInsert, items: orderItemsPayload },
      }).catch((e: unknown) => ({
        ok: false as const,
        error: e instanceof Error ? e.message : "Network error",
      }));

      if (!placeRes.ok && shouldRetryOrder(placeRes.error)) {
        await wait(700);
        placeRes = await placeOrderFn({
          data: { order: orderInsert, items: orderItemsPayload },
        }).catch((e: unknown) => ({
          ok: false as const,
          error: e instanceof Error ? e.message : "Network error",
        }));
      }

      if (!placeRes.ok) {
        console.error("Order error:", placeRes.error, "payload:", orderInsert);
        toast.error(
          placeRes.error
            ? `Could not place order: ${placeRes.error}`
            : "Could not place order. Please check your connection and try again.",
        );
        releaseSubmit();
        return;
      }
      const order = { id: placeRes.orderId };
      createdOrderId = order.id;
      clientOrderIdRef.current = null;

      if (!isGuest && appliedCoupon && finalCouponDiscount > 0) {
        // Best-effort — failure here should not block the order.
        const { error: couponErr } = await supabase.from("coupon_usage").insert({
          coupon_id: appliedCoupon.id,
          user_id: session!.user.id,
          order_id: order.id,
          discount_amount: finalCouponDiscount,
        });
        if (couponErr) console.warn("Coupon usage log failed (non-fatal):", couponErr);
      }

      // Telegram notification is sent automatically by the DB trigger (notify_telegram_on_new_order)

      // Mark the abandoned cart as converted (fire-and-forget — must not block navigation).
      if (abandonedId) {
        void supabase.rpc("mark_abandoned_cart_converted", {
          _id: abandonedId,
          _order_id: order.id,
        } as never).then(({ error }) => {
          if (error) console.warn("Abandoned cart mark failed (non-fatal):", error);
        });
      }

      // Meta Pixel Purchase — fire HERE (we have full cart data and the
      // order is confirmed). The order-success page also tries to fire it as
      // a fallback, but it depends on a server fetch that can fail, leaving
      // Meta with no Purchase event. We dedupe via sessionStorage so
      // order-success skips when this one already fired.
      try {
        const purchaseItems = [
          ...items.map((i) => ({
            id: i.product.id,
            quantity: i.qty,
            item_price: i.product.price,
            name: i.product.title,
          })),
          ...(bumpActive && bumpItem
            ? [{ id: bumpItem.id, quantity: 1, item_price: bumpPrice, name: bumpItem.title }]
            : []),
        ];
        const eventId = fbTrack("Purchase", {
          content_ids: purchaseItems.map((p) => p.id),
          contents: purchaseItems.map((p) => ({ id: p.id, quantity: p.quantity, item_price: p.item_price })),
          num_items: purchaseItems.reduce((s, p) => s + p.quantity, 0),
          value: grand,
          currency: META_CURRENCY,
          content_type: "product",
          order_id: order.id,
        });
        if (eventId && typeof window !== "undefined") {
          sessionStorage.setItem(`fb_purchase_fired_${order.id}`, "1");
        }
        // Meta CAPI Purchase — server-side mirror, deduped by eventId.
        if (eventId) {
          const fb = getFbAttribution();
          capiFn({
            data: {
              eventName: "Purchase",
              eventId,
              eventSourceUrl: typeof window !== "undefined" ? window.location.href : null,
              userData: {
                phone: normalizedPhone,
                fbclid: fb?.fbclid ?? null,
                client_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
              },
              customData: {
                value: grand,
                currency: META_CURRENCY,
                order_id: order.id,
                content_ids: purchaseItems.map((p) => p.id),
                content_type: "product",
                num_items: purchaseItems.reduce((s, p) => s + p.quantity, 0),
              },
            },
          }).catch(() => {});
        }
        trackPurchase({
          order_id: order.id,
          value: grand,
          shipping: shippingFee,
          coupon: appliedCoupon?.code ?? null,
          items: purchaseItems.map((p) => ({
            item_id: p.id,
            item_name: p.name,
            price: p.item_price,
            quantity: p.quantity,
            variant: null,
          })),
        });
      } catch (e) {
        console.warn("Purchase pixel fire failed (non-fatal):", e);
      }

      toast.success("Order placed! We'll call you to confirm soon.");
      await goToOrderSuccess(order.id);
    } catch (err: any) {
      console.error("Order error:", err, "createdOrderId:", createdOrderId);
      // Order was actually created — send the user to the thank-you page anyway.
      if (createdOrderId) {
        await goToOrderSuccess(createdOrderId);
        return;
      }
      toast.error(
        err?.message
          ? `Order failed: ${err.message}`
          : "Something went wrong. Please check your internet and try again.",
      );
      releaseSubmit();
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
              {([
                { id: "inside" as const, label: "Inside Dhaka", time: "1-2 days", defaultFee: 60 },
                { id: "outside" as const, label: "Outside Dhaka", time: "2-4 days", defaultFee: 130 },
              ]).map((opt) => {
                const fees = items.map((i) => {
                  const ov = opt.id === "inside" ? i.product.shippingFeeInside : i.product.shippingFeeOutside;
                  return typeof ov === "number" && !Number.isNaN(ov) ? ov : opt.defaultFee;
                });
                const fee = fees.length ? Math.max(...fees) : opt.defaultFee;
                return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setShipMethod(opt.id)}
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
                  <p className="mt-0.5 text-sm font-extrabold text-primary">৳{fee}</p>
                </button>
                );
              })}
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
              {items.map((item) => {
                const { product, qty, variantLabel } = item;
                const key = cartLineKey(item);
                return (
                <li key={key} className="flex gap-2.5">
                  <div className="relative">
                    <img src={cdnImage(product.image, 200)} alt="" loading="lazy" decoding="async" onError={handleImgError} className="h-14 w-14 rounded-md object-cover" />
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-extrabold text-background">
                      {qty}
                    </span>
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="line-clamp-2 font-semibold leading-snug">{product.title}</p>
                    {variantLabel && <p className="text-[10px] text-muted-foreground">{variantLabel}</p>}
                    <div className="mt-1 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => (qty > 1 ? setQty(key, qty - 1) : remove(key))}
                        className="inline-flex h-5 w-5 items-center justify-center rounded border border-border hover:bg-muted"
                        aria-label="Decrease"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="w-5 text-center text-[11px] font-bold">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(key, qty + 1)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded border border-border hover:bg-muted"
                        aria-label="Increase"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(key)}
                        className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-bold">৳{product.price * qty}</p>
                </li>
                );
              })}
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

            {showBump && bumpItem && (
              <button
                type="button"
                onClick={() => setBump((v) => !v)}
                className={`flex w-full items-center gap-2.5 rounded-xl border-2 border-dashed p-2.5 text-left transition ${
                  bumpActive
                    ? "border-primary bg-primary/5"
                    : "border-amber-400 bg-amber-50 hover:border-amber-500 dark:bg-amber-950/20"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                    bumpActive ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground bg-background"
                  }`}
                >
                  {bumpActive && <CheckCircle2 className="h-4 w-4" />}
                </div>
                <img
                  src={cdnImage(bumpItem.image, 200)}
                  alt={bumpItem.title}
                  loading="lazy"
                  decoding="async"
                  onError={handleImgError}
                  className="h-12 w-12 shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    <Gift className="h-2.5 w-2.5" /> Special offer
                  </div>
                  <div className="line-clamp-2 text-[11px] font-bold leading-tight">
                    Add {bumpItem.title}
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-[13px] font-extrabold text-primary">৳{bumpPrice}</span>
                    {bumpItem.oldPrice > bumpPrice && (
                      <span className="text-[10px] text-muted-foreground line-through">৳{bumpItem.oldPrice}</span>
                    )}
                  </div>
                </div>
              </button>
            )}


            <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>৳{total}</span></div>
              {bumpActive && <div className="flex justify-between"><span className="text-muted-foreground">Bonus item</span><span>৳{bumpPrice}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>৳{shippingFee}</span></div>
              {bundleDiscount > 0 && (
                <div className="flex justify-between text-primary"><span>Bundle discount</span><span>-৳{bundleDiscount}</span></div>
              )}
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
