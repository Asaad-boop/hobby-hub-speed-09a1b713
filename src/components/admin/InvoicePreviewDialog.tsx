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
              style={{
                width: "148mm",
                minHeight: "210mm",
                margin: "0 auto",
                background: "#fff",
                color: "#000",
                padding: "8mm",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Bengali", "Hind Siliguri", Roboto, sans-serif',
                fontSize: "10px",
                lineHeight: 1.35,
                boxShadow: "0 2px 12px rgba(0,0,0,.08)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {settings?.logo_url ? (
                    <img src={settings.logo_url} alt="logo" style={{ width: 34, height: 34, objectFit: "contain" }} />
                  ) : (
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#e11d48", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>
                      H
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>
                      {settings?.site_title ?? "HobbyShop"}
                    </div>
                    <div style={{ fontSize: 9, fontStyle: "italic", color: "#777" }}>
                      {settings?.site_tagline ?? "Touch Your Dream"}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 9 }}>
                  <div style={{ fontWeight: 700 }}>HQ</div>
                  <div style={{ color: "#666" }}>{settings?.address ?? "Company Address"}</div>
                  <div style={{ color: "#666" }}>Hotline: {settings?.contact_phone ?? "09638779900"}</div>
                </div>
              </div>
              <div style={{ borderTop: "1.5px solid #000" }} />

              {/* Body header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, paddingTop: 8 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "#666" }}>
                    Delivery Address
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", marginTop: 2 }}>{name}</div>
                  <div style={{ fontSize: 10, color: "#444" }}>{addr || "—"}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".05em", marginTop: 2 }}>{phone}</div>
                  <div style={{ marginTop: 8 }}>
                    <BarcodeStrip value={invoiceId} />
                    <div style={{ textAlign: "center", fontSize: 9, letterSpacing: ".15em", marginTop: 2 }}>
                      {invoiceId}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>Invoice</div>
                  <div style={{ marginTop: 6, display: "grid", rowGap: 3, fontSize: 10 }}>
                    <Row k="Invoice ID:" v={<b>{invoiceId}</b>} />
                    <Row k="Date:" v={<b>{fmtDate(order.created_at)}</b>} />
                    <Row k="Item Count:" v={<b>{itemCount}</b>} />
                    <Row k="Payment:" v={<b>{paymentLabel}</b>} />
                    <Row
                      k="Payable:"
                      v={<span style={{ fontSize: 13, fontWeight: 800 }}>BDT {total.toFixed(1)}</span>}
                    />
                    <Row k="Delivery Partner:" v={<span>{order.courier_name || "—"}</span>} />
                    <Row k="Tracking ID:" v={<span>{order.tracking_number || "—"}</span>} />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div style={{ marginTop: 10, borderTop: "1.5px solid #000" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(0,0,0,.3)", color: "#555" }}>
                      <th style={th(20)}>#</th>
                      <th style={th()}>Title</th>
                      <th style={{ ...th(40), textAlign: "center" }}>Type</th>
                      <th style={{ ...th(40), textAlign: "center" }}>Size</th>
                      <th style={{ ...th(50), textAlign: "right" }}>Price</th>
                      <th style={{ ...th(30), textAlign: "center" }}>Qty</th>
                      <th style={{ ...th(55), textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => {
                      const img = it.product_id ? productImages[it.product_id] : undefined;
                      const lineTotal = Number(it.price) * Number(it.quantity);
                      return (
                        <tr key={it.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                          <td style={td()}>{i + 1}.</td>
                          <td style={{ ...td(), paddingRight: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {img && (
                                <img src={img} alt="" style={{ width: 24, height: 24, objectFit: "cover", borderRadius: 3 }} />
                              )}
                              <span>{it.name}</span>
                            </div>
                          </td>
                          <td style={{ ...td(), textAlign: "center", color: "#777" }}>{it.variant_label ?? ""}</td>
                          <td style={{ ...td(), textAlign: "center", color: "#777" }}></td>
                          <td style={{ ...td(), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            {Number(it.price).toFixed(1)}
                          </td>
                          <td style={{ ...td(), textAlign: "center" }}>{it.quantity}</td>
                          <td style={{ ...td(), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            {lineTotal.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Note + totals */}
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ fontSize: 10 }}>
                  <span style={{ marginRight: 3 }}>📝</span>
                  <span style={{ fontWeight: 600 }}>Note: </span>
                  <span>🛡️ মার্চেন্টের অনুমতি ছাড়া প্রোডাক্ট খোলা সম্পূর্ণ নিষিদ্ধ। খোলা পণ্য গ্রহণযোগ্য নয়।</span>
                </div>
                <div style={{ fontSize: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
                    <span>Sub Total:</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>BDT {subtotal.toFixed(1)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
                    <span>Shipping Fee(+):</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>BDT {shipping.toFixed(1)}</span>
                  </div>
                  {discount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
                      <span>Discount(-):</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>BDT {discount.toFixed(1)}</span>
                    </div>
                  )}
                  <div style={{ borderTop: "1px solid #d1d5db", marginTop: 4, paddingTop: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>Total:</span>
                      <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                        BDT {total.toFixed(1)}
                      </span>
                    </div>
                    <div style={{ fontSize: 9, color: "#555", marginTop: 2 }}>
                      <span style={{ fontWeight: 600 }}>In Words: </span>
                      {numberToWords(total)} Tk Only
                    </div>
                  </div>
                </div>
              </div>

              {/* Rider note */}
              <div style={{ marginTop: 10, border: "1px dashed #f87171", background: "rgba(254,242,242,.4)", padding: "6px 8px", borderRadius: 4, fontSize: 10 }}>
                <div style={{ color: "#dc2626", fontWeight: 700 }}>
                  🚫 Note for Rider / রাইডারের জন্য নির্দেশনা:
                </div>
                <div style={{ color: "#222", marginTop: 2 }}>
                  মার্চেন্টের অনুমতি ছাড়া প্রোডাক্ট খোলা সম্পূর্ণ নিষিদ্ধ, খুলে দেখতে চাইলে আগে কল করুন: {settings?.contact_phone ?? "09638779900"}
                </div>
                <div style={{ color: "#222" }}>
                  WhatsApp: +{settings?.whatsapp_number ?? "8801964437520"}
                </div>
              </div>

              {/* Feedback */}
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ border: "1px solid #a7f3d0", background: "rgba(236,253,245,.3)", borderRadius: 4, padding: "6px 8px" }}>
                  <div style={{ fontWeight: 700, fontSize: 11 }}>আমাদের মতামত দিন</div>
                  <div style={{ color: "#666", fontSize: 9 }}>আপনার মতামত আমাদের আরো ভালো করতে সাহায্য করে</div>
                </div>
                <div style={{ border: "1px solid #a7f3d0", background: "rgba(236,253,245,.3)", borderRadius: 4, padding: "6px 8px" }}>
                  <div style={{ fontWeight: 700, fontSize: 11 }}>আমাদের সাথে থাকুন</div>
                  <div style={{ color: "#666", fontSize: 9 }}>আমাদের গ্রুপে যোগ দিন, পান এক্সক্লুসিভ অফার!</div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 9 }}>
                <div style={{ fontWeight: 700 }}>THANK YOU FOR CHOOSING US</div>
                <div style={{ textAlign: "right" }}>
                  <div>
                    VISIT:{" "}
                    <span style={{ fontWeight: 600 }}>
                      https://{(settings?.site_title ?? "hobbyshop").toLowerCase()}bd.shop/
                    </span>
                  </div>
                  <div>
                    SUPPORT: <span style={{ fontWeight: 600 }}>{settings?.contact_phone ?? "09638779900"}</span>
                  </div>
                </div>
              </div>

              <ol style={{ marginTop: 6, paddingLeft: 14, fontSize: 8.5, lineHeight: 1.35, color: "#444" }}>
                <li>If any defect is found (damaged/defective/wrong product) after opening the box, inform us immediately with picture/video proof.</li>
                <li>Return process must be initiated within 3 days of receiving the parcel.</li>
                <li>Product must be in original condition with all tags and packaging.</li>
                <li>Exchange delivery cost may be applicable.</li>
                <li>Promotional offers are not applicable for returned products.</li>
              </ol>

              <div style={{ marginTop: 8, textAlign: "center", fontStyle: "italic", fontSize: 8, color: "#777" }}>
                This document &amp; any information transmitted with it are confidential &amp; intended solely for the use of the individual or entity to whom they are addressed.
              </div>
              <div style={{ textAlign: "center", fontSize: 8, color: "#777" }}>
                © {new Date().getFullYear()} {settings?.site_title ?? "HobbyShop"}. All Rights Reserved
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function th(width?: number): React.CSSProperties {
  return {
    textAlign: "left",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: ".05em",
    padding: "5px 4px",
    fontWeight: 600,
    width: width ? width : undefined,
  };
}
function td(): React.CSSProperties {
  return { padding: "6px 4px", verticalAlign: "middle" };
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "85px 1fr", alignItems: "baseline", columnGap: 6 }}>
      <div style={{ color: "#555" }}>{k}</div>
      <div>{v}</div>
    </div>
  );
}

