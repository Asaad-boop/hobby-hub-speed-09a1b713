// Shared PDF branding helpers
import { jsPDF } from "jspdf";

export const BRAND = {
  name: "HobbyShop",
  tagline: "Curated hobby gear for Bangladesh",
  phone: "+880 1700-000000",
  email: "support@hobbyshop.bd",
  website: "hobbyshop.bd",
};

export function drawHeader(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(BRAND.name, 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text(BRAND.tagline, 14, 21);
  doc.text(`${BRAND.phone}  •  ${BRAND.website}`, 14, 25);

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, pageWidth - 14, 18, { align: "right" });

  doc.setDrawColor(220);
  doc.setLineWidth(0.4);
  doc.line(14, 30, pageWidth - 14, 30);
}

export function drawFooter(doc: jsPDF, note?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220);
  doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  if (note) doc.text(note, 14, pageHeight - 12);
  doc.text(`Generated ${new Date().toLocaleString("en-GB")}`, pageWidth - 14, pageHeight - 12, {
    align: "right",
  });
  doc.setTextColor(0);
}

export function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}
