import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Package,
  Truck,
  Check,
  Clock,
  XCircle,
  MapPin,
  Search,
  Phone,
  Copy,
  CheckCheck,
  PackageCheck,
  Headset,
  Calendar,
  ShieldCheck,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/track/$orderId")({
  head: ({ params }) => ({
    meta: [
      { title: `Track Order #${params.orderId.slice(0, 8).toUpperCase()} — HobbyShop` },
      { name: "description", content: "Track your HobbyShop order status in real-time." },
    ],
  }),
  component: TrackOrderPage,
});

type Order = {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  shipping_fee: number;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_district: string | null;
  notes: string | null;
  order_items: { id: string; name: string; image: string | null; price: number; quantity: number }[];
};

const STEPS = [
  { key: "pending", label: "Placed", desc: "Order received", icon: Clock },
  { key: "confirmed", label: "Confirmed", desc: "Verified by phone", icon: Headset },
  { key: "processing", label: "Packed", desc: "Ready to ship", icon: PackageCheck },
  { key: "shipped", label: "Shipped", desc: "On the way", icon: Truck },
  { key: "delivered", label: "Delivered", desc: "Order complete", icon: Check },
];

// Map DB statuses (pending|processing|shipped|delivered|cancelled) to richer step index
const statusToStepIndex = (s: string) => {
  switch (s) {
    case "pending": return 0;
    case "confirmed": return 1;
    case "processing": return 2;
    case "shipped": return 3;
    case "delivered": return 4;
    default: return 0;
  }
};

function formatETA(createdAt: string) {
  const d = new Date(createdAt);
  const min = new Date(d); min.setDate(d.getDate() + 2);
  const max = new Date(d); max.setDate(d.getDate() + 5);
  const fmt = (x: Date) => x.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(min)} – ${fmt(max)}`;
}

function TrackOrderPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [searchId, setSearchId] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/auth" });
        return;
      }
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(id,name,image,price,quantity)")
        .eq("id", orderId)
        .maybeSingle();
      setOrder(data as Order | null);
      setLoading(false);
    })();
  }, [orderId, navigate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) navigate({ to: "/track/$orderId", params: { orderId: searchId.trim() } });
  };

  const copyId = async () => {
    if (!order) return;
    await navigator.clipboard.writeText(order.id);
    toast.success("Order ID copied");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center md:py-20">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <XCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-extrabold">Order not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">Double-check your order ID or browse your account.</p>
        <form onSubmit={handleSearch} className="mt-6 flex gap-2">
          <Input placeholder="Enter Order ID" value={searchId} onChange={(e) => setSearchId(e.target.value)} className="h-12" />
          <Button type="submit" className="h-12 px-4"><Search className="h-4 w-4" /></Button>
        </form>
        <Link to="/account" className="mt-4 inline-block text-sm font-semibold text-primary underline">View my orders</Link>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const currentStep = statusToStepIndex(order.status);
  const progressPct = isCancelled ? 0 : (currentStep / (STEPS.length - 1)) * 100;
  const currentStepData = STEPS[currentStep];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4 md:pb-12 md:pt-8">
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <Link to="/account" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          ← Account
        </Link>
        <button onClick={copyId} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold hover:bg-muted/70">
          #{order.id.slice(0, 8).toUpperCase()} <Copy className="h-3 w-3" />
        </button>
      </div>

      {/* Hero status card */}
      <div className={`mb-4 overflow-hidden rounded-2xl border ${isCancelled ? "border-destructive/30 bg-destructive/5" : "border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"}`}>
        <div className="p-5 md:p-6">
          {isCancelled ? (
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-destructive">Cancelled</p>
                <h1 className="mt-0.5 text-xl font-extrabold md:text-2xl">Order Cancelled</h1>
                <p className="mt-1 text-sm text-muted-foreground">This order has been cancelled. Contact support if this was a mistake.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                <currentStepData.icon className="h-6 w-6" />
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">{currentStepData.label}</p>
                <h1 className="mt-0.5 text-xl font-extrabold md:text-2xl">{currentStepData.desc}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Estimated delivery: <span className="font-semibold text-foreground">{formatETA(order.created_at)}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Progress timeline */}
        {!isCancelled && (
          <div className="border-t border-border/50 bg-background/50 p-5 md:p-6">
            {/* Mobile: vertical */}
            <ol className="space-y-4 md:hidden">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <li key={step.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition ${done || active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"} ${active ? "ring-4 ring-primary/20" : ""}`}>
                        {done ? <CheckCheck className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`mt-1 h-8 w-0.5 ${i < currentStep ? "bg-primary" : "bg-border"}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-2 pt-1.5">
                      <p className={`text-sm font-bold ${done || active ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                      {active && (
                        <p className="mt-1 text-[11px] font-semibold text-primary">
                          Updated {new Date(order.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Desktop: horizontal */}
            <div className="hidden md:block">
              <div className="relative mb-4">
                <div className="absolute left-5 right-5 top-5 h-1 rounded-full bg-border" />
                <div
                  className="absolute left-5 top-5 h-1 rounded-full bg-primary transition-all duration-700"
                  style={{ width: `calc((100% - 2.5rem) * ${currentStep / (STEPS.length - 1)})` }}
                />
                <div className="relative flex justify-between">
                  {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const done = i < currentStep;
                    const active = i === currentStep;
                    return (
                      <div key={step.key} className="flex w-20 flex-col items-center gap-2">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${done || active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"} ${active ? "ring-4 ring-primary/20" : ""}`}>
                          {done ? <CheckCheck className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        </div>
                        <div className="text-center">
                          <p className={`text-xs font-bold ${done || active ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                          <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Last updated {new Date(order.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick action row */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <a href="tel:+8801700000000" className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-bold transition active:scale-95 hover:border-primary hover:text-primary">
          <Phone className="h-4 w-4" /> Call Support
        </a>
        <Link to="/contact" className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-bold transition active:scale-95 hover:border-primary hover:text-primary">
          <Headset className="h-4 w-4" /> Get Help
        </Link>
      </div>

      {/* Items */}
      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-extrabold">
              <Package className="h-4 w-4 text-primary" /> Items
            </h2>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold">{order.order_items.length}</span>
          </div>
          <ul className="divide-y divide-border">
            {order.order_items.map((it) => (
              <li key={it.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                {it.image ? (
                  <img src={it.image} alt={it.name} className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-border" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{it.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Qty {it.quantity} · ৳{it.price}</p>
                </div>
                <p className="shrink-0 text-sm font-extrabold">৳{(it.price * it.quantity).toFixed(0)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">৳{Number(order.subtotal).toFixed(0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="font-semibold">৳{Number(order.shipping_fee).toFixed(0)}</span></div>
            <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2">
              <span className="text-sm font-bold">Total</span>
              <span className="text-xl font-extrabold text-primary">৳{Number(order.total).toFixed(0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping + Payment */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-extrabold">
              <MapPin className="h-4 w-4 text-primary" /> Delivery Address
            </h2>
            <p className="text-sm font-bold">{order.shipping_name}</p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" /> {order.shipping_phone}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {order.shipping_address}
              {order.shipping_city ? `, ${order.shipping_city}` : ""}
              {order.shipping_district ? `, ${order.shipping_district}` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-extrabold">
              <CreditCard className="h-4 w-4 text-primary" /> Payment
            </h2>
            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5">
              <span className="text-sm font-semibold">
                {order.payment_method ? order.payment_method.toUpperCase() : "COD"}
              </span>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Pay on delivery
              </span>
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> 100% safe & secure checkout
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Continue shopping */}
      <Link
        to="/shop"
        className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-border bg-card p-4 transition hover:border-primary"
      >
        <div>
          <p className="text-sm font-extrabold">Continue shopping</p>
          <p className="text-xs text-muted-foreground">Discover more deals on HobbyShop</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-3xl gap-2">
          <a href="tel:+8801700000000" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-primary text-sm font-extrabold text-primary active:scale-95">
            <Phone className="h-4 w-4" /> Call
          </a>
          <Link to="/shop" className="flex h-12 flex-[2] items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/30 active:scale-95">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
