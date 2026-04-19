import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Package, Truck, Copy, Home, ShoppingBag, MapPin, Loader2, PartyPopper } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/order-success/$orderId")({
  head: ({ params }) => ({
    meta: [
      { title: `Order Confirmed #${params.orderId.slice(0, 8).toUpperCase()} — HobbyShop` },
      { name: "description", content: "Thank you for your order! We've received it and will deliver soon." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderSuccessPage,
});

type Order = {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  shipping_fee: number;
  payment_method: string | null;
  created_at: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_district: string | null;
  order_items: { id: string; name: string; image: string | null; price: number; quantity: number }[];
};

function OrderSuccessPage() {
  const { orderId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(id,name,image,price,quantity)")
        .eq("id", orderId)
        .maybeSingle();
      setOrder(data as Order | null);
      setLoading(false);
    })();
  }, [orderId]);

  const shortId = orderId.slice(0, 8).toUpperCase();

  const copyId = async () => {
    await navigator.clipboard.writeText(shortId);
    toast.success("Order ID copied!");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      {/* Success Hero */}
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-background p-8 text-center">
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-card)]">
          <Check className="h-10 w-10" strokeWidth={3} />
          <PartyPopper className="absolute -right-2 -top-2 h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-extrabold md:text-3xl">Thank You for Your Order!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We've received your order and will start processing it right away.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm">
          <span className="text-muted-foreground">Order ID:</span>
          <span className="font-bold">#{shortId}</span>
          <button onClick={copyId} className="ml-1 text-primary hover:opacity-70" aria-label="Copy order ID">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!order ? (
        <Card className="mb-6">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Your order has been placed. We'll contact you shortly to confirm.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* What happens next */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="mb-4 font-bold">What happens next?</h2>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Order received</p>
                    <p className="text-xs text-muted-foreground">We've got your order and saved your details.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">We'll call to confirm</p>
                    <p className="text-xs text-muted-foreground">Our team will reach out shortly on {order.shipping_phone || "your phone"}.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Out for delivery</p>
                    <p className="text-xs text-muted-foreground">Pay <span className="font-semibold uppercase">{order.payment_method || "cash"}</span> when your order arrives.</p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="mb-4 font-bold">Order Summary ({order.order_items.length} {order.order_items.length === 1 ? "item" : "items"})</h2>
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
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="mb-3 flex items-center gap-2 font-bold"><MapPin className="h-4 w-4" /> Delivery Address</h2>
              <p className="text-sm font-semibold">{order.shipping_name}</p>
              <p className="text-sm text-muted-foreground">{order.shipping_phone}</p>
              <p className="text-sm text-muted-foreground">
                {order.shipping_address}
                {order.shipping_city ? `, ${order.shipping_city}` : ""}
                {order.shipping_district ? `, ${order.shipping_district}` : ""}
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg" className="h-12 rounded-full font-bold">
          <Link to="/track/$orderId" params={{ orderId }}>
            <Truck className="mr-2 h-4 w-4" /> Track Order
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 rounded-full font-bold">
          <Link to="/shop">
            <ShoppingBag className="mr-2 h-4 w-4" /> Continue Shopping
          </Link>
        </Button>
      </div>

      <div className="mt-4 text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Home className="h-3 w-3" /> Back to home
        </Link>
      </div>
    </div>
  );
}
