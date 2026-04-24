import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Search, Truck, Clock, Check, ShieldCheck, Loader2 } from "lucide-react";
import { lookupOrder } from "@/lib/order-lookup.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/track/")({
  head: () => ({
    meta: [
      { title: "Track Your Order — HobbyShop" },
      { name: "description", content: "Track your HobbyShop order with your Order ID, phone number, or email. No login needed." },
      { property: "og:title", content: "Track Your Order — HobbyShop" },
      { property: "og:description", content: "Get real-time updates on your HobbyShop delivery." },
    ],
  }),
  component: TrackLanding,
});

function TrackLanding() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const q = query.trim();
    if (!q) return setError("Please enter your Order ID, phone number, or email");

    setLoading(true);
    try {
      const res = await lookupOrder({ data: { query: q } });
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      sessionStorage.setItem(`order:${res.order.id}`, JSON.stringify(res.order));
      navigate({ to: "/track/$orderId", params: { orderId: res.order.id } });
    } catch (err: any) {
      const raw = err?.message || "";
      if (/Unauthorized|No authorization|No token/i.test(raw)) {
        toast.info("Please sign in to track your order");
        navigate({ to: "/auth" });
        return;
      }
      const friendly = /SUPABASE_|environment variables/i.test(raw)
        ? "Order tracking is temporarily unavailable. Please try again in a moment."
        : raw || "Lookup failed. Please try again.";
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-16">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Package className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold md:text-4xl">Track Your Order</h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Sign in to track your order — enter your Order ID, phone number, or email.
        </p>
      </div>

      <Card className="mb-8 overflow-hidden">
        <CardContent className="p-5 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Order ID, Phone, or Email
              </label>
              <Input
                placeholder="e.g. A1B2C3D4 or 01XXXXXXXXX or you@example.com"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setError(""); }}
                className="h-12 text-base"
                autoFocus
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Any one is enough. We'll find your most recent matching order.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={loading} className="h-12 w-full text-base font-extrabold">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (<><Search className="mr-2 h-4 w-4" /> Track Order</>)}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Have an account?{" "}
              <Link to="/account" className="font-semibold text-primary underline">View all your orders</Link>
            </p>
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
