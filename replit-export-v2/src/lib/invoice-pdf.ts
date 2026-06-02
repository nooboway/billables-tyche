import { jsPDF } from "jspdf";
import type { Business } from "./business";

export type InvoiceItemLike = { description: string; quantity: number; rate: number };
export type InvoiceLike = {
  number: string;
  issue_date: string;
  due_date?: string | null;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  subtotal: number;
  tax: number;
  total: number;
  notes?: string | null;
  payment_terms?: string | null;
  clients?: { name: string; company?: string | null; email?: string | null; address?: string | null } | null;
  matters?: { name: string; matter_number?: string | null } | null;
  invoice_items?: InvoiceItemLike[];
};

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || "#1e3a5f").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function money(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(n) || 0);
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "B";
}

export function generateInvoicePdf(invoice: InvoiceLike, business: Business): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const brand = (business.brand || {}) as Record<string, string>;
  const [pr, pg, pb] = hexToRgb(brand.primaryColor || "#1e3a5f");
  const [ar, ag, ab] = hexToRgb(brand.accentColor || "#c9a84c");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 48;
  const currency = business.default_currency || "USD";
  const addressLines = business.address_lines ?? [];

  // Header band
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, pageW, 110, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(M, 32, 46, 46, 6, 6, "F");
  doc.setTextColor(pr, pg, pb);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(initials(business.name), M + 23, 63, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(business.name, M + 60, 56);
  if (business.tagline) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(220, 225, 235);
    doc.text(business.tagline, M + 60, 72);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text("INVOICE", pageW - M, 60, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(220, 225, 235);
  doc.text(invoice.number, pageW - M, 78, { align: "right" });

  // From / Bill To
  let y = 150;
  doc.setTextColor(120, 120, 130);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("FROM", M, y);
  doc.text("BILLED TO", pageW / 2, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 40);
  doc.text(business.name, M, y + 16);
  addressLines.forEach((line, i) => doc.text(line, M, y + 30 + i * 13));

  const client = invoice.clients;
  doc.text(client?.company || client?.name || "—", pageW / 2, y + 16);
  doc.setTextColor(120, 120, 130);
  if (client?.name && client?.company) doc.text(client.name, pageW / 2, y + 30);
  if (client?.email) doc.text(client.email, pageW / 2, y + 44);
  if (invoice.matters) doc.text(`Matter: ${invoice.matters.name}`, pageW / 2, y + 58);

  // Meta box
  y = 250;
  doc.setDrawColor(230, 232, 238);
  doc.setFillColor(248, 249, 252);
  doc.roundedRect(M, y, pageW - M * 2, 56, 6, 6, "FD");
  const cellW = (pageW - M * 2) / 4;
  const terms = invoice.payment_terms || business.payment_terms || "Net 30";
  const cells: [string, string][] = [
    ["Invoice #", invoice.number],
    ["Issued", invoice.issue_date],
    ["Due", invoice.due_date || "—"],
    ["Terms", terms],
  ];
  cells.forEach(([label, val], i) => {
    const cx = M + 16 + i * cellW;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 130);
    doc.text(label.toUpperCase(), cx, y + 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 40);
    doc.text(String(val), cx, y + 38);
  });

  // Items
  y = 340;
  doc.setFillColor(pr, pg, pb);
  doc.rect(M, y, pageW - M * 2, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPTION", M + 14, y + 18);
  doc.text("QTY", pageW - M - 220, y + 18, { align: "right" });
  doc.text("RATE", pageW - M - 110, y + 18, { align: "right" });
  doc.text("AMOUNT", pageW - M - 14, y + 18, { align: "right" });

  const items = invoice.invoice_items ?? [];
  let rowY = y + 28;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 40);
  doc.setFontSize(10);
  items.forEach((it, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(250, 251, 253);
      doc.rect(M, rowY, pageW - M * 2, 32, "F");
    }
    doc.text(it.description, M + 14, rowY + 20);
    doc.text(String(it.quantity), pageW - M - 220, rowY + 20, { align: "right" });
    doc.text(money(it.rate, currency), pageW - M - 110, rowY + 20, { align: "right" });
    doc.text(money(it.quantity * it.rate, currency), pageW - M - 14, rowY + 20, { align: "right" });
    rowY += 32;
  });

  rowY += 16;
  const totalsX = pageW - M - 200;
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 130);
  doc.text("Subtotal", totalsX, rowY);
  doc.setTextColor(30, 30, 40);
  doc.text(money(invoice.subtotal, currency), pageW - M - 14, rowY, { align: "right" });
  rowY += 18;
  doc.setTextColor(120, 120, 130);
  doc.text("Tax", totalsX, rowY);
  doc.setTextColor(30, 30, 40);
  doc.text(money(invoice.tax, currency), pageW - M - 14, rowY, { align: "right" });
  rowY += 14;
  doc.setDrawColor(ar, ag, ab);
  doc.setLineWidth(1.2);
  doc.line(totalsX, rowY, pageW - M - 14, rowY);
  rowY += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(pr, pg, pb);
  doc.text("Total due", totalsX, rowY);
  doc.text(money(invoice.total, currency), pageW - M - 14, rowY, { align: "right" });

  if (invoice.status === "paid") {
    doc.setDrawColor(34, 139, 87);
    doc.setTextColor(34, 139, 87);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.roundedRect(M, rowY - 30, 90, 36, 4, 4, "S");
    doc.text("PAID", M + 45, rowY - 6, { align: "center" });
  } else if (invoice.status === "overdue") {
    doc.setDrawColor(200, 60, 60);
    doc.setTextColor(200, 60, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.roundedRect(M, rowY - 30, 110, 36, 4, 4, "S");
    doc.text("OVERDUE", M + 55, rowY - 6, { align: "center" });
  }

  // Footer
  doc.setFillColor(248, 249, 252);
  doc.rect(0, pageH - 70, pageW, 70, "F");
  doc.setDrawColor(ar, ag, ab);
  doc.setLineWidth(2);
  doc.line(0, pageH - 70, pageW, pageH - 70);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 90);
  if (business.footer_note) doc.text(business.footer_note, M, pageH - 42);
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 150);
  doc.text(`Payment terms: ${terms}`, M, pageH - 24);
  doc.text(`Generated by Billables`, pageW - M, pageH - 24, { align: "right" });

  return doc;
}

export function downloadInvoicePdf(invoice: InvoiceLike, business: Business) {
  const doc = generateInvoicePdf(invoice, business);
  doc.save(`${invoice.number}.pdf`);
}
