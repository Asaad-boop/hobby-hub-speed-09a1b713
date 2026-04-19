import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, Tags, ShoppingBag, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [products, categories, orders] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total", { count: "exact" }),
      ]);
      const revenue = (orders.data ?? []).reduce((s, o) => s + Number(o.total || 0), 0);
      return {
        products: products.count ?? 0,
        categories: categories.count ?? 0,
        orders: orders.count ?? 0,
        revenue,
      };
    },
  });

  const cards = [
    { label: "Products", value: stats?.products ?? "—", icon: Package, to: "/admin/products" as const, color: "text-primary bg-primary/10" },
    { label: "Categories", value: stats?.categories ?? "—", icon: Tags, to: "/admin/products" as const, color: "text-blue-600 bg-blue-500/10" },
    { label: "Orders", value: stats?.orders ?? "—", icon: ShoppingBag, to: "/admin" as const, color: "text-emerald-600 bg-emerald-500/10" },
    { label: "Revenue", value: stats ? `৳${stats.revenue.toLocaleString()}` : "—", icon: TrendingUp, to: "/admin" as const, color: "text-amber-600 bg-amber-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">HobbyShop er overview ekhane.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="group rounded-2xl border border-border bg-background p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</span>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${c.color}`}>
                <c.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <h2 className="text-lg font-semibold">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/admin/products" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Manage products
          </Link>
          <Link to="/admin" className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted">
            Categories (soon)
          </Link>
          <Link to="/admin" className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted">
            Orders (soon)
          </Link>
        </div>
      </div>
    </div>
  );
}
