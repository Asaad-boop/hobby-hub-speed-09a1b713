import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { products } from "@/lib/products";
import { Check, Truck, ShieldCheck } from "lucide-react";

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
  const [placed, setPlaced] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  const bumpItem = products[1];
  const bumpPrice = 199;
  const grand = total + (bump ? bumpPrice : 0) + 60; // delivery

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bump) add(bumpItem);
    setPlaced(true);
    clear();
    setTimeout(() => navigate({ to: "/" }), 2500);
  };

  if (placed) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Order Placed!</h1>
        <p className="mt-2 text-sm text-muted-foreground">We'll call you shortly to confirm. Thanks for shopping with HobbyShop.</p>
      </div>
    );
  }

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
            <input required autoFocus inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary" placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Full Address</label>
            <textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="House, Road, Area, City" />
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

        {/* Order bump */}
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

        <button type="submit" className="hidden w-full rounded-full bg-primary py-4 text-base font-extrabold text-primary-foreground shadow-[var(--shadow-card)] transition hover:opacity-90 md:block">
          Place Order — ৳{grand}
        </button>
      </form>

      {/* Summary */}
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
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>৳60</span></div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold"><span>Total</span><span className="text-primary">৳{grand}</span></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-xl bg-muted p-3"><Truck className="h-4 w-4 text-primary" /> Fast Delivery</div>
          <div className="flex items-center gap-2 rounded-xl bg-muted p-3"><ShieldCheck className="h-4 w-4 text-primary" /> Easy Return</div>
        </div>
      </aside>

      {/* Mobile sticky place order */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background p-3 md:hidden">
        <button onClick={handleSubmit} className="w-full rounded-full bg-primary py-3.5 text-sm font-extrabold text-primary-foreground">
          Place Order — ৳{grand}
        </button>
      </div>
    </div>
  );
}
