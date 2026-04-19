import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { products } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
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
  const navigate = useNavigate();
  const [bump, setBump] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shipMethod, setShipMethod] = useState<"inside" | "outside">("inside");
  const [payMethod, setPayMethod] = useState<"cod" | "bkash" | "nagad" | "rocket">("cod");
  const [payNumber, setPayNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", district: "" });

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
      }
    })();
  }, []);

  const bumpItem = products[1];
  const bumpPrice = 199;
  const shippingFee = shipMethod === "inside" ? 60 : 130;
  const couponDiscount = couponApplied ? Math.round(total * 0.05) : 0;
  const grand = total + (bump ? bumpPrice : 0) + shippingFee - couponDiscount;

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (code === "SAVE5") {
      setCouponApplied(true);
      toast.success("Coupon applied — 5% off!");
    } else {
      toast.error("Invalid coupon code");
    }
  };

  const phoneValid = /^01[3-9]\d{8}$/.test(form.phone.replace(/\s/g, ""));

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    if (!form.name || !form.phone || !form.address) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!phoneValid) {
      toast.error("Please enter a valid Bangladeshi phone number");
      return;
    }

    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const allItems = bump ? [...items, { product: bumpItem, qty: 1 }] : items;
      const subtotal = allItems.reduce((s, i) => s + i.product.price * i.qty, 0);
      const orderTotal = subtotal + shippingFee - couponDiscount;

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: session.user.id,
          status: "pending",
          subtotal,
          shipping_fee: shippingFee,
          total: orderTotal,
          payment_method: payMethod,
          shipping_name: form.name,
          shipping_phone: form.phone,
          shipping_address: form.address,
          shipping_city: form.city,
          shipping_district: form.district,
        })
        .select("id")
        .single();

      if (orderErr || !order) {
        toast.error("Could not place order. Please try again.");
        setSubmitting(false);
        return;
      }

      const orderItemsPayload = allItems.map((i) => ({
        order_id: order.id,
        user_id: session.user.id,
        product_id: i.product.id,
        name: i.product.title,
        image: i.product.image,
        price: i.product.price,
        quantity: i.qty,
      }));
      await supabase.from("order_items").insert(orderItemsPayload);

      clear();
      toast.success("Order placed successfully!");
      navigate({ to: "/order-success/$orderId", params: { orderId: order.id } });
      return;
    }

    // Guest fallback
    if (bump) add(bumpItem);
    clear();
    const tempId = `guest-${Date.now().toString(36)}`;
    toast.success("Order placed successfully!");
    navigate({ to: "/order-success/$orderId", params: { orderId: tempId } });
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
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">City</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Dhaka"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">District</label>
                <input
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Dhaka"
                />
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
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">2</span>
              <h2 className="font-bold">Shipping Method</h2>
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
                  className={`rounded-xl border-2 p-3 text-left transition ${
                    shipMethod === opt.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{opt.label}</p>
                    {shipMethod === opt.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.time}</p>
                  <p className="mt-1 text-sm font-extrabold text-primary">৳{opt.fee}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Payment */}
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">3</span>
              <h2 className="font-bold">Payment Method</h2>
            </div>
            <div className="rounded-xl border-2 border-primary bg-primary/5 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="radio" checked readOnly className="mt-1 h-4 w-4 accent-[oklch(0.585_0.245_27.5)]" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">Cash on Delivery</p>
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground">RECOMMENDED</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">Pay when you receive your order. No prepayment required.</p>
                </div>
              </label>
            </div>
          </section>

          {/* Order bump */}
          <section className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={bump}
                onChange={(e) => setBump(e.target.checked)}
                className="h-5 w-5 accent-[oklch(0.585_0.245_27.5)]"
              />
              <img src={bumpItem.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <div className="flex-1 text-sm">
                <p className="font-bold">🎁 Add a {bumpItem.title} for only ৳{bumpPrice}</p>
                <p className="text-xs text-muted-foreground">One-time offer — only at checkout.</p>
              </div>
            </label>
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
        <aside className="space-y-4 md:sticky md:top-6 md:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-bold">Order Summary ({items.length})</h2>
            <ul className="space-y-3">
              {items.map(({ product, qty }) => (
                <li key={product.id} className="flex gap-3">
                  <div className="relative">
                    <img src={product.image} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-extrabold text-background">
                      {qty}
                    </span>
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="line-clamp-2 font-semibold leading-snug">{product.title}</p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => (qty > 1 ? setQty(product.id, qty - 1) : remove(product.id))}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border hover:bg-muted"
                        aria-label="Decrease"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(product.id, qty + 1)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border hover:bg-muted"
                        aria-label="Increase"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(product.id)}
                        className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-bold">৳{product.price * qty}</p>
                </li>
              ))}
            </ul>

            {/* Coupon */}
            <div className="mt-4 border-t border-border pt-4">
              {couponApplied ? (
                <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold text-primary">
                    <Tag className="h-3.5 w-3.5" /> SAVE5 applied
                  </span>
                  <button
                    type="button"
                    onClick={() => { setCouponApplied(false); setCoupon(""); }}
                    className="font-semibold text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="Coupon code"
                      className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyCoupon}
                    className="rounded-lg bg-foreground px-4 text-xs font-bold text-background hover:opacity-90"
                  >
                    Apply
                  </button>
                </div>
              )}
              <p className="mt-1.5 text-[10px] text-muted-foreground">Try code: <span className="font-mono font-bold">SAVE5</span></p>
            </div>

            <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>৳{total}</span></div>
              {bump && <div className="flex justify-between"><span className="text-muted-foreground">Bonus item</span><span>৳{bumpPrice}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>৳{shippingFee}</span></div>
              {couponApplied && (
                <div className="flex justify-between text-primary"><span>Discount (5%)</span><span>-৳{couponDiscount}</span></div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold"><span>Total</span><span className="text-primary">৳{grand}</span></div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-3"><Truck className="h-4 w-4 shrink-0 text-primary" /> <span className="font-semibold">Fast Delivery</span></div>
            <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-3"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" /> <span className="font-semibold">Easy Return</span></div>
            <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-3"><Lock className="h-4 w-4 shrink-0 text-primary" /> <span className="font-semibold">Secure Order</span></div>
            <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-3"><Gift className="h-4 w-4 shrink-0 text-primary" /> <span className="font-semibold">100% Genuine</span></div>
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
