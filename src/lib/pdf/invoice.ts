// HobbyShop branded invoice — matches the "Bulk Print" template.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import JsBarcode from "jsbarcode";
import { supabase } from "@/integrations/supabase/client";

const BRAND_NAME = "Hobby Shop";
const BRAND_TAGLINE = "Touch Your Dream";
const BRAND_HOTLINE = "09638779900";
const BRAND_WHATSAPP = "+8801964437520";
const BRAND_WEBSITE = "https://hobbyshopbd.shop/";
const BRAND_RED: [number, number, number] = [220, 38, 38];
const TEXT_DARK: [number, number, number] = [17, 24, 39];
const TEXT_MUTED: [number, number, number] = [107, 114, 128];
const LINE: [number, number, number] = [17, 24, 39];

// ---- helpers ----
function shortInvoiceId(id: string) {
  // ORD-XXXXXXXX style
  return "ORD-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function formatBDT(n: number) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Convert a number to English words (simple, supports up to crores).
function numberToWords(num: number): string {
  num = Math.floor(Number(num) || 0);
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const sub = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " And " + sub(n % 100) : "");
  };
  const parts: string[] = [];
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  if (crore) parts.push(sub(crore) + " Crore");
  if (lakh) parts.push(sub(lakh) + " Lakh");
  if (thousand) parts.push(sub(thousand) + " Thousand");
  if (num) parts.push(sub(num));
  return parts.join(", ");
}

function makeBarcodeDataUrl(text: string): string {
  try {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, text, {
      format: "CODE128",
      displayValue: false,
      margin: 0,
      height: 60,
      width: 2,
    });
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateInvoicePDF(
  orderId: string,
  opts: { mode?: "save" | "blob" } = {},
): Promise<{ blobUrl: string; filename: string } | void> {
  const [orderRes, itemsRes] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).single(),
    supabase.from("order_items").select("*").eq("order_id", orderId),
  ]);
  if (orderRes.error) throw orderRes.error;
  if (itemsRes.error) throw itemsRes.error;
  const order = orderRes.data;
  const items = itemsRes.data ?? [];
  const invId = shortInvoiceId(order.id);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 12;

  // ---------- Header ----------
  // Brand mark (text-based — avoids needing remote logo fetch).
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Hobby", M + 2, 18);
  doc.setTextColor(...BRAND_RED);
  doc.text("Shop", M + 2 + doc.getTextWidth("Hobby") + 1.5, 18);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(BRAND_TAGLINE, M + 2, 22.5);

  // Top-right company info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  doc.text("HQ", W - M, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("Company Address", W - M, 17.5, { align: "right" });
  doc.text(`Hotline: ${BRAND_HOTLINE}`, W - M, 21.5, { align: "right" });

  // Heavy divider
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.8);
  doc.line(M, 27, W - M, 27);

  // ---------- Two columns: Delivery + Invoice meta ----------
  const colY = 33;
  const leftX = M;
  const rightX = W / 2 + 4;

  // LEFT — Delivery address + barcode
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("DELIVERY ADDRESS", leftX, colY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...TEXT_DARK);
  const custName = (order.shipping_name || order.guest_name || "Customer").toUpperCase();
  doc.text(custName, leftX, colY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  const addrLines = doc.splitTextToSize(
    [order.shipping_address, order.shipping_thana, order.shipping_city, order.shipping_district].filter(Boolean).join(", ") || "—",
    (W / 2) - M - 4,
  );
  doc.text(addrLines, leftX, colY + 13);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const phone = order.shipping_phone || order.guest_phone || "—";
  doc.text(phone, leftX, colY + 13 + addrLines.length * 4 + 4);

  // Barcode
  const barcodeDataUrl = makeBarcodeDataUrl(invId);
  if (barcodeDataUrl) {
    const bw = 80;
    const bh = 16;
    const bx = leftX;
    const by = colY + 13 + addrLines.length * 4 + 9;
    doc.addImage(barcodeDataUrl, "PNG", bx, by, bw, bh);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_DARK);
    doc.text(invId, bx + bw / 2, by + bh + 3.5, { align: "center" });
  }

  // RIGHT — Invoice meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Invoice", rightX, colY + 4);

  const metaY = colY + 12;
  const metaLineH = 5.8;
  const labelX = rightX;
  const valueX = rightX + 36;

  const subtotal = items.reduce((a, it) => a + Number(it.price) * Number(it.quantity), 0);
  const shippingFee = Number(order.shipping_fee || 0);
  const discount = Number(order.discount_amount || 0);
  const total = Number(order.total) || subtotal + shippingFee - discount;
  const itemCount = items.reduce((a, it) => a + Number(it.quantity || 0), 0);
  const dateStr = new Date(order.created_at).toISOString().slice(0, 10);
  const payment = (order.payment_method || "cod").toLowerCase() === "cod" ? "Cash On Delivery" : (order.payment_method || "—").toUpperCase();

  const rows: Array<[string, string, boolean]> = [
    ["Invoice ID:", invId, true],
    ["Date:", dateStr, true],
    ["Item Count:", String(itemCount), true],
    ["Payment:", payment, true],
    ["Payable:", `BDT ${formatBDT(total)}`, true],
    ["Delivery Partner:", order.courier_name || "—", false],
    ["Tracking ID:", order.tracking_number || "—", false],
  ];
  rows.forEach(([label, value, bold], i) => {
    const y = metaY + i * metaLineH;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(label, labelX, y);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(label === "Payable:" ? 12 : 10);
    doc.setTextColor(...TEXT_DARK);
    doc.text(String(value), valueX, y);
  });

  // ---------- Items table ----------
  const tableStartY = Math.max(colY + 50, metaY + rows.length * metaLineH + 6);

  // Pre-load product images
  const images = await Promise.all(items.map((it) => (it.image ? loadImageAsDataUrl(it.image) : Promise.resolve(null))));

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: M, right: M },
    head: [["#", "TITLE", "TYPE", "SIZE", "PRICE", "QTY", "TOTAL"]],
    body: items.map((it, i) => [
      String(i + 1) + ".",
      it.name + (it.variant_label ? `\n${it.variant_label}` : ""),
      "",
      "",
      formatBDT(Number(it.price)),
      String(it.quantity),
      formatBDT(Number(it.price) * Number(it.quantity)),
    ]),
    styles: { fontSize: 9, cellPadding: 3, textColor: TEXT_DARK, lineColor: [230, 230, 230], lineWidth: 0.1 },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: TEXT_DARK,
      fontStyle: "bold",
      fontSize: 9,
      lineColor: LINE,
      lineWidth: { top: 0.6, bottom: 0.6, left: 0, right: 0 },
    },
    bodyStyles: { lineColor: [240, 240, 240], lineWidth: { top: 0, bottom: 0.2, left: 0, right: 0 } as any },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 14, halign: "center" },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 12, halign: "center" },
      6: { cellWidth: 22, halign: "right" },
    },
    didDrawCell: (data) => {
      // Draw product thumbnail in the TYPE column
      if (data.section === "body" && data.column.index === 2) {
        const img = images[data.row.index];
        if (img) {
          const size = 9;
          const x = data.cell.x + (data.cell.width - size) / 2;
          const y = data.cell.y + (data.cell.height - size) / 2;
          try { doc.addImage(img, "JPEG", x, y, size, size); } catch { /* skip */ }
        }
      }
    },
  });

  let y = (doc as any).lastAutoTable.finalY + 3;

  // Note line under the table
  doc.setDrawColor(235, 235, 235);
  doc.line(M, y, W - M, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Note:", M, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND_RED);
  doc.text(
    "Merchant er onumoti chara product khola sompurno nishiddho. Khola ponno grohonjoggo noy.",
    M + 12, y,
  );
  doc.setTextColor(...TEXT_DARK);
  y += 4;
  doc.line(M, y, W - M, y);

  // ---------- Totals (right column) ----------
  y += 7;
  const totalsLabelX = W - M - 60;
  const totalsValueX = W - M;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("Sub Total:", totalsLabelX, y);
  doc.setTextColor(...TEXT_DARK);
  doc.text(`BDT ${formatBDT(subtotal)}`, totalsValueX, y, { align: "right" });
  y += 5.5;
  doc.setTextColor(...TEXT_MUTED);
  doc.text("Shipping Fee(+):", totalsLabelX, y);
  doc.setTextColor(...TEXT_DARK);
  doc.text(`BDT ${formatBDT(shippingFee)}`, totalsValueX, y, { align: "right" });
  if (discount > 0) {
    y += 5.5;
    doc.setTextColor(...TEXT_MUTED);
    doc.text("Discount(-):", totalsLabelX, y);
    doc.setTextColor(...TEXT_DARK);
    doc.text(`BDT ${formatBDT(discount)}`, totalsValueX, y, { align: "right" });
  }
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Total:", totalsLabelX, y);
  doc.text(`BDT ${formatBDT(total)}`, totalsValueX, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_MUTED);
  const words = numberToWords(total) + " Tk Only";
  doc.text(`In Words: ${words}`, totalsValueX, y, { align: "right" });

  // ---------- Rider note (dashed red box) ----------
  y += 10;
  const boxX = M;
  const boxW = W - M * 2;
  const boxH = 20;
  doc.setDrawColor(...BRAND_RED);
  doc.setLineDashPattern([1.5, 1.2], 0);
  doc.setLineWidth(0.4);
  doc.roundedRect(boxX, y, boxW, boxH, 1.5, 1.5);
  doc.setLineDashPattern([], 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND_RED);
  doc.text("Note for Rider / Rider er jonno nirdeshona:", boxX + 4, y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(
    `Merchant er onumoti chara product khola nishiddho — call: ${BRAND_HOTLINE}`,
    boxX + 4, y + 11,
  );
  doc.setFont("helvetica", "bold");
  doc.text(`WhatsApp: ${BRAND_WHATSAPP}`, boxX + 4, y + 16);

  // ---------- Footer ----------
  const footerTop = H - 38;
  doc.setDrawColor(220, 230, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, footerTop - 14, (W - M * 2) / 2 - 2, 12, 1.5, 1.5);
  doc.roundedRect(W / 2 + 1, footerTop - 14, (W - M * 2) / 2 - 2, 12, 1.5, 1.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Amader motamot din", M + 3, footerTop - 9);
  doc.text("Amader sathe thakun", W / 2 + 4, footerTop - 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("Apnar motamot amader aro valo korte help kore", M + 3, footerTop - 4);
  doc.text("Amader group e join din, paan exclusive offer!", W / 2 + 4, footerTop - 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  doc.text("THANK YOU FOR CHOOSING US", M, footerTop + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("VISIT:", W - M - 38, footerTop - 2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_DARK);
  doc.text(BRAND_WEBSITE, W - M, footerTop - 2, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_MUTED);
  doc.text("SUPPORT:", W - M - 38, footerTop + 2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_DARK);
  doc.text(BRAND_HOTLINE, W - M, footerTop + 2, { align: "right" });

  // Return policy
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  const policy = [
    "1. If any defect is found (damaged/defective/wrong product) after opening the box, inform us immediately with picture/video proof.",
    "2. Return process must be initiated within 3 days of receiving the parcel.",
    "3. Product must be in original condition with all tags and packaging.",
    "4. Exchange delivery cost may be applicable.",
    "5. Promotional offers are not applicable for returned products.",
  ];
  policy.forEach((p, i) => doc.text(p, M, footerTop + 8 + i * 3.2));

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text(
    "This document & any information transmitted with it are confidential & intended solely for the use of the addressee.",
    W / 2, H - 6, { align: "center" },
  );
  doc.setFont("helvetica", "normal");
  doc.text(`© ${new Date().getFullYear()} HobbyShop. All Rights Reserved`, W / 2, H - 3, { align: "center" });

  const filename = `invoice-${invId}.pdf`;
  if (opts.mode === "blob") {
    const blob = doc.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    return { blobUrl, filename };
  }
  doc.save(filename);
}
