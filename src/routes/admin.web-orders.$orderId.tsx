import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  PhoneCall,
  Copy,
  Trash2,
  Plus,
  Minus,
  RefreshCw,
  Globe,
  FileText,
  Tag,
  Paperclip,
  Settings,
  StickyNote,
  Save,
  Loader2,
  Search,
  Star,
  Send,
  Activity,
  ExternalLink,
  Smartphone,
  Facebook,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAdminAuth } from "@/lib/admin";
import { BD_DISTRICTS } from "@/lib/bd-locations";
import type { Database } from "@/integrations/supabase/types";
import { formatDistanceToNow, format } from "date-fns";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ActivityLogRow = Database["public"]["Tables"]["activity_logs"]["Row"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

export const Route = createFileRoute("/admin/web-orders/$orderId")({
  head: () => ({
    meta: [{ title: "Web Order Details — Admin" }],
  }),
  component: WebOrderDetailPage,
});

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  packaging: "Packaging",
  packed: "Packed",
  ready_to_ship: "Ready to Ship",
  shipped: "Shipped",
  in_transit: "In Transit",
  delivered: "Delivered",
  partial_delivered: "Partial Delivered",
  returned: "Returned",
  exchanged: "Exchanged",
  damaged: "Damaged",
  cancelled: "Cancelled",
  fake: "Fake",
  on_hold: "On Hold",
  advance_payment_pending: "Advance Pending",
};

const STATUS_TONES: Record<OrderStatus, string> = {
  new: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  confirmed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  packaging: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  packed: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  ready_to_ship: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  shipped: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  in_transit: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  partial_delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  returned: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
  exchanged: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
  damaged: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
  cancelled: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  fake: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
  advance_payment_pending: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
};

type OrderWithItems = OrderRow & { order_items: OrderItemRow[] };

function copyText(value: string, label = "Copied") {
  navigator.clipboard
    .writeText(value)
    .then(() => toast.success(label))
    .catch(() => toast.error("Copy failed"));
}

function formatBDT(value: number) {
  return `৳${Number(value || 0).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function WebOrderDetailPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { loading: authLoading, hasRole } = useAdminAuth();
  const allowed = hasRole(["admin", "customer_service", "operations"]);

  // ============ Fetch order + items ============
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["web_order_detail", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data as OrderWithItems | null;
    },
    enabled: allowed,
  });

  // ============ Phone-based stats ============
  const phone = order?.shipping_phone || order?.guest_phone || "";

  const { data: phoneStats } = useQuery({
    queryKey: ["phone_stats_overall", phone],
    enabled: !!phone,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_stats_by_phone" as never)
        .select("*")
        .eq("phone", phone)
        .maybeSingle();
      if (error) return null;
      return data as {
        phone: string;
        total_orders: number;
        delivered_orders: number;
        cancelled_orders: number;
        fake_orders: number;
        success_rate: number | null;
      } | null;
    },
  });

  const { data: courierStats } = useQuery({
    queryKey: ["phone_stats_courier", phone],
    enabled: !!phone,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_courier_stats" as never)
        .select("*")
        .eq("phone", phone);
      if (error) return [];
      return (data as Array<{
        phone: string;
        provider: string;
        total_orders: number;
        delivered_orders: number;
        cancelled_orders: number;
        success_rate: number | null;
      }>) ?? [];
    },
  });

  // ============ Activity logs ============
  const { data: activityLogs } = useQuery({
    queryKey: ["order_activity_logs", orderId],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ActivityLogRow[];
    },
  });

  // ============ Editable form state ============
  const [name, setName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [address, setAddress] = useState("");
  const [shippingNote, setShippingNote] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [shippingFee, setShippingFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isPreorder, setIsPreorder] = useState(false);
  const [isCrossSale, setIsCrossSale] = useState(false);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [statusDraft, setStatusDraft] = useState<OrderStatus>("new");
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    if (!order) return;
    setName(order.shipping_name ?? order.guest_name ?? "");
    setPhoneInput(order.shipping_phone ?? order.guest_phone ?? "");
    setAddress(order.shipping_address ?? "");
    setShippingNote(order.notes ?? "");
    setDistrict(order.shipping_district ?? "");
    setCity(order.shipping_city ?? "");
    setArea("");
    setShippingFee(Number(order.shipping_fee) || 0);
    setDiscount(Number(order.discount_amount) || 0);
    setAdvance(Number(order.advance_payment_amount) || 0);
    setTags(order.order_tags ?? []);
    setIsPreorder(order.is_preorder ?? false);
    setIsCrossSale(order.is_cross_sale ?? false);
    setItems(order.order_items ?? []);
    setStatusDraft(order.status);
  }, [order]);

  // ============ Cascading address ============
  const cityOptions = useMemo(
    () => BD_DISTRICTS.find((d) => d.name === district)?.cities ?? [],
    [district],
  );

  // ============ Product picker ============
  const [productSearch, setProductSearch] = useState("");
  const { data: productResults } = useQuery({
    queryKey: ["product_picker", productSearch],
    enabled: allowed,
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id, title, slug, price, stock, image")
        .eq("is_active", true)
        .order("title")
        .limit(15);
      if (productSearch.trim()) {
        q = q.ilike("title", `%${productSearch.trim()}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Pick<ProductRow, "id" | "title" | "slug" | "price" | "stock" | "image">[];
    },
  });

  // ============ Totals ============
  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.price) * it.quantity, 0),
    [items],
  );
  const grandTotal = Math.max(0, subtotal + shippingFee - discount - advance);

  // ============ Mutations ============
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error("No order");
      const payload = {
        shipping_name: name || null,
        shipping_phone: phoneInput || null,
        shipping_address: address || null,
        shipping_district: district || null,
        shipping_city: city || null,
        notes: shippingNote || null,
        shipping_fee: shippingFee,
        discount_amount: discount,
        advance_payment_amount: advance,
        order_tags: tags,
        is_preorder: isPreorder,
        is_cross_sale: isCrossSale,
        subtotal,
        total: grandTotal,
        status: statusDraft,
      };
      const { error } = await supabase.from("orders").update(payload).eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["web_order_detail", orderId] });
      qc.invalidateQueries({ queryKey: ["order_activity_logs", orderId] });
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!order || !noteDraft.trim()) return;
      const newNotes = [order.admin_notes, noteDraft.trim()].filter(Boolean).join("\n---\n");
      const { error } = await supabase
        .from("orders")
        .update({ admin_notes: newNotes })
        .eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note added");
      setNoteDraft("");
      qc.invalidateQueries({ queryKey: ["web_order_detail", orderId] });
      qc.invalidateQueries({ queryKey: ["order_activity_logs", orderId] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add note"),
  });

  // ============ Item helpers ============
  function updateQty(id: string, delta: number) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it)),
    );
  }
  function updatePrice(id: string, value: number) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, price: value } : it)));
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }
  function addProduct(p: { id: string; title: string; price: number; image: string | null }) {
    const existing = items.find((it) => it.product_id === p.id && !it.variant_id);
    if (existing) {
      updateQty(existing.id, 1);
      return;
    }
    const newItem: OrderItemRow = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      order_id: orderId,
      product_id: p.id,
      name: p.title,
      image: p.image,
      price: p.price,
      quantity: 1,
      created_at: new Date().toISOString(),
      user_id: null,
      variant_id: null,
      variant_label: null,
    };
    setItems((prev) => [...prev, newItem]);
    toast.success(`Added ${p.title}`);
  }

  function addTag() {
    const t = newTag.trim();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setNewTag("");
  }

  function sendSms(kind: "reminder" | "advance") {
    // Placeholder — Phase 2 wires actual SMS
    const id = order ? shortId(order.id) : "----";
    const msg =
      kind === "reminder"
        ? `Reminder SMS queued for #${id}`
        : `Advance payment SMS queued for #${id}`;
    toast.info(msg);
  }

  // ============ Guards ============
  if (authLoading || orderLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        You don't have permission to view this order.
      </div>
    );
  }
  if (!order) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Order not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/admin/web-orders">Back to Web Orders</Link>
        </Button>
      </div>
    );
  }

  const createdAgo = formatDistanceToNow(new Date(order.created_at), { addSuffix: true });
  const updatedAgo = formatDistanceToNow(new Date(order.updated_at), { addSuffix: true });

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* ========== TOP BREADCRUMB BAR ========== */}
      <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:flex-row md:items-center md:justify-between md:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/admin">Admin</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/admin/web-orders">Web Orders</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>#{shortId(order.id)}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/web-orders">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              New Order
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/orders">Order List</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => sendSms("reminder")}>
            <Send className="mr-1 h-3.5 w-3.5" />
            Send Message
          </Button>
        </div>
      </div>

      {/* ========== HEADER ========== */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/web-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold leading-tight">Web Order Details</h1>
            <p className="text-xs text-muted-foreground">
              Order ID: <span className="font-mono">#{shortId(order.id)}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Created {createdAgo}</span>
          <span className="opacity-30">•</span>
          <span>Updated {updatedAgo}</span>
          <Badge variant="outline" className={STATUS_TONES[order.status]}>
            {STATUS_LABELS[order.status]}
          </Badge>
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300">
            Source: WEB
          </Badge>
        </div>
      </div>

      {/* ========== COURIER SUCCESS STATS ========== */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Courier Success Stats — {phone || "No phone"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overall">
            <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid">
              <TabsTrigger value="overall">Overall</TabsTrigger>
              <TabsTrigger value="pathao">Pathao</TabsTrigger>
              <TabsTrigger value="redx">RedX</TabsTrigger>
              <TabsTrigger value="steadfast">Steadfast</TabsTrigger>
            </TabsList>
            <TabsContent value="overall">
              <StatBlock
                successRate={phoneStats?.success_rate ?? 0}
                total={phoneStats?.total_orders ?? 0}
                success={phoneStats?.delivered_orders ?? 0}
                cancelled={phoneStats?.cancelled_orders ?? 0}
              />
            </TabsContent>
            {(["pathao", "redx", "steadfast"] as const).map((p) => {
              const stat = courierStats?.find((s) => s.provider === p);
              return (
                <TabsContent key={p} value={p}>
                  <StatBlock
                    successRate={stat?.success_rate ?? 0}
                    total={stat?.total_orders ?? 0}
                    success={stat?.delivered_orders ?? 0}
                    cancelled={stat?.cancelled_orders ?? 0}
                  />
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* ========== MAIN GRID (left main + right sidebar) ========== */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        {/* ---------- LEFT MAIN ---------- */}
        <div className="flex flex-col gap-4">
          {/* Customer info */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <Phone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="01XXXXXXXXX"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="WhatsApp"
                      onClick={() =>
                        phoneInput && window.open(`https://wa.me/${phoneInput.replace(/\D/g, "")}`)
                      }
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Call"
                      onClick={() => phoneInput && window.open(`tel:${phoneInput}`)}
                    >
                      <PhoneCall className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Copy"
                      onClick={() => copyText(phoneInput)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label>Address</Label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    placeholder="Full delivery address"
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label>Shipping Note</Label>
                  <Textarea
                    value={shippingNote}
                    onChange={(e) => setShippingNote(e.target.value)}
                    rows={3}
                    placeholder="Notes for delivery"
                  />
                </div>
              </div>

              {/* Extra options row */}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" type="button">
                  <FileText className="mr-1 h-3.5 w-3.5" /> Page
                </Button>
                <Button variant="outline" size="sm" type="button">
                  <Settings className="mr-1 h-3.5 w-3.5" /> Template
                </Button>
                <Button variant="outline" size="sm" type="button">
                  <FileText className="mr-1 h-3.5 w-3.5" /> Invoice
                </Button>
                <Button variant="outline" size="sm" type="button">
                  <Tag className="mr-1 h-3.5 w-3.5" /> Tags
                </Button>
                <Button variant="outline" size="sm" type="button">
                  <Paperclip className="mr-1 h-3.5 w-3.5" /> File
                </Button>
                <Button variant="outline" size="sm" type="button">
                  <Globe className="mr-1 h-3.5 w-3.5" /> Website
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-2">
                  <Switch checked={isPreorder} onCheckedChange={setIsPreorder} id="preorder" />
                  <Label htmlFor="preorder" className="text-xs">Preorder</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isCrossSale} onCheckedChange={setIsCrossSale} id="crosssale" />
                  <Label htmlFor="crosssale" className="text-xs">Cross Sale</Label>
                </div>
              </div>

              {/* Cascading address */}
              <div className="rounded-xl border border-dashed bg-muted/30 p-3">
                <p className="mb-3 text-xs text-muted-foreground">
                  এড্রেস লিখলে এই ফিল্ডগুলো অটোমেটিক ফিল হয়ে যাবে, যদি না হয় তাহলে সিলেক্ট করে নিন
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">City / District</Label>
                    <Select value={district} onValueChange={(v) => { setDistrict(v); setCity(""); }}>
                      <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                      <SelectContent>
                        {BD_DISTRICTS.map((d) => (
                          <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Zone</Label>
                    <Select value={city} onValueChange={setCity} disabled={!district}>
                      <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                      <SelectContent>
                        {cityOptions.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Area</Label>
                    <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area / locality" disabled={!city} />
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => { setDistrict(""); setCity(""); setArea(""); }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear
                  </Button>
                  <Button variant="ghost" size="sm" type="button">
                    <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products + Picker */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            {/* Ordered products */}
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ordered Products ({items.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No products yet.</p>
                ) : (
                  items.map((it) => (
                    <div key={it.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
                      <div className="flex flex-1 items-center gap-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                          {it.image ? (
                            <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{it.name}</p>
                          {it.variant_label ? (
                            <p className="text-xs text-muted-foreground">{it.variant_label}</p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">SKU: {it.product_id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-md border">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(it.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{it.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(it.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          type="number"
                          value={it.price}
                          onChange={(e) => updatePrice(it.id, Number(e.target.value) || 0)}
                          className="h-8 w-24"
                        />
                        <span className="w-20 text-right text-sm font-medium">
                          {formatBDT(Number(it.price) * it.quantity)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => removeItem(it.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Product picker */}
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Click to Add Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search by name or SKU"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-[400px] space-y-2 overflow-y-auto">
                  {(productResults ?? []).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        addProduct({ id: p.id, title: p.title, price: Number(p.price), image: p.image })
                      }
                      className="flex w-full items-center gap-2 rounded-md border p-2 text-left transition hover:bg-accent"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted">
                        {p.image ? <img src={p.image} alt={p.title} className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{p.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatBDT(Number(p.price))} · Stock: {p.stock}
                        </p>
                      </div>
                      <Star className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))}
                  {(productResults ?? []).length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">No results.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer summary */}
          <Card className="rounded-2xl">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <div>
                  <Label className="text-xs">Discount</Label>
                  <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <Label className="text-xs">Advance</Label>
                  <Input type="number" value={advance} onChange={(e) => setAdvance(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <Label className="text-xs">Sub Total</Label>
                  <Input value={subtotal.toFixed(2)} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label className="text-xs">Delivery</Label>
                  <Input type="number" value={shippingFee} onChange={(e) => setShippingFee(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <Label className="text-xs">Grand Total</Label>
                  <Input value={grandTotal.toFixed(2)} readOnly className="bg-muted font-semibold" />
                </div>
              </div>
              <Button
                className="mt-4 h-12 w-full bg-emerald-600 text-base font-semibold hover:bg-emerald-700"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Update Order ({formatBDT(grandTotal)})
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ---------- RIGHT SIDEBAR ---------- */}
        <aside className="flex flex-col gap-3">
          {/* Order Summary */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <Row label="Order ID" value={`#${shortId(order.id)}`} mono />
              <Row label="Date" value={format(new Date(order.created_at), "PPp")} />
              <Row label="Payment" value={order.payment_method?.toUpperCase() ?? "COD"} />
              <Row label="Subtotal" value={formatBDT(subtotal)} />
              <Row label="Delivery" value={formatBDT(shippingFee)} />
              <Row label="Total" value={formatBDT(grandTotal)} bold />
              <div className="flex justify-between pt-1.5">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={STATUS_TONES[order.status]}>
                  {STATUS_LABELS[order.status]}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source</span>
                <span className="flex items-center gap-1 text-xs">
                  <Facebook className="h-3 w-3 text-blue-600" />
                  {order.session_source ?? "Direct"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Order Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button onClick={() => setTags(tags.filter((x) => x !== t))} className="ml-1 opacity-60 hover:opacity-100">×</button>
                  </Badge>
                ))}
                {tags.length === 0 && <span className="text-xs text-muted-foreground">No tags</span>}
              </div>
              <div className="flex gap-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="New tag"
                  className="h-8"
                />
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={addTag}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Order Actions */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Order Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select value={statusDraft} onValueChange={(v) => setStatusDraft(v as OrderStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate({ to: "/admin/web-orders" })}>
                  Back to List
                </Button>
                <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <StickyNote className="h-3.5 w-3.5" /> Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.admin_notes ? (
                <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs">{order.admin_notes}</p>
              ) : (
                <p className="text-xs text-muted-foreground">No notes yet.</p>
              )}
              <Textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Add a note..."
                rows={2}
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => addNoteMutation.mutate()}
                disabled={!noteDraft.trim() || addNoteMutation.isPending}
              >
                Add Note
              </Button>
            </CardContent>
          </Card>

          {/* Send SMS */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Send SMS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full" onClick={() => sendSms("reminder")}>
                <Send className="mr-1 h-3.5 w-3.5" /> Send Reminder SMS
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={() => sendSms("advance")}>
                <Send className="mr-1 h-3.5 w-3.5" /> Send Advance SMS
              </Button>
            </CardContent>
          </Card>

          {/* Attribution */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Attribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex flex-wrap gap-1">
                {order.utm_source && <Badge variant="outline">{order.utm_source}</Badge>}
                {order.utm_medium && <Badge variant="outline">{order.utm_medium}</Badge>}
                {order.utm_campaign && <Badge variant="outline">{order.utm_campaign}</Badge>}
              </div>
              <AttrRow label="Meta Ad Account" value={order.meta_ad_account_id} />
              <AttrRow label="Campaign" value={order.meta_campaign_id} />
              <AttrRow label="Ad Set" value={order.meta_ad_set_id} />
              <AttrRow label="Ad" value={order.meta_ad_id} />
              <Separator className="my-2" />
              <AttrRow label="FB Click ID" value={order.fb_click_id} truncate />
              <AttrRow label="Browser Pixel" value={order.fb_browser_pixel} truncate />
            </CardContent>
          </Card>

          {/* Session Info */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{order.device_type ?? "Unknown device"}</span>
              </div>
              <AttrRow label="IP" value={order.ip_address} />
              <AttrRow label="Source" value={order.session_source} truncate />
              {order.entry_url && (
                <a
                  href={order.entry_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Entry URL
                </a>
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <Activity className="h-3.5 w-3.5" /> Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] space-y-3 overflow-y-auto">
                {(activityLogs ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No activity yet.</p>
                ) : (
                  (activityLogs ?? []).map((log) => (
                    <div key={log.id} className="border-l-2 border-muted pl-2.5 text-xs">
                      <p className="text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                      <p className="font-medium uppercase tracking-wide">{log.action}</p>
                      {log.note && <p className="mt-0.5 text-muted-foreground">{log.note}</p>}
                      {log.new_value && !log.note && (
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {JSON.stringify(log.new_value)}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ============ small helpers ============
function StatBlock({
  successRate,
  total,
  success,
  cancelled,
}: {
  successRate: number;
  total: number;
  success: number;
  cancelled: number;
}) {
  const rate = Math.max(0, Math.min(100, Number(successRate) || 0));
  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Success Rate" value={`${rate}%`} tone="emerald" />
        <Stat label="Total" value={String(total)} />
        <Stat label="Success" value={String(success)} tone="emerald" />
        <Stat label="Cancelled" value={String(cancelled)} tone="rose" />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "rose" }) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "rose"
        ? "text-rose-600 dark:text-rose-400"
        : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${bold ? "font-semibold" : ""} ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function AttrRow({ label, value, truncate }: { label: string; value: string | null; truncate?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={`text-right font-mono text-[11px] ${truncate ? "max-w-[180px] truncate" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}
