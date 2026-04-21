import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { drawFooter, drawHeader, shortId } from "./branding";

export async function generatePackingListPDF(orderId: string) {
  const [orderRes, itemsRes] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).single(),
    supabase.from("order_items").select("*").eq("order_id", orderId),
  ]);
  if (orderRes.error) throw orderRes.error;
  if (itemsRes.error) throw itemsRes.error;
  const order = orderRes.data;
  const items = itemsRes.data ?? [];

  const doc = new jsPDF({ unit: "mm", format: "a5" });
  drawHeader(doc, `Packing #${shortId(order.id)}`);

  doc.setFontSize(9);
  doc.text(`Customer: ${order.shipping_name ?? order.guest_name ?? "—"}`, 10, 38);
  doc.text(`Phone: ${order.shipping_phone ?? order.guest_phone ?? "—"}`, 10, 43);
  doc.text(`City: ${order.shipping_city ?? "—"}`, 10, 48);

  autoTable(doc, {
    startY: 55,
    head: [["✓", "Item", "Qty"]],
    body: items.map((it) => [
      "[ ]",
      it.name + (it.variant_label ? ` (${it.variant_label})` : ""),
      String(it.quantity),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255 },
    columnStyles: { 0: { cellWidth: 10, halign: "center" }, 2: { cellWidth: 14, halign: "center" } },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(9);
  doc.text("Weight: ___________ kg", 10, finalY);
  doc.text("Dimensions: __________ × __________ × __________ cm", 10, finalY + 6);
  if (order.admin_notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", 10, finalY + 14);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(order.admin_notes, 130), 10, finalY + 19);
  }

  drawFooter(doc, "Packer signature: ____________________");
  doc.save(`packing-${shortId(order.id)}.pdf`);
}
