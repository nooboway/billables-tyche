import { jsPDF } from "jspdf";
import type { Business } from "./business";

function money(n: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(Number(n) || 0);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || "#1e3a5f").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function downloadReportPdf(opts: {
  business: Business;
  title: string;
  columns: { key: string; label: string; width: number; align?: "left" | "right" }[];
  rows: Array<Record<string, string | number>>;
  totalLabel?: string;
  totalValue?: string;
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const w = doc.internal.pageSize.getWidth();
  const [pr, pg, pb] = hexToRgb(opts.business.brand?.primaryColor ?? "#1e3a5f");

  // Header bar
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, w, 70, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text(opts.business.name, 40, 32);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(opts.business.tagline ?? "", 40, 50);
  doc.setFontSize(11);
  doc.text(opts.title, w - 40, 32, { align: "right" });
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString(), w - 40, 50, { align: "right" });

  // Table
  doc.setTextColor(20);
  let y = 100;
  let x = 40;
  doc.setFillColor(240, 240, 240);
  doc.rect(40, y - 14, w - 80, 20, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  for (const c of opts.columns) {
    doc.text(c.label.toUpperCase(), c.align === "right" ? x + c.width - 4 : x + 4, y, { align: c.align === "right" ? "right" : "left" });
    x += c.width;
  }
  y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);

  for (const row of opts.rows) {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage(); y = 60;
    }
    x = 40;
    for (const c of opts.columns) {
      const v = String(row[c.key] ?? "");
      doc.text(v.length > 60 ? v.slice(0, 57) + "…" : v, c.align === "right" ? x + c.width - 4 : x + 4, y, { align: c.align === "right" ? "right" : "left" });
      x += c.width;
    }
    y += 16;
    doc.setDrawColor(230); doc.line(40, y - 8, w - 40, y - 8);
  }

  if (opts.totalLabel && opts.totalValue) {
    y += 10;
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(`${opts.totalLabel}:`, w - 200, y);
    doc.text(opts.totalValue, w - 40, y, { align: "right" });
  }

  // Footer
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120);
  doc.text(opts.business.footer_note ?? "", 40, doc.internal.pageSize.getHeight() - 30);

  doc.save(`${opts.title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
  // Silence unused helper warning
  void money;
}