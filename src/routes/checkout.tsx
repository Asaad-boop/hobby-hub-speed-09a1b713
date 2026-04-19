import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { products } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Truck, ShieldCheck, Loader2 } from "lucide-react";

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
  const { items, total, clear, add } = useCart();
  const navigate = useNavigate();
  const [bump, setBump] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
  const shippingFee = 60;
  const grand = total + (bump ? bumpPrice : 0) + shippingFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const allItems = bump ? [...items, { product: bumpItem, qty: 1 }] : items;
      const subtotal = allItems.reduce((s, i) => s + i.product.price * i.qty, 0);
      const orderTotal = subtotal + shippingFee;

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: session.user.id,
          status: "pending",
          subtotal,
          shipping_fee: shippingFee,
          total: orderTotal,
          payment_method: "cod",
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

    // Guest fallback — no DB order, generate a temp ref
    if (bump) add(bumpItem);
    clear();
    const tempId = `guest-${Date.now().toString(36)}`;
    toast.success("Order placed successfully!");
    navigate({ to: "/order-success/$orderId", params: { orderId: tempId } });
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1fr_400px] md:py-12">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold">Checkout</h1>
          <p className="text-sm text-muted-foreground">Fill in your details — we'll do the rest.</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Delivery Information</h2>
          <div>
            <label className="mb-1 block text-xs font-semibold">Full Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary" placeholder="Your name" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Phone</label>
            <input required inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary" placeholder="01XXXXXXXXX" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold">City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary" placeholder="Dhaka" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">District</label>
              <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary" placeholder="Dhaka" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Full Address</label>
            <textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="House, Road, Area" />
          </div>
        </div>

        <div className="rounded-2xl border-2 border-primary bg-primary/5 p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="radio" checked readOnly className="mt-1 h-4 w-4 accent-[oklch(0.585_0.245_27.5)]" />
            <div>
              <p className="font-bold">Cash on Delivery</p>
              <p className="text-xs text-muted-foreground">Pay when you receive your order. No prepayment required.</p>
            </div>
          </label>
        </div>

        <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={bump} onChange={(e) => setBump(e.target.checked)} className="h-5 w-5 accent-[oklch(0.585_0.245_27.5)]" />
            <img src={bumpItem.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
            <div className="flex-1 text-sm">
              <p className="font-bold">🎁 Add a {bumpItem.title} for only ৳{bumpPrice}</p>
              <p className="text-xs text-muted-foreground">One-time offer — only at checkout.</p>
            </div>
          </label>
        </div>

        <button type="submit" disabled={submitting} className="hidden w-full rounded-full bg-primary py-4 text-base font-extrabold text-primary-foreground shadow-[var(--shadow-card)] transition hover:opacity-90 disabled:opacity-60 md:block">
          {submitting ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : `Place Order — ৳${grand}`}
        </button>
      </form>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-bold">Order Summary</h2>
          <ul className="space-y-3">
            {items.map(({ product, qty }) => (
              <li key={product.id} className="flex gap-3">
                <img src={product.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <div className="flex-1 text-sm">
                  <p className="line-clamp-1 font-semibold">{product.title}</p>
                  <p className="text-xs text-muted-foreground">Qty: {qty}</p>
                </div>
                <p className="text-sm font-bold">৳{product.price * qty}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>৳{total}</span></div>
            {bump && <div className="flex justify-between"><span className="text-muted-foreground">Bonus item</span><span>৳{bumpPrice}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>৳{shippingFee}</span></div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold"><span>Total</span><span className="text-primary">৳{grand}</span></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-xl bg-muted p-3"><Truck className="h-4 w-4 text-primary" /> Fast Delivery</div>
          <div className="flex items-center gap-2 rounded-xl bg-muted p-3"><ShieldCheck className="h-4 w-4 text-primary" /> Easy Return</div>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background p-3 md:hidden">
        <button onClick={handleSubmit} disabled={submitting} className="w-full rounded-full bg-primary py-3.5 text-sm font-extrabold text-primary-foreground disabled:opacity-60">
          {submitting ? "Placing…" : `Place Order — ৳${grand}`}
        </button>
      </div>
    </div>
  );
}
