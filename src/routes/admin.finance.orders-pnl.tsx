import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Wallet, Search, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatBDT } from "@/lib/finance";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/admin/finance/orders-pnl")({
  component: OrdersPnLPage,
});

type Row = {
  id: string;
  order_id: string;
  revenue: number;
  product_cost: number;
  delivery_charge: number;
  cod_charge: number;
  return_charge: number;
  packaging_cost: number;
  ads_cost_attributed: number;
  other_costs: number;
  total_costs: number | null;
  net_profit: number | null;
  profit_margin_pct: number | null;
  finalization_status: string;
  created_at: string;
  is_backfilled: boolean;
  customer_name: string | null;
  order_status: string | null;
};

async function fetchOrdersPnL(filters: {
  status?: string;
  profitFilter?: string;
  search?: string;
}): Promise<Row[]> {
  let q = supabase
    .from("order_financials")
    .select(
      "id, order_id, revenue, product_cost, delivery_charge, cod_charge, return_charge, packaging_cost, ads_cost_attributed, other_costs, total_costs, net_profit, profit_margin_pct, finalization_status, created_at, is_backfilled, orders:order_id(shipping_name, status)"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters.status && filters.status !== "all") {
    q = q.eq("finalization_status", filters.status as never);
  }

  const { data, error } = await q;
  if (error) throw error;

  let rows: Row[] = (data ?? []).map((r: any) => ({
    id: r.id,
    order_id: r.order_id,
    revenue: Number(r.revenue ?? 0),
    product_cost: Number(r.product_cost ?? 0),
    delivery_charge: Number(r.delivery_charge ?? 0),
    cod_charge: Number(r.cod_charge ?? 0),
    return_charge: Number(r.return_charge ?? 0),
    packaging_cost: Number(r.packaging_cost ?? 0),
    ads_cost_attributed: Number(r.ads_cost_attributed ?? 0),
    other_costs: Number(r.other_costs ?? 0),
    total_costs: r.total_costs == null ? null : Number(r.total_costs),
    net_profit: r.net_profit == null ? null : Number(r.net_profit),
    profit_margin_pct: r.profit_margin_pct == null ? null : Number(r.profit_margin_pct),
    finalization_status: r.finalization_status,
    created_at: r.created_at,
    is_backfilled: !!r.is_backfilled,
    customer_name: r.orders?.shipping_name ?? null,
    order_status: r.orders?.status ?? null,
  }));

  if (filters.profitFilter === "profit") rows = rows.filter((r) => (r.net_profit ?? 0) > 0);
  else if (filters.profitFilter === "loss") rows = rows.filter((r) => (r.net_profit ?? 0) < 0);
  else if (filters.profitFilter === "high_margin") rows = rows.filter((r) => (r.profit_margin_pct ?? 0) >= 30);

  if (filters.search) {
    const s = filters.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.order_id.toLowerCase().includes(s) ||
        (r.customer_name?.toLowerCase().includes(s) ?? false)
    );
  }

  return rows;
}

type LineItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  unit_cost: number;
  variant_label: string | null;
  image: string | null;
};

async function fetchOrderLineItems(orderId: string): Promise<LineItem[]> {
  const { data: items, error } = await supabase
    .from("order_items")
    .select("id, name, quantity, price, variant_label, image, product_id")
    .eq("order_id", orderId);
  if (error) throw error;
  const productIds = [...new Set((items ?? []).map((i) => i.product_id).filter(Boolean))];
  let costMap = new Map<string, number>();
  if (productIds.length > 0) {
    const { data: prods } = await supabase
      .from("products")
      .select("id, unit_cost")
      .in("id", productIds as string[]);
    costMap = new Map((prods ?? []).map((p) => [p.id, Number(p.unit_cost ?? 0)]));
  }
  return (items ?? []).map((i: any) => ({
    id: i.id,
    name: i.name,
    quantity: i.quantity,
    price: Number(i.price ?? 0),
    unit_cost: costMap.get(i.product_id) ?? 0,
    variant_label: i.variant_label,
    image: i.image,
  }));
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  delivered: "bg-green-500/15 text-green-700 dark:text-green-400",
  partial_delivered: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  returned: "bg-red-500/15 text-red-700 dark:text-red-400",
  exchanged: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  damaged: "bg-red-500/15 text-red-700 dark:text-red-400",
  settled: "bg-primary/15 text-primary",
};

function OrdersPnLPage() {
  const [status, setStatus] = useState("all");
  const [profitFilter, setProfitFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [openRow, setOpenRow] = useState<Row | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["orders-pnl", status, profitFilter, search],
    queryFn: () => fetchOrdersPnL({ status, profitFilter, search }),
  });

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.revenue += r.revenue;
        acc.costs += r.total_costs ?? 0;
        acc.profit += r.net_profit ?? 0;
        return acc;
      },
      { revenue: 0, costs: 0, profit: 0 }
    );
  }, [rows]);

  const avgMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Orders P&amp;L</h1>
        <p className="text-sm text-muted-foreground">
          Per-order profit &amp; loss with drill-down into line items, costs, and ad attribution.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <KpiCard label="Orders" value={String(rows.length)} icon={Wallet} />
        <KpiCard label="Revenue" value={formatBDT(totals.revenue)} icon={TrendingUp} tone="positive" />
        <KpiCard label="Total costs" value={formatBDT(totals.costs)} icon={TrendingDown} tone="negative" />
        <KpiCard
          label="Net profit"
          value={`${formatBDT(totals.profit)} · ${avgMargin.toFixed(1)}%`}
          icon={TrendingUp}
          tone={totals.profit >= 0 ? "positive" : "negative"}
          accent
        />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by order ID or customer"
                className="pl-8"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="partial_delivered">Partial delivered</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="exchanged">Exchanged</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={profitFilter} onValueChange={setProfitFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All P&amp;L</SelectItem>
                <SelectItem value="profit">Profitable only</SelectItem>
                <SelectItem value="loss">Loss-making only</SelectItem>
                <SelectItem value="high_margin">High margin (≥30%)</SelectItem>
              </SelectContent>
            </Select>
            {(search || status !== "all" || profitFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(""); setStatus("all"); setProfitFilter("all"); }}
              >
                <X className="mr-1 h-3 w-3" /> Clear
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">COGS</TableHead>
                  <TableHead className="text-right">Courier</TableHead>
                  <TableHead className="text-right">Ads</TableHead>
                  <TableHead className="text-right">Net profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                      No orders match the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const courier = r.delivery_charge + r.cod_charge + r.return_charge;
                    const profit = r.net_profit ?? 0;
                    const margin = r.profit_margin_pct ?? 0;
                    return (
                      <TableRow
                        key={r.id}
                        onClick={() => setOpenRow(r)}
                        className="cursor-pointer"
                      >
                        <TableCell className="text-xs">
                          {format(new Date(r.created_at), "dd MMM")}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.order_id.slice(0, 8)}</TableCell>
                        <TableCell className="max-w-[160px] truncate">{r.customer_name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLORS[r.finalization_status] ?? ""}>
                            {r.finalization_status.replace("_", " ")}
                          </Badge>
                          {r.is_backfilled && <Badge variant="outline" className="ml-1 text-[10px]">backfill</Badge>}
                        </TableCell>
                        <TableCell className="text-right">{formatBDT(r.revenue)}</TableCell>
                        <TableCell className="text-right text-red-600">−{formatBDT(r.product_cost)}</TableCell>
                        <TableCell className="text-right text-red-600">−{formatBDT(courier)}</TableCell>
                        <TableCell className="text-right text-red-600">−{formatBDT(r.ads_cost_attributed)}</TableCell>
                        <TableCell className={`text-right font-semibold ${profit > 0 ? "text-green-600" : profit < 0 ? "text-red-600" : ""}`}>
                          {formatBDT(profit, { sign: true })}
                        </TableCell>
                        <TableCell className={`text-right ${margin > 0 ? "text-green-600" : margin < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                          {margin.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PnLDrawer row={openRow} onClose={() => setOpenRow(null)} />
    </div>
  );
}

function KpiCard({
  label, value, icon: Icon, tone, accent,
}: {
  label: string; value: string; icon: typeof Wallet;
  tone?: "positive" | "negative"; accent?: boolean;
}) {
  const toneClass =
    tone === "positive" ? "text-green-600" : tone === "negative" ? "text-red-600" : "";
  return (
    <Card className={accent ? "border-primary/40" : ""}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-md p-2 ${accent ? "bg-primary/10 text-primary" : "bg-muted"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-lg font-semibold ${toneClass}`}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PnLDrawer({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["order-line-items", row?.order_id],
    queryFn: () => fetchOrderLineItems(row!.order_id),
    enabled: !!row,
  });

  if (!row) return null;
  const courier = row.delivery_charge + row.cod_charge + row.return_charge;
  const profit = row.net_profit ?? 0;
  const margin = row.profit_margin_pct ?? 0;

  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Order P&amp;L · #{row.order_id.slice(0, 8)}</SheetTitle>
          <SheetDescription>
            {row.customer_name ?? "—"} · {format(new Date(row.created_at), "dd MMM yyyy")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Revenue" value={formatBDT(row.revenue)} tone="positive" />
                <Stat label="Net profit" value={formatBDT(profit, { sign: true })} tone={profit >= 0 ? "positive" : "negative"} bold />
                <Stat label="Total costs" value={formatBDT(row.total_costs ?? 0)} tone="negative" />
                <Stat label="Margin" value={`${margin.toFixed(1)}%`} tone={margin >= 0 ? "positive" : "negative"} />
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Cost breakdown</h3>
            <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
              <CostRow label="Product cost (COGS)" value={row.product_cost} />
              <CostRow label="Courier delivery" value={row.delivery_charge} />
              <CostRow label="COD charge" value={row.cod_charge} />
              <CostRow label="Return charge" value={row.return_charge} />
              <CostRow label="Packaging" value={row.packaging_cost} />
              <CostRow label="Ads attributed" value={row.ads_cost_attributed} />
              <CostRow label="Other" value={row.other_costs} />
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total costs</span>
                <span className="text-red-600">−{formatBDT(row.total_costs ?? 0)}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Line items</h3>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Sell</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">GP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                        No line items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((it) => {
                      const lineRev = it.price * it.quantity;
                      const lineCost = it.unit_cost * it.quantity;
                      const lineGp = lineRev - lineCost;
                      return (
                        <TableRow key={it.id}>
                          <TableCell>
                            <div className="font-medium">{it.name}</div>
                            {it.variant_label && (
                              <div className="text-xs text-muted-foreground">{it.variant_label}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{it.quantity}</TableCell>
                          <TableCell className="text-right">{formatBDT(lineRev)}</TableCell>
                          <TableCell className="text-right text-red-600">−{formatBDT(lineCost)}</TableCell>
                          <TableCell className={`text-right font-medium ${lineGp >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatBDT(lineGp, { sign: true })}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {items.some((i) => i.unit_cost === 0) && (
              <p className="mt-2 text-xs text-amber-600">
                Some line items have ৳0 unit cost — set <code>unit_cost</code> on those products for accurate COGS.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value, tone, bold }: { label: string; value: string; tone?: "positive" | "negative"; bold?: boolean }) {
  const toneClass = tone === "positive" ? "text-green-600" : tone === "negative" ? "text-red-600" : "";
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`${bold ? "text-base font-bold" : "font-medium"} ${toneClass}`}>{value}</div>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={value > 0 ? "text-red-600" : ""}>{value > 0 ? `−${formatBDT(value)}` : formatBDT(0)}</span>
    </div>
  );
}
