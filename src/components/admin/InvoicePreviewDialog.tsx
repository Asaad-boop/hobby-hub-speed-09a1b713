import { useEffect, useMemo, useRef, useState } from "react";
import { Printer, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/lib/site-settings";
import { Button } from "@/components/ui/button";

type Order = {
  id: string;
  created_at: string;
  status: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_district: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  subtotal: number | null;
  shipping_fee: number | null;
  discount_amount: number | null;
  total: number | null;
  payment_method: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  delivery_method: string | null;
};

type Item = {
  id: string;
  name: string;
  variant_label: string | null;
  price: number;
  quantity: number;
  product_id: string | null;
};

function shortInvoiceId(id: string) {
  // ORD-XXXXXXXX style
  return "ORD-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function fmtDate(s: string) {
  const d = new Date(s);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function numberToWords(n: number): string {
  if (!isFinite(n)) return "";
  n = Math.round(n);
  if (n === 0) return "Zero";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  function below1000(num: number): string {
    let s = "";
    if (num >= 100) {
      s += ones[Math.floor(num / 100)] + " Hundred";
      num %= 100;
      if (num) s += " And ";
    }
    if (num >= 20) {
      s += tens[Math.floor(num / 10)];
      if (num % 10) s += "-" + ones[num % 10];
    } else if (num > 0) {
      s += ones[num];
    }
    return s;
  }
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(below1000(crore) + " Crore");
  if (lakh) parts.push(below1000(lakh) + " Lakh");
  if (thousand) parts.push(below1000(thousand) + " Thousand");
  if (n) parts.push(below1000(n));
  return parts.join(", ");
}

// Simple Code128-ish barcode using CSS bars derived from the invoice id.
// (Visual barcode — sufficient for printed invoice; not scannable spec.)
function BarcodeStrip({ value }: { value: string }) {
  const bars = useMemo(() => {
    const out: { w: number; black: boolean }[] = [];
    let seed = 0;
    for (let i = 0; i < value.length; i++) seed = (seed * 31 + value.charCodeAt(i)) >>> 0;
    let x = seed;
    for (let i = 0; i < 70; i++) {
      x = (x * 1103515245 + 12345) >>> 0;
      const w = 1 + (x % 4); // 1..4
      out.push({ w, black: i % 2 === 0 });
    }
    return out;
  }, [value]);
  return (
    <div className="flex h-14 items-stretch gap-px">
      {bars.map((b, i) => (
        <div
          key={i}
          style={{ width: `${b.w * 2}px`, background: b.black ? "#000" : "transparent" }}
        />
      ))}
    </div>
  );
}

export function InvoicePreviewDialog({
  orderId,
  open,
  onClose,
}: {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: settings } = useSiteSettings();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !orderId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [oRes, iRes] = await Promise.all([
          supabase.from("orders").select("*").eq("id", orderId).single(),
          supabase.from("order_items").select("*").eq("order_id", orderId),
        ]);
        if (cancelled) return;
        if (oRes.error) throw oRes.error;
        setOrder(oRes.data as Order);
        const its = (iRes.data ?? []) as Item[];
        setItems(its);
        const pids = its.map((x) => x.product_id).filter(Boolean) as string[];
        if (pids.length) {
          const { data: prods } = await supabase
            .from("products")
            .select("id,images")
            .in("id", pids);
          if (!cancelled && prods) {
            const map: Record<string, string> = {};
            for (const p of prods as unknown as { id: string; images: string[] | null }[]) {
              const first = p.images?.[0];
              if (first) map[p.id] = first;
            }
            setProductImages(map);
          }
        } else {
          setProductImages({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, orderId]);

  function handlePrint() {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const w = window.open("", "_blank", "width=720,height=1000");
    if (!w) return;
    w.document.write(`<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Invoice ${order ? shortInvoiceId(order.id) : ""}</title>
<style>
  @page { size: A5; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Bengali", "Hind Siliguri", Roboto, sans-serif; color:#111; font-size: 10px; line-height: 1.35; }
  .invoice { width: 100%; }
  img { max-width: 100%; }
  table { width: 100%; border-collapse: collapse; }
  .row-flex { display:flex; }
  .row-between { display:flex; justify-content:space-between; align-items:flex-start; }
  .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .grid-meta { display:grid; grid-template-columns:90px 1fr; gap:4px 8px; }
  .border-top-bold { border-top:1.5px solid #000; }
  .border-top { border-top:1px solid #000; }
  .border-b-soft { border-bottom:1px solid #eee; }
  .muted { color:#666; }
  .uppercase { text-transform:uppercase; letter-spacing:.05em; }
  .title-invoice { font-size:22px; font-weight:800; margin:0; }
  .brand-name { font-size:16px; font-weight:800; line-height:1; }
  .brand-tag { font-size:9px; font-style:italic; color:#777; }
  .logo-circle { width:34px; height:34px; border-radius:50%; background:#e11d48; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:16px; }
  .logo-img { width:34px; height:34px; object-fit:contain; }
  .name-big { font-size:14px; font-weight:800; text-transform:uppercase; margin-top:2px; }
  .phone-big { font-size:12px; font-weight:600; letter-spacing:.05em; margin-top:2px; }
  .barcode-strip { display:flex; height:42px; align-items:stretch; gap:1px; }
  .barcode-strip > div { display:inline-block; }
  .barcode-label { text-align:center; font-size:9px; letter-spacing:.15em; margin-top:2px; }
  .meta-k { color:#555; }
  .b { font-weight:700; }
  .payable { font-size:13px; font-weight:800; }
  thead th { text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:.05em; color:#555; padding:5px 4px; border-bottom:1px solid rgba(0,0,0,.3); }
  tbody td { padding:6px 4px; border-bottom:1px solid #f0f0f0; vertical-align:middle; }
  td.center, th.center { text-align:center; }
  td.right, th.right { text-align:right; }
  .item-img { width:24px; height:24px; object-fit:cover; border-radius:3px; margin-right:6px; vertical-align:middle; }
  .totals { font-size:10px; }
  .totals .line { display:flex; justify-content:space-between; padding:1px 0; }
  .totals .total-line { display:flex; justify-content:space-between; align-items:center; padding-top:4px; }
  .totals .grand { font-size:14px; font-weight:800; }
  .rider-box { margin-top:10px; border:1px dashed #f87171; background:#fef2f230; padding:6px 8px; border-radius:4px; }
  .rider-title { color:#dc2626; font-weight:700; font-size:10px; }
  .feedback-grid { margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .feedback-card { border:1px solid #a7f3d0; background:#ecfdf520; border-radius:4px; padding:6px 8px; }
  .feedback-card .h { font-weight:700; font-size:11px; }
  .feedback-card .s { color:#666; font-size:9px; }
  .footer-row { margin-top:10px; display:flex; justify-content:space-between; align-items:flex-start; font-size:9px; }
  .terms { margin-top:6px; padding-left:14px; font-size:8.5px; line-height:1.35; color:#444; }
  .conf { margin-top:8px; text-align:center; font-style:italic; font-size:8px; color:#777; }
  .copyright { text-align:center; font-size:8px; color:#777; }
  .note-row { margin-top:6px; display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:flex-start; font-size:10px; }
  .pad-top { padding-top:8px; }
  .gap-3 { gap:8px; }
  .items-center { align-items:center; }
  .tabular { font-variant-numeric: tabular-nums; }
  /* hide on-screen-only utility classes from React (none expected, but be safe) */
</style>
</head><body><div class="invoice">${printContents}</div>
<script>window.onload=()=>{window.focus();window.print();setTimeout(()=>window.close(),300);}</script>
</body></html>`);
    w.document.close();
  }

  if (!open) return null;

  const invoiceId = order ? shortInvoiceId(order.id) : "—";
  const name = order?.shipping_name ?? order?.guest_name ?? "—";
  const phone = order?.shipping_phone ?? order?.guest_phone ?? "—";
  const addr = [order?.shipping_address, order?.shipping_city, order?.shipping_district]
    .filter(Boolean)
    .join(", ");
  const subtotal = Number(order?.subtotal ?? 0);
  const shipping = Number(order?.shipping_fee ?? 0);
  const discount = Number(order?.discount_amount ?? 0);
  const total = Number(order?.total ?? 0);
  const itemCount = items.reduce((s, it) => s + (it.quantity || 0), 0);
  const paymentLabel =
    (order?.payment_method ?? "cod").toLowerCase() === "cod"
      ? "Cash On Delivery"
      : (order?.payment_method ?? "").toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-full max-h-[95vh] w-full max-w-[900px] flex-col overflow-hidden rounded-lg bg-background shadow-xl">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="text-sm font-semibold">Invoice Preview</div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} disabled={loading || !order}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto bg-muted/30 p-6">
          {loading || !order ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div
              ref={printRef}
              className="mx-auto w-full max-w-[760px] bg-white p-8 text-[13px] text-black shadow-sm"
              style={{ fontFamily: '-apple-system, "Segoe UI", "Noto Sans Bengali", Roboto, sans-serif' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3">
                <div className="flex items-center gap-3">
                  {settings?.logo_url ? (
                    <img
                      src={settings.logo_url}
                      alt="logo"
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-xl font-bold text-white">
                      H
                    </div>
                  )}
                  <div>
                    <div className="text-2xl font-extrabold leading-tight">
                      {settings?.site_title ?? "HobbyShop"}
                    </div>
                    <div className="text-xs italic text-gray-500">
                      {settings?.site_tagline ?? "Touch Your Dream"}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold">HQ</div>
                  <div className="text-gray-600">{settings?.address ?? "Company Address"}</div>
                  <div className="text-gray-600">
                    Hotline: {settings?.contact_phone ?? "09638779900"}
                  </div>
                </div>
              </div>
              <div className="border-t-2 border-black" />

              {/* Body header */}
              <div className="grid grid-cols-2 gap-6 pt-4">
                {/* Delivery address + barcode */}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Delivery Address
                  </div>
                  <div className="mt-1 text-xl font-bold uppercase">{name}</div>
                  <div className="text-sm text-gray-700">{addr || "—"}</div>
                  <div className="mt-1 text-base font-semibold tracking-wider">{phone}</div>
                  <div className="mt-4">
                    <BarcodeStrip value={invoiceId} />
                    <div className="mt-1 text-center text-[11px] tracking-widest">
                      {invoiceId}
                    </div>
                  </div>
                </div>

                {/* Invoice meta */}
                <div>
                  <div className="text-3xl font-extrabold">Invoice</div>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <Row k="Invoice ID:" v={<b>{invoiceId}</b>} />
                    <Row k="Date:" v={<b>{fmtDate(order.created_at)}</b>} />
                    <Row k="Item Count:" v={<b>{itemCount}</b>} />
                    <Row k="Payment:" v={<b>{paymentLabel}</b>} />
                    <Row
                      k="Payable:"
                      v={<span className="text-lg font-extrabold">BDT {total.toFixed(1)}</span>}
                    />
                    <Row k="Delivery Partner:" v={<span>{order.courier_name || "—"}</span>} />
                    <Row k="Tracking ID:" v={<span>{order.tracking_number || "—"}</span>} />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="mt-6 border-t-2 border-black">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/30 text-left text-[11px] uppercase tracking-wide text-gray-600">
                      <th className="py-2 w-8">#</th>
                      <th className="py-2">Title</th>
                      <th className="py-2 text-center w-16">Type</th>
                      <th className="py-2 text-center w-16">Size</th>
                      <th className="py-2 text-right w-20">Price</th>
                      <th className="py-2 text-center w-12">Qty</th>
                      <th className="py-2 text-right w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => {
                      const img = it.product_id ? productImages[it.product_id] : undefined;
                      const lineTotal = Number(it.price) * Number(it.quantity);
                      return (
                        <tr key={it.id} className="border-b border-gray-100 align-middle">
                          <td className="py-3">{i + 1}.</td>
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2">
                              {img && (
                                <img
                                  src={img}
                                  alt=""
                                  className="h-10 w-10 rounded object-cover"
                                />
                              )}
                              <span>{it.name}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center text-gray-500">
                            {it.variant_label ?? ""}
                          </td>
                          <td className="py-3 text-center text-gray-500"></td>
                          <td className="py-3 text-right tabular-nums">
                            {Number(it.price).toFixed(1)}
                          </td>
                          <td className="py-3 text-center">{it.quantity}</td>
                          <td className="py-3 text-right tabular-nums">{lineTotal.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Note + totals */}
              <div className="mt-3 grid grid-cols-2 gap-6">
                <div className="text-sm">
                  <span className="mr-1">📝</span>
                  <span className="font-semibold">Note: </span>
                  <span>
                    🛡️ মার্চেন্টের অনুমতি ছাড়া প্রোডাক্ট খোলা সম্পূর্ণ নিষিদ্ধ। খোলা পণ্য
                    গ্রহণযোগ্য নয়।
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Sub Total:</span>
                    <span className="tabular-nums">BDT {subtotal.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Fee(+):</span>
                    <span className="tabular-nums">BDT {shipping.toFixed(1)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between">
                      <span>Discount(-):</span>
                      <span className="tabular-nums">BDT {discount.toFixed(1)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-extrabold">Total:</span>
                    <span className="text-lg font-extrabold tabular-nums">
                      BDT {total.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    <span className="font-semibold">In Words: </span>
                    {numberToWords(total)} Tk Only
                  </div>
                </div>
              </div>

              {/* Rider note */}
              <div className="mt-5 rounded border border-dashed border-red-400 bg-red-50/40 p-3 text-sm">
                <div className="font-semibold text-red-600">
                  🚫 Note for Rider / রাইডারের জন্য নির্দেশনা:
                </div>
                <div className="mt-1 text-gray-800">
                  মার্চেন্টের অনুমতি ছাড়া প্রোডাক্ট খোলা সম্পূর্ণ নিষিদ্ধ, খুলে দেখতে চাইলে আগে
                  কল করুন: {settings?.contact_phone ?? "09638779900"}
                </div>
                <div className="text-gray-800">
                  WhatsApp: +{settings?.whatsapp_number ?? "8801964437520"}
                </div>
              </div>

              {/* Feedback / social */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded border border-emerald-200 bg-emerald-50/30 p-3">
                  <div className="text-base font-bold">আমাদের মতামত দিন</div>
                  <div className="text-xs text-gray-600">
                    আপনার মতামত আমাদের আরো ভালো করতে সাহায্য করে
                  </div>
                </div>
                <div className="rounded border border-emerald-200 bg-emerald-50/30 p-3">
                  <div className="text-base font-bold">আমাদের সাথে থাকুন</div>
                  <div className="text-xs text-gray-600">
                    আমাদের গ্রুপে যোগ দিন, পান এক্সক্লুসিভ অফার!
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 flex items-start justify-between text-xs">
                <div className="font-bold">THANK YOU FOR CHOOSING US</div>
                <div className="text-right">
                  <div>
                    VISIT:{" "}
                    <span className="font-semibold">
                      https://{(settings?.site_title ?? "hobbyshop").toLowerCase()}bd.shop/
                    </span>
                  </div>
                  <div>
                    SUPPORT: <span className="font-semibold">{settings?.contact_phone ?? "09638779900"}</span>
                  </div>
                </div>
              </div>

              <ol className="mt-3 list-decimal pl-5 text-[11px] leading-snug text-gray-700">
                <li>
                  If any defect is found (damaged/defective/wrong product) after opening the box,
                  inform us immediately with picture/video proof.
                </li>
                <li>Return process must be initiated within 3 days of receiving the parcel.</li>
                <li>Product must be in original condition with all tags and packaging.</li>
                <li>Exchange delivery cost may be applicable.</li>
                <li>Promotional offers are not applicable for returned products.</li>
              </ol>

              <div className="mt-4 text-center text-[10px] italic text-gray-500">
                This document &amp; any information transmitted with it are confidential &amp;
                intended solely for the use of the individual or entity to whom they are addressed.
              </div>
              <div className="text-center text-[10px] text-gray-500">
                © {new Date().getFullYear()} {settings?.site_title ?? "HobbyShop"}. All Rights
                Reserved
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-2">
      <div className="text-gray-600">{k}</div>
      <div>{v}</div>
    </div>
  );
}
