import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useWishlist } from "@/lib/wishlist";
import { getProduct } from "@/lib/products";
import { toast } from "sonner";
import { Loader2, LogOut, User as UserIcon, Heart, Package, MapPin, Plus, Trash2, Star, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — HobbyShop" },
      { name: "description", content: "Manage your HobbyShop profile, orders, addresses, and wishlist." },
    ],
  }),
  component: AccountPage,
});

type Order = {
  id: string;
  status: string;
  total: number;
  created_at: string;
  shipping_city: string | null;
  shipping_district: string | null;
  order_items: { id: string; name: string; image: string | null; price: number; quantity: number }[];
};

type Address = {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  district: string;
  postal_code: string | null;
  is_default: boolean;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  processing: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  shipped: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  delivered: "bg-green-500/15 text-green-700 dark:text-green-400",
  cancelled: "bg-red-500/15 text-red-700 dark:text-red-400",
};

function AccountPage() {
  const navigate = useNavigate();
  const wishlist = useWishlist();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: "Home", full_name: "", phone: "", address_line: "", city: "", district: "", postal_code: "", is_default: false,
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate({ to: "/auth" });
      else setUser(session.user);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setUser(data.session.user);
      await loadAll(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const loadAll = async (uid: string) => {
    const [profileRes, ordersRes, addrRes] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", uid).maybeSingle(),
      supabase.from("orders").select("id,status,total,created_at,shipping_city,shipping_district,order_items(id,name,image,price,quantity)").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("addresses").select("*").eq("user_id", uid).order("is_default", { ascending: false }),
    ]);
    setDisplayName(profileRes.data?.display_name ?? "");
    setOrders((ordersRes.data ?? []) as Order[]);
    setAddresses((addrRes.data ?? []) as Address[]);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (addrForm.is_default) {
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    }
    const { error } = await supabase.from("addresses").insert({
      user_id: user.id,
      label: addrForm.label || null,
      full_name: addrForm.full_name,
      phone: addrForm.phone,
      address_line: addrForm.address_line,
      city: addrForm.city,
      district: addrForm.district,
      postal_code: addrForm.postal_code || null,
      is_default: addrForm.is_default,
    });
    if (error) return toast.error(error.message);
    toast.success("Address saved");
    setShowAddrForm(false);
    setAddrForm({ label: "Home", full_name: "", phone: "", address_line: "", city: "", district: "", postal_code: "", is_default: false });
    await loadAll(user.id);
  };

  const handleDeleteAddress = async (id: string) => {
    if (!user) return;
    await supabase.from("addresses").delete().eq("id", id);
    toast.success("Address removed");
    await loadAll(user.id);
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    await loadAll(user.id);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const wishlistProducts = wishlist.ids.map(getProduct).filter(Boolean) as NonNullable<ReturnType<typeof getProduct>>[];
  const totalSpent = orders.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {(displayName || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{displayName || "Welcome back"}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{orders.length}</p>
          <p className="text-xs text-muted-foreground">Orders</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">৳{totalSpent.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Spent</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{wishlist.count}</p>
          <p className="text-xs text-muted-foreground">Wishlist</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders"><Package className="mr-1 h-4 w-4" /><span className="hidden sm:inline">Orders</span></TabsTrigger>
          <TabsTrigger value="addresses"><MapPin className="mr-1 h-4 w-4" /><span className="hidden sm:inline">Addresses</span></TabsTrigger>
          <TabsTrigger value="wishlist"><Heart className="mr-1 h-4 w-4" /><span className="hidden sm:inline">Wishlist</span></TabsTrigger>
          <TabsTrigger value="profile"><UserIcon className="mr-1 h-4 w-4" /><span className="hidden sm:inline">Profile</span></TabsTrigger>
        </TabsList>

        {/* ORDERS */}
        <TabsContent value="orders" className="mt-6 space-y-3">
          {orders.length === 0 ? (
            <Card><CardContent className="p-10 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold">No orders yet</p>
              <p className="mb-4 text-sm text-muted-foreground">Start shopping to see your orders here.</p>
              <Link to="/shop"><Button>Browse Shop</Button></Link>
            </CardContent></Card>
          ) : orders.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Order #{o.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <Badge className={STATUS_COLOR[o.status] ?? ""} variant="secondary">{o.status}</Badge>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {o.order_items.map((it) => (
                    <div key={it.id} className="flex shrink-0 items-center gap-2 rounded-lg border border-border p-2">
                      {it.image && <img src={it.image} alt="" className="h-10 w-10 rounded object-cover" />}
                      <div className="text-xs">
                        <p className="line-clamp-1 max-w-[140px] font-semibold">{it.name}</p>
                        <p className="text-muted-foreground">×{it.quantity} · ৳{it.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">{o.shipping_city || o.shipping_district || "—"}</span>
                  <span className="font-bold text-primary">৳{Number(o.total).toFixed(0)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ADDRESSES */}
        <TabsContent value="addresses" className="mt-6 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddrForm(!showAddrForm)}>
              <Plus className="mr-1 h-4 w-4" /> {showAddrForm ? "Cancel" : "Add Address"}
            </Button>
          </div>

          {showAddrForm && (
            <Card>
              <CardContent className="p-4">
                <form onSubmit={handleAddAddress} className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Label (Home, Office)" value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} />
                  <Input placeholder="Full name" required value={addrForm.full_name} onChange={(e) => setAddrForm({ ...addrForm, full_name: e.target.value })} />
                  <Input placeholder="Phone" required value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} />
                  <Input placeholder="Postal code" value={addrForm.postal_code} onChange={(e) => setAddrForm({ ...addrForm, postal_code: e.target.value })} />
                  <Input placeholder="City" required value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} />
                  <Input placeholder="District" required value={addrForm.district} onChange={(e) => setAddrForm({ ...addrForm, district: e.target.value })} />
                  <Textarea className="sm:col-span-2" placeholder="Full address (House, Road, Area)" required value={addrForm.address_line} onChange={(e) => setAddrForm({ ...addrForm, address_line: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input type="checkbox" checked={addrForm.is_default} onChange={(e) => setAddrForm({ ...addrForm, is_default: e.target.checked })} />
                    Set as default
                  </label>
                  <Button type="submit" className="sm:col-span-2">Save Address</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {addresses.length === 0 && !showAddrForm ? (
            <Card><CardContent className="p-10 text-center">
              <MapPin className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold">No saved addresses</p>
              <p className="text-sm text-muted-foreground">Add an address to speed up checkout.</p>
            </CardContent></Card>
          ) : addresses.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="font-semibold">{a.label || "Address"}</p>
                      {a.is_default && <Badge variant="secondary" className="bg-primary/10 text-primary"><Star className="mr-1 h-3 w-3" />Default</Badge>}
                    </div>
                    <p className="text-sm">{a.full_name} · {a.phone}</p>
                    <p className="text-sm text-muted-foreground">{a.address_line}, {a.city}, {a.district}{a.postal_code ? ` - ${a.postal_code}` : ""}</p>
                  </div>
                  <div className="flex gap-1">
                    {!a.is_default && (
                      <Button size="sm" variant="ghost" onClick={() => handleSetDefault(a.id)}>Set default</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteAddress(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* WISHLIST */}
        <TabsContent value="wishlist" className="mt-6">
          {wishlistProducts.length === 0 ? (
            <Card><CardContent className="p-10 text-center">
              <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold">Your wishlist is empty</p>
              <p className="mb-4 text-sm text-muted-foreground">Save items you love for later.</p>
              <Link to="/shop"><Button>Browse Shop</Button></Link>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {wishlistProducts.slice(0, 6).map((p) => (
                <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="group rounded-xl border border-border bg-card p-3 transition hover:shadow-md">
                  <img src={p.image} alt={p.title} className="mb-2 aspect-square w-full rounded-lg object-cover" />
                  <p className="line-clamp-1 text-sm font-semibold">{p.title}</p>
                  <p className="text-sm font-bold text-primary">৳{p.price}</p>
                </Link>
              ))}
              {wishlistProducts.length > 6 && (
                <Link to="/wishlist" className="flex items-center justify-center rounded-xl border border-dashed border-border p-3 text-sm font-semibold text-muted-foreground hover:bg-accent">
                  View all <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              )}
            </div>
          )}
        </TabsContent>

        {/* PROFILE */}
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" maxLength={80} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ""} disabled />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
