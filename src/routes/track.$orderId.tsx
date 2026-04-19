import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Package, Truck, Check, Clock, XCircle, MapPin, Search } from "lucide-react";

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
  order_items: { id: string; name: string; image: string | null; price: number; quantity: number }[];
};

const STEPS = [
  { key: "pending", label: "Order Placed", icon: Clock },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Check },
];

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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <XCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">Check your order ID and try again.</p>
        <form onSubmit={handleSearch} className="mt-6 flex gap-2">
          <Input placeholder="Enter Order ID" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
          <Button type="submit"><Search className="h-4 w-4" /></Button>
        </form>
        <Link to="/account" className="mt-4 inline-block text-sm text-primary underline">View my orders</Link>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const currentStep = STEPS.findIndex((s) => s.key === order.status);
  const progressPct = isCancelled ? 0 : (currentStep / (STEPS.length - 1)) * 100;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <div className="mb-6">
        <Link to="/account" className="text-sm text-muted-foreground hover:text-foreground">← Back to account</Link>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">Track Order</h1>
        <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8).toUpperCase()} · Placed {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
      </div>

      {/* Status Timeline */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {isCancelled ? (
            <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
              <XCircle className="h-6 w-6" />
              <div>
                <p className="font-bold">Order Cancelled</p>
                <p className="text-xs opacity-80">This order has been cancelled.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="relative mb-6">
                <div className="absolute left-0 right-0 top-5 h-1 rounded-full bg-muted" />
                <div className="absolute left-0 top-5 h-1 rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
                <div className="relative flex justify-between">
                  {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const done = i <= currentStep;
                    const active = i === currentStep;
                    return (
                      <div key={step.key} className="flex flex-col items-center gap-2">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${done ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-background text-muted-foreground"} ${active ? "ring-4 ring-primary/20" : ""}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className={`text-center text-[10px] font-semibold sm:text-xs ${done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center text-sm">
                <span className="font-semibold capitalize">{order.status}</span>
                <span className="text-muted-foreground"> · Last updated {new Date(order.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mb-4 font-bold">Items ({order.order_items.length})</h2>
          <ul className="space-y-3">
            {order.order_items.map((it) => (
              <li key={it.id} className="flex gap-3">
                {it.image && <img src={it.image} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                <div className="flex-1">
                  <p className="line-clamp-1 text-sm font-semibold">{it.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {it.quantity} × ৳{it.price}</p>
                </div>
                <p className="text-sm font-bold">৳{(it.price * it.quantity).toFixed(0)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>৳{Number(order.subtotal).toFixed(0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>৳{Number(order.shipping_fee).toFixed(0)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold"><span>Total</span><span className="text-primary">৳{Number(order.total).toFixed(0)}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-3 flex items-center gap-2 font-bold"><MapPin className="h-4 w-4" /> Delivery Address</h2>
          <p className="text-sm font-semibold">{order.shipping_name}</p>
          <p className="text-sm text-muted-foreground">{order.shipping_phone}</p>
          <p className="text-sm text-muted-foreground">{order.shipping_address}{order.shipping_city ? `, ${order.shipping_city}` : ""}{order.shipping_district ? `, ${order.shipping_district}` : ""}</p>
          {order.payment_method && (
            <p className="mt-3 text-xs text-muted-foreground">Payment: <span className="font-semibold uppercase">{order.payment_method}</span></p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
