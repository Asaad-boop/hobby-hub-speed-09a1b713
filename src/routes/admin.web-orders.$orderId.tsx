import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  AlertTriangle,
  Smartphone,
  StickyNote,
  Send,
  Tag,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/web-orders/$orderId")({
  component: WebOrderDetailPage,
});

type CourierKey = "overall" | "pathao" | "redx" | "steadfast";

const COURIERS: { key: CourierKey; label: string; color: string }[] = [
  { key: "overall", label: "Overall", color: "bg-slate-500" },
  { key: "pathao", label: "Pathao", color: "bg-emerald-500" },
  { key: "redx", label: "RedX", color: "bg-rose-500" },
  { key: "steadfast", label: "Steadfast", color: "bg-indigo-500" },
];

function CourierCard({ label, color }: { label: string; color: string }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">—</span>
        </div>
        <div className="mb-2 flex items-baseline gap-1">
          <span className="text-2xl font-semibold tabular-nums">0</span>
          <span className="text-sm text-muted-foreground">%</span>
          <span className="ml-auto text-xs text-muted-foreground">Success Rate</span>
        </div>
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${color}`} style={{ width: "0%" }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="font-semibold tabular-nums">0</div>
            <div className="text-muted-foreground">Total</div>
          </div>
          <div>
            <div className="font-semibold tabular-nums text-emerald-600">0</div>
            <div className="text-muted-foreground">Success</div>
          </div>
          <div>
            <div className="font-semibold tabular-nums text-rose-600">0</div>
            <div className="text-muted-foreground">Cancelled</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-sm font-semibold text-foreground">{children}</h3>;
}

function WebOrderDetailPage() {
  const { orderId } = Route.useParams();
  const [shippingNote, setShippingNote] = useState("");
  const [preorder, setPreorder] = useState(false);
  const [crossSale, setCrossSale] = useState(false);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b bg-background">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <Button asChild size="icon" variant="ghost" className="h-8 w-8">
            <Link to="/admin/web-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-base font-semibold leading-tight">Web Order Details</h1>
            <p className="text-xs text-muted-foreground">#{orderId}</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <div className="flex flex-col items-end leading-tight">
              <span>Created: —</span>
              <span>Updated: —</span>
            </div>
            <Badge variant="secondary" className="rounded-full">Status: —</Badge>
            <Badge variant="outline" className="rounded-full">Source: —</Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 md:px-6">
        {/* Courier performance */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COURIERS.map((c) => (
            <CourierCard key={c.key} label={c.label} color={c.color} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* Main */}
          <div className="space-y-4 xl:col-span-8">
            {/* Customer */}
            <Card className="shadow-none">
              <CardContent className="space-y-4 p-5">
                <SectionTitle>Customer</SectionTitle>
                <div>
                  <Label className="text-xs">Mobile Number</Label>
                  <div className="mt-1 flex gap-2">
                    <Input placeholder="" className="flex-1" />
                    <Button size="icon" variant="outline" className="h-9 w-9">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-9 w-9 text-emerald-600">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Address</Label>
                  <Textarea className="mt-1 min-h-[60px]" />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <Label className="text-xs">City</Label>
                    <Select>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select City" /></SelectTrigger>
                      <SelectContent />
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Zone</Label>
                    <Select>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select Zone" /></SelectTrigger>
                      <SelectContent />
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Area</Label>
                    <Select>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select Area" /></SelectTrigger>
                      <SelectContent />
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Shipping Note</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {shippingNote.length}/250
                    </span>
                  </div>
                  <Textarea
                    maxLength={250}
                    value={shippingNote}
                    onChange={(e) => setShippingNote(e.target.value)}
                    className="mt-1 min-h-[60px]"
                  />
                </div>

                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Switch id="preorder" checked={preorder} onCheckedChange={setPreorder} />
                    <Label htmlFor="preorder" className="text-sm">Preorder</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="crosssale" checked={crossSale} onCheckedChange={setCrossSale} />
                    <Label htmlFor="crosssale" className="text-sm">Cross Sale</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ordered products + add panel */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <Card className="shadow-none lg:col-span-3">
                <CardContent className="space-y-4 p-5">
                  <SectionTitle>Ordered Products</SectionTitle>
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No products added yet.
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Discount</Label>
                      <Input className="h-8 w-32 text-right" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Advance</Label>
                      <Input className="h-8 w-32 text-right" />
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Sub Total</span>
                      <span className="tabular-nums">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Delivery Charge</Label>
                      <Input className="h-8 w-32 text-right" />
                    </div>
                    <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                      <span>Grand Total</span>
                      <span className="tabular-nums">0</span>
                    </div>
                  </div>

                  <p className="hidden items-center gap-1.5 text-xs text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Warning placeholder</span>
                  </p>

                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                    Create Order
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-none lg:col-span-2">
                <CardContent className="space-y-3 p-5">
                  <SectionTitle>Click To Add Products</SectionTitle>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="SKU" className="h-8 pl-7 text-xs" />
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Name" className="h-8 pl-7 text-xs" />
                    </div>
                  </div>
                  <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-md border bg-muted/20 p-2">
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      No products to display.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4 xl:col-span-4">
            <Card className="shadow-none">
              <CardContent className="space-y-3 p-5">
                <SectionTitle>Order Summary</SectionTitle>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Mobile:</span>
                  <span>—</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Device:</span>
                  <span>—</span>
                </div>
                <Separator />
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Order Items</div>
                  <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No items.
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-md border border-pink-200 bg-pink-50 p-3 text-xs text-pink-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Some products are not synced yet.</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <SectionTitle>Order Tags</SectionTitle>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground">No tags.</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardContent className="space-y-3 p-5">
                <SectionTitle>Order Actions</SectionTitle>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="incomplete">Incomplete</SelectItem>
                    <SelectItem value="no_response">No Response</SelectItem>
                    <SelectItem value="advance_payment">Advance Payment</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="cancel">Cancel</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full">Update</Button>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <SectionTitle>Notes</SectionTitle>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                    <Plus className="h-3 w-3" /> Add Note
                  </Button>
                </div>
                <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                  <StickyNote className="mx-auto mb-1 h-4 w-4" />
                  No notes yet.
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardContent className="space-y-2 p-5">
                <SectionTitle>SMS</SectionTitle>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Send className="h-4 w-4" /> Send Reminder SMS
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Send className="h-4 w-4" /> Send Advance SMS
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardContent className="space-y-2 p-5 text-sm">
                <SectionTitle>Attribution</SectionTitle>
                {[
                  ["Facebook Source", "—"],
                  ["Meta Ad Account", "—"],
                  ["Pixel Click ID", "—"],
                  ["Session Device", "—"],
                  ["Entry URL", "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="max-w-[60%] truncate text-right">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardContent className="space-y-3 p-5">
                <SectionTitle>
                  <span className="inline-flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> Activity Log
                  </span>
                </SectionTitle>
                <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                  No activity yet.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
