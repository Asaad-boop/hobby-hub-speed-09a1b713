import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Phone,
  MessageCircle,
  Plus,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Star,
  Globe,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/web-orders")({
  component: WebOrdersPage,
});

type WebOrder = {
  id: string;
  createdAt: string;
  autoCall: "pending" | "called" | "no-answer" | "off";
  customer: { name: string; phone: string; address: string };
  noteUpdatedDaysAgo: number | null;
  items: { sku: string; thumb: string; qty: number; name: string }[];
  successRate: { percent: number; orders: number; rating: number };
  tags: string[];
  site: string;
};

const DUMMY: WebOrder[] = [
  {
    id: "WO-10245",
    createdAt: "2026-04-28T09:14:00",
    autoCall: "called",
    customer: {
      name: "Rahim Uddin",
      phone: "01712345678",
      address: "House 12, Road 4, Dhanmondi, Dhaka",
    },
    noteUpdatedDaysAgo: 2,
    items: [
      { sku: "BOW-MIR-01", thumb: "https://picsum.photos/seed/p1/64", qty: 1, name: "Bow Brush" },
    ],
    successRate: { percent: 86, orders: 14, rating: 4.6 },
    tags: ["VIP"],
    site: "hobbyshopbd.com",
  },
  {
    id: "WO-10244",
    createdAt: "2026-04-28T08:42:00",
    autoCall: "pending",
    customer: {
      name: "Nusrat Jahan",
      phone: "01898765432",
      address: "Flat 3B, Gulshan Avenue, Dhaka",
    },
    noteUpdatedDaysAgo: 0,
    items: [
      { sku: "AUR-LMP-02", thumb: "https://picsum.photos/seed/p2/64", qty: 2, name: "Aurora Lamp" },
      { sku: "ORG-CMB-01", thumb: "https://picsum.photos/seed/p3/64", qty: 1, name: "Origami Combo" },
    ],
    successRate: { percent: 72, orders: 8, rating: 4.2 },
    tags: ["Repeat", "COD"],
    site: "hobbyshopbd.com",
  },
  {
    id: "WO-10243",
    createdAt: "2026-04-27T19:05:00",
    autoCall: "no-answer",
    customer: {
      name: "Tanvir Hasan",
      phone: "01611223344",
      address: "Sector 7, Uttara, Dhaka",
    },
    noteUpdatedDaysAgo: 5,
    items: [
      { sku: "BOW-MIR-01", thumb: "https://picsum.photos/seed/p4/64", qty: 1, name: "Bow Brush" },
    ],
    successRate: { percent: 45, orders: 3, rating: 3.4 },
    tags: [],
    site: "hobbyshopbd.com",
  },
  {
    id: "WO-10242",
    createdAt: "2026-04-27T15:31:00",
    autoCall: "off",
    customer: {
      name: "Sadia Akter",
      phone: "01755667788",
      address: "Mirpur 10, Dhaka",
    },
    noteUpdatedDaysAgo: 1,
    items: [
      { sku: "AUR-LMP-02", thumb: "https://picsum.photos/seed/p5/64", qty: 1, name: "Aurora Lamp" },
    ],
    successRate: { percent: 91, orders: 22, rating: 4.8 },
    tags: ["VIP", "Wholesale"],
    site: "hobbyshopbd.com",
  },
  {
    id: "WO-10241",
    createdAt: "2026-04-27T11:12:00",
    autoCall: "called",
    customer: {
      name: "Imran Hossain",
      phone: "01999887766",
      address: "Banani Road 11, Dhaka",
    },
    noteUpdatedDaysAgo: 9,
    items: [
      { sku: "ORG-CMB-01", thumb: "https://picsum.photos/seed/p6/64", qty: 3, name: "Origami Combo" },
    ],
    successRate: { percent: 60, orders: 5, rating: 3.9 },
    tags: ["New"],
    site: "hobbyshopbd.com",
  },
  {
    id: "WO-10240",
    createdAt: "2026-04-26T20:48:00",
    autoCall: "pending",
    customer: {
      name: "Fariha Rahman",
      phone: "01633445566",
      address: "Bashundhara R/A, Block C, Dhaka",
    },
    noteUpdatedDaysAgo: null,
    items: [
      { sku: "BOW-MIR-01", thumb: "https://picsum.photos/seed/p7/64", qty: 1, name: "Bow Brush" },
      { sku: "AUR-LMP-02", thumb: "https://picsum.photos/seed/p8/64", qty: 1, name: "Aurora Lamp" },
    ],
    successRate: { percent: 78, orders: 11, rating: 4.4 },
    tags: ["COD"],
    site: "hobbyshopbd.com",
  },
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}

function AutoCallBadge({ status }: { status: WebOrder["autoCall"] }) {
  const map = {
    pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    called: { label: "Called", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    "no-answer": { label: "No Answer", cls: "bg-rose-50 text-rose-700 border-rose-200" },
    off: { label: "Off", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  } as const;
  const m = map[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

function CircularProgress({ percent }: { percent: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const color =
    percent >= 80 ? "text-emerald-500" : percent >= 60 ? "text-amber-500" : "text-rose-500";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
      <circle cx="20" cy="20" r={r} strokeWidth="3" className="stroke-muted" fill="none" />
      <circle
        cx="20"
        cy="20"
        r={r}
        strokeWidth="3"
        strokeLinecap="round"
        className={`${color} transition-all`}
        stroke="currentColor"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function WebOrdersPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const total = DUMMY.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return DUMMY.slice(start, start + pageSize);
  }, [page, pageSize]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allChecked) rows.forEach((r) => next.delete(r.id));
    else rows.forEach((r) => next.add(r.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Web Orders</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All incoming orders from your storefront.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {selected.size > 0 && <span className="mr-3">{selected.size} selected</span>}
          {total} orders
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Auto Call</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Order Items</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Site</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => {
                const dt = formatDateTime(o.createdAt);
                return (
                  <TableRow key={o.id} className="align-top">
                    <TableCell className="pt-4">
                      <Checkbox
                        checked={selected.has(o.id)}
                        onCheckedChange={() => toggleOne(o.id)}
                      />
                    </TableCell>
                    <TableCell className="pt-3">
                      <div className="text-sm font-medium text-foreground">{dt.date}</div>
                      <div className="text-xs text-muted-foreground">{dt.time}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">#{o.id}</div>
                    </TableCell>
                    <TableCell className="pt-3">
                      <AutoCallBadge status={o.autoCall} />
                    </TableCell>
                    <TableCell className="pt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{o.customer.phone}</span>
                        <a
                          href={`tel:${o.customer.phone}`}
                          className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50"
                          aria-label="Call"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${o.customer.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md p-1 text-green-600 hover:bg-green-50"
                          aria-label="WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <div className="mt-0.5 text-sm text-foreground">{o.customer.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 max-w-[220px]">
                        {o.customer.address}
                      </div>
                    </TableCell>
                    <TableCell className="pt-3">
                      <span className="text-xs text-muted-foreground">
                        {o.noteUpdatedDaysAgo === null
                          ? "No notes"
                          : o.noteUpdatedDaysAgo === 0
                            ? "Updated today"
                            : `Updated ${o.noteUpdatedDaysAgo} day${o.noteUpdatedDaysAgo > 1 ? "s" : ""} ago`}
                      </span>
                    </TableCell>
                    <TableCell className="pt-3">
                      <div className="space-y-1.5">
                        {o.items.map((it) => (
                          <div key={it.sku} className="flex items-center gap-2">
                            <img
                              src={it.thumb}
                              alt={it.name}
                              className="h-9 w-9 rounded-md border object-cover"
                            />
                            <div className="min-w-0">
                              <div className="text-[11px] font-mono text-muted-foreground">
                                {it.sku}
                              </div>
                              <div className="text-xs">Qty: {it.qty}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="pt-3">
                      <div className="flex items-center gap-2">
                        <div className="relative flex h-10 w-10 items-center justify-center">
                          <CircularProgress percent={o.successRate.percent} />
                          <span className="absolute text-[10px] font-semibold">
                            {o.successRate.percent}%
                          </span>
                        </div>
                        <div className="leading-tight">
                          <div className="text-xs text-muted-foreground">
                            {o.successRate.orders} orders
                          </div>
                          <div className="flex items-center gap-0.5 text-xs">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {o.successRate.rating}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="pt-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {o.tags.map((t) => (
                          <Badge
                            key={t}
                            variant="secondary"
                            className="rounded-full text-[10px] font-medium"
                          >
                            {t}
                          </Badge>
                        ))}
                        <button className="inline-flex items-center gap-0.5 rounded-full border border-dashed px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted">
                          <Plus className="h-2.5 w-2.5" />
                          Add
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="pt-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" />
                        {o.site}
                      </div>
                    </TableCell>
                    <TableCell className="pt-3 text-right">
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                        <ExternalLink className="h-3 w-3" />
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
