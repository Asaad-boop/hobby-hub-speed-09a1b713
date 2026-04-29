import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { BRAND, drawFooter, drawHeader, shortId } from "./branding";

export async function generateInvoicePDF(orderId: string) {
  const [orderRes, itemsRes] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).single(),
    supabase.from("order_items").select("*").eq("order_id", orderId),
  ]);
  if (orderRes.error) throw orderRes.error;
  if (itemsRes.error) throw itemsRes.error;
  const order = orderRes.data;
  const items = itemsRes.data ?? [];

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(doc, `Invoice #${shortId(order.id)}`);

  // Meta
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date(order.created_at).toLocaleString("en-GB")}`, 14, 38);
  doc.text(`Payment: ${(order.payment_method ?? "COD").toUpperCase()}`, 14, 43);
  doc.text(`Status: ${order.status}`, 14, 48);

  // Customer
  doc.setFont("helvetica", "bold");
  doc.text("Bill To", 120, 38);
  doc.setFont("helvetica", "normal");
  const name = order.shipping_name ?? order.guest_name ?? "—";
  const phone = order.shipping_phone ?? order.guest_phone ?? "—";
  const addr = [order.shipping_address, order.shipping_city, order.shipping_district]
    .filter(Boolean)
    .join(", ");
  doc.text(name, 120, 43);
  doc.text(phone, 120, 48);
  doc.text(doc.splitTextToSize(addr || "—", 75), 120, 53);

  // Items
  autoTable(doc, {
    startY: 70,
    head: [["#", "Item", "Qty", "Price", "Total"]],
    body: items.map((it, i) => [
      String(i + 1),
      it.name + (it.variant_label ? ` (${it.variant_label})` : ""),
      String(it.quantity),
      `BDT ${Number(it.price).toFixed(0)}`,
      `BDT ${(Number(it.price) * it.quantity).toFixed(0)}`,
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
    },
  });

  // Totals
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  const pageWidth = doc.internal.pageSize.getWidth();
  const right = pageWidth - 14;
  const labelX = right - 50;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", labelX, finalY);
  doc.text(`BDT ${Number(order.subtotal).toFixed(0)}`, right, finalY, { align: "right" });
  doc.text("Shipping", labelX, finalY + 5);
  doc.text(`BDT ${Number(order.shipping_fee).toFixed(0)}`, right, finalY + 5, { align: "right" });
  if (Number(order.discount_amount) > 0) {
    doc.text("Discount", labelX, finalY + 10);
    doc.text(`- BDT ${Number(order.discount_amount).toFixed(0)}`, right, finalY + 10, {
      align: "right",
    });
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const totalY = finalY + (Number(order.discount_amount) > 0 ? 17 : 12);
  doc.text("Grand Total", labelX, totalY);
  doc.text(`BDT ${Number(order.total).toFixed(0)}`, right, totalY, { align: "right" });

  // Thank you
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(
    `Thank you for shopping with ${BRAND.name}! Returns accepted within 7 days of delivery.`,
    14,
    totalY + 18,
  );
  doc.text(
    "Need help? Call our support line or visit hobbyshop.bd/contact",
    14,
    totalY + 23,
  );
  doc.setTextColor(0);

  drawFooter(doc, `Invoice for order #${shortId(order.id)}`);
  doc.save(`invoice-${shortId(order.id)}.pdf`);
}
