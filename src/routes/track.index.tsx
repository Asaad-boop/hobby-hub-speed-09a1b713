import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Search, Truck, Clock, Check, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/track/")({
  head: () => ({
    meta: [
      { title: "Track Your Order — HobbyShop" },
      { name: "description", content: "Track your HobbyShop order. Enter your order ID to see real-time status." },
      { property: "og:title", content: "Track Your Order — HobbyShop" },
      { property: "og:description", content: "Get real-time updates on your HobbyShop delivery." },
    ],
  }),
  component: TrackLanding,
});

function TrackLanding() {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = orderId.trim();
    if (!id) {
      setError("Please enter your Order ID");
      return;
    }
    if (id.length < 6) {
      setError("Order ID looks too short");
      return;
    }
    navigate({ to: "/track/$orderId", params: { orderId: id } });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-16">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Package className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold md:text-4xl">Track Your Order</h1>
        <p className="mt-2 text-muted-foreground">Enter your Order ID to see real-time delivery updates.</p>
      </div>

      <Card className="mb-8">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold">Order ID</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. A1B2C3D4"
                  value={orderId}
                  onChange={(e) => { setOrderId(e.target.value); setError(""); }}
                  className="h-12 text-base"
                  autoFocus
                />
                <Button type="submit" size="lg" className="h-12 px-6">
                  <Search className="mr-1 h-4 w-4" /> Track
                </Button>
              </div>
              {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                You can find your Order ID in your confirmation message or in your{" "}
                <Link to="/account" className="text-primary underline">account</Link>.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* How it works */}
      <div className="mb-8">
        <h2 className="mb-4 text-center text-lg font-bold">Order Journey</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Clock, label: "Placed", desc: "Order received" },
            { icon: Package, label: "Processing", desc: "Being packed" },
            { icon: Truck, label: "Shipped", desc: "On the way" },
            { icon: Check, label: "Delivered", desc: "At your door" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help */}
      <div className="rounded-2xl border border-border bg-muted/30 p-5 text-center">
        <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-primary" />
        <p className="text-sm font-semibold">Need help with your order?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Contact us via <Link to="/contact" className="text-primary underline">Contact</Link> or check our{" "}
          <Link to="/faq" className="text-primary underline">FAQ</Link>.
        </p>
      </div>
    </div>
  );
}
