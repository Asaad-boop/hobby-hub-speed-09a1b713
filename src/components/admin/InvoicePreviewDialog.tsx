import { useEffect, useRef, useState } from "react";
import { Printer, Loader2, X } from "lucide-react";
import JsBarcode from "jsbarcode";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/lib/site-settings";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo.webp";

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

function fmtMoney(n: number): string {
  // 1299 -> "1,299.0"
  const rounded = Math.round(n);
  return rounded.toLocaleString("en-US") + ".0";
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

// Real scannable Code128 barcode rendered as inline SVG (preserved through innerHTML clone).
function BarcodeStrip({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width: 1.4,
        height: 44,
        displayValue: false,
        margin: 0,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      // ignore invalid input
    }
  }, [value]);
  return <svg ref={svgRef} style={{ width: "100%", height: 44, display: "block" }} />;
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
    const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Invoice ${order ? shortInvoiceId(order.id) : ""}</title>
<style>
  @page { size: A5; margin: 6mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin:0; padding:0; background:#fff; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Bengali", "Hind Siliguri", Roboto, sans-serif; color:#111; font-size: 9.5px; line-height: 1.35; }
  /* Force the invoice to fit exactly within A5 printable area (148mm - 12mm margins = 136mm) */
  .invoice-print { width: 100%; max-width: 136mm; margin: 0 auto; padding: 0; box-shadow: none !important; }
  .invoice-print > div:first-child { padding: 0 !important; }
  img { max-width: 100%; }
  table { width: 100%; border-collapse: collapse; }
  /* Hide screen padding/shadow on the inner wrapper */
</style>
</head><body>
<div class="invoice-print">${printContents}</div>
</body></html>`;

    // Use a hidden iframe so styles load reliably and we don't depend on window.onload races.
    const existing = document.getElementById("__invoice_print_iframe");
    if (existing) existing.remove();
    const iframe = document.createElement("iframe");
    iframe.id = "__invoice_print_iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      // Override inline padding on the cloned root so print uses page margins
      try {
        const root = iframe.contentDocument?.querySelector(
          ".invoice-print > div",
        ) as HTMLElement | null;
        if (root) {
          root.style.padding = "0";
          root.style.width = "100%";
          root.style.minHeight = "0";
          root.style.boxShadow = "none";
        }
      } catch {
        // ignore
      }
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // Cleanup after a delay so print dialog has time to attach
        setTimeout(() => iframe.remove(), 1000);
      }, 100);
    };
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
                  <img
                    src={settings?.logo_url || logoImg}
                    alt="logo"
                    style={{ width: 44, height: 44, objectFit: "contain" }}
                    crossOrigin="anonymous"
                  />

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
                      v={<span style={{ fontSize: 13, fontWeight: 800 }}>BDT {fmtMoney(total)}</span>}
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
                            {fmtMoney(Number(it.price))}
                          </td>
                          <td style={{ ...td(), textAlign: "center" }}>{it.quantity}</td>
                          <td style={{ ...td(), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            {fmtMoney(lineTotal)}
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
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>BDT {subfmtMoney(total)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
                    <span>Shipping Fee(+):</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>BDT {fmtMoney(shipping)}</span>
                  </div>
                  {discount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
                      <span>Discount(-):</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>BDT {fmtMoney(discount)}</span>
                    </div>
                  )}
                  <div style={{ borderTop: "1px solid #d1d5db", marginTop: 4, paddingTop: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>Total:</span>
                      <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                        BDT {fmtMoney(total)}
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

