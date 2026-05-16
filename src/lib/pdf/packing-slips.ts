import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { drawFooter, drawHeader, shortId } from "./branding";

type OrderItem = {
  name: string;
  variant_label: string | null;
  quantity: number;
  price: number | null;
  unit_price: number | null;
  line_total: number | null;
};


function bdt(n: number | null | undefined) {
  return "Tk " + Number(n ?? 0).toLocaleString("en-BD");
}

function isCOD(payment_method: string | null | undefined) {
  const m = (payment_method ?? "").toLowerCase();
  return !m || m.includes("cod") || m.includes("cash");
}

/**
 * Generate a multi-page packing slip PDF for the given orders.
 * One slip per A5 page with: shipping address, COD details, and itemized list.
 */
export async function generatePackingSlipsPDF(orderIds: string[]) {
  if (!orderIds.length) throw new Error("No orders selected");

  const [ordersRes, itemsRes] = await Promise.all([
    supabase.from("orders").select("*").in("id", orderIds),
    supabase.from("order_items").select("*").in("order_id", orderIds),
  ]);
  if (ordersRes.error) throw ordersRes.error;
  if (itemsRes.error) throw itemsRes.error;

  const orders = ordersRes.data ?? [];
  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const it of itemsRes.data ?? []) {
    const arr = itemsByOrder.get(it.order_id) ?? [];
    arr.push(it as unknown as OrderItem);
    itemsByOrder.set(it.order_id, arr);
  }

  // Preserve the requested order
  const ordered = orderIds
    .map((id) => orders.find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => Boolean(o));

  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const pageWidth = doc.internal.pageSize.getWidth();

  ordered.forEach((order, idx) => {
    if (idx > 0) doc.addPage("a5");
    const items = itemsByOrder.get(order.id) ?? [];
    

    drawHeader(doc, `Packing Slip #${shortId(order.id)}`);

    // Meta row (date, payment, courier)
    let y = 36;
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(
      `Date: ${new Date(order.created_at).toLocaleDateString("en-GB")}`,
      14,
      y,
    );
    doc.text(
      `Payment: ${(order.payment_method ?? "COD").toUpperCase()}`,
      pageWidth / 2,
      y,
    );
    doc.text(
      `Courier: ${(order.courier_name || order.delivery_method || "—").toString().toUpperCase()}`,
      pageWidth - 14,
      y,
      { align: "right" },
    );
    doc.setTextColor(0);

    // Ship-to box
    y += 5;
    doc.setDrawColor(220);
    doc.setFillColor(248, 248, 250);
    doc.roundedRect(14, y, pageWidth - 28, 28, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text("SHIP TO", 17, y + 5);
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.text(order.shipping_name ?? order.guest_name ?? "—", 17, y + 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Phone: ${order.shipping_phone ?? order.guest_phone ?? "—"}`,
      17,
      y + 16,
    );
    const addrLine = [
      order.shipping_address,
      order.shipping_thana,
      order.shipping_city,
      order.shipping_district,
    ]
      .filter(Boolean)
      .join(", ");
    const wrapped = doc.splitTextToSize(addrLine || "—", pageWidth - 36);
    doc.text(wrapped, 17, y + 21);

    // Items table
    const startY = y + 32;
    autoTable(doc, {
      startY,
      head: [["#", "Item", "Qty", "Price", "Total"]],
      body: items.map((it, i) => {
        const unit = Number(it.unit_price ?? it.price ?? 0);
        const line = Number(it.line_total ?? unit * (it.quantity || 0));
        return [
          String(i + 1),
          it.name + (it.variant_label ? ` (${it.variant_label})` : ""),
          String(it.quantity),
          bdt(unit),
          bdt(line),
        ];
      }),
      styles: { fontSize: 9, cellPadding: 1.6 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        2: { cellWidth: 12, halign: "center" },
        3: { cellWidth: 22, halign: "right" },
        4: { cellWidth: 24, halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });

    let finalY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 4;

    // Totals + COD block (right aligned)
    const subtotal = Number(order.subtotal ?? 0);
    const discount = Number(order.discount_amount ?? 0);
    const shipping = Number(order.shipping_fee ?? 0);
    const advance = Number(order.advance_amount ?? 0);
    const total = Number(order.total ?? 0);
    const codExpected = Math.max(total - advance, 0);
    const cod = isCOD(order.payment_method);

    const rightX = pageWidth - 14;
    const labelX = pageWidth - 60;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", labelX, finalY);
    doc.text(bdt(subtotal), rightX, finalY, { align: "right" });
    finalY += 5;
    if (discount > 0) {
      doc.text("Discount:", labelX, finalY);
      doc.text("- " + bdt(discount), rightX, finalY, { align: "right" });
      finalY += 5;
    }
    doc.text("Shipping:", labelX, finalY);
    doc.text(bdt(shipping), rightX, finalY, { align: "right" });
    finalY += 5;
    if (advance > 0) {
      doc.text("Advance paid:", labelX, finalY);
      doc.text("- " + bdt(advance), rightX, finalY, { align: "right" });
      finalY += 5;
    }
    doc.setDrawColor(180);
    doc.line(labelX, finalY - 2, rightX, finalY - 2);
    doc.setFont("helvetica", "bold");
    doc.text("Total:", labelX, finalY + 2);
    doc.text(bdt(total), rightX, finalY + 2, { align: "right" });

    // COD highlight box (left side)
    const codY = finalY - 18;
    doc.setDrawColor(cod ? 200 : 220);
    doc.setFillColor(cod ? 255 : 248, cod ? 244 : 248, cod ? 230 : 250);
    doc.roundedRect(14, codY, 70, 22, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(140, 90, 0);
    doc.text(cod ? "CASH ON DELIVERY" : "PREPAID", 17, codY + 5);
    doc.setTextColor(0);
    doc.setFontSize(13);
    doc.text(bdt(cod ? codExpected : 0), 17, codY + 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(110);
    doc.text(
      cod ? "Collect this amount from customer" : "No collection needed",
      17,
      codY + 18,
    );
    doc.setTextColor(0);

    // Tracking row
    if (order.tracking_number) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(`Tracking: ${order.tracking_number}`, 14, finalY + 10);
      doc.setTextColor(0);
    }


    drawFooter(
      doc,
      `Page ${idx + 1} of ${ordered.length} • ${order.shipping_phone ?? "—"}`,
    );
  });

  const filename =
    ordered.length === 1
      ? `packing-slip-${shortId(ordered[0].id)}.pdf`
      : `packing-slips-${ordered.length}-orders.pdf`;
  doc.save(filename);
}
