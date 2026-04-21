import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { drawFooter, drawHeader, shortId } from "./branding";

export async function generatePickingListPDF(orderIds: string[]) {
  if (orderIds.length === 0) throw new Error("No orders selected");
  const { data: items, error } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);
  if (error) throw error;

  // Group by product
  const grouped = new Map<
    string,
    { name: string; total: number; orders: { orderId: string; qty: number }[] }
  >();
  for (const it of items ?? []) {
    const key = it.product_id;
    const existing = grouped.get(key);
    if (existing) {
      existing.total += it.quantity;
      existing.orders.push({ orderId: it.order_id, qty: it.quantity });
    } else {
      grouped.set(key, {
        name: it.name,
        total: it.quantity,
        orders: [{ orderId: it.order_id, qty: it.quantity }],
      });
    }
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(doc, `Picking List — ${orderIds.length} orders`);

  doc.setFontSize(9);
  doc.text(`Generated for ${orderIds.length} orders, ${grouped.size} unique products`, 14, 38);

  autoTable(doc, {
    startY: 45,
    head: [["✓", "Product", "Total Qty", "Order Breakdown"]],
    body: Array.from(grouped.values()).map((g) => [
      "[ ]",
      g.name,
      String(g.total),
      g.orders.map((o) => `#${shortId(o.orderId)}×${o.qty}`).join(", "),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      2: { cellWidth: 22, halign: "center" },
    },
  });

  drawFooter(doc, "Picker signature: ____________________");
  doc.save(`picking-list-${new Date().toISOString().slice(0, 10)}.pdf`);
}
