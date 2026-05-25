import puppeteer, { Browser } from "puppeteer";
import { centsToDisplay } from "../services/calculation.service";

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    browserInstance.on("disconnected", () => { browserInstance = null; });
  }
  return browserInstance;
}

const TYPE_LABEL: Record<string, string> = {
  INVOICE: "INVOICE",
  ESTIMATE: "ESTIMATE",
  PROFORMA: "PRO FORMA INVOICE",
  DELIVERY_NOTE: "DELIVERY NOTE",
  PURCHASE_ORDER: "PURCHASE ORDER",
};

export async function generateDocumentPdf(doc: any): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const html = buildHtml(doc);
    await page.setContent(html, { waitUntil: "networkidle0" });
    const buffer = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(buffer);
  } finally {
    await page.close();
  }
}

function buildHtml(doc: any): string {
  const biz = doc.business ?? {};
  const client = doc.client ?? {};
  const currency = biz.currency_code ?? "NGN";
  const fmt = (n: number) => centsToDisplay(n, currency);
  const label = TYPE_LABEL[doc.type] ?? "DOCUMENT";

  const itemRows = (doc.items ?? [])
    .map(
      (item: any, i: number) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9fafb"}">
        <td style="padding:8px 12px">${item.description}</td>
        <td style="padding:8px 12px;text-align:center">${item.quantity}</td>
        <td style="padding:8px 12px;text-align:right">${fmt(item.unit_price)}</td>
        <td style="padding:8px 12px;text-align:right">${(item.tax_pct / 100).toFixed(1)}%</td>
        <td style="padding:8px 12px;text-align:right">${fmt(item.line_total)}</td>
      </tr>`
    )
    .join("");

  const dueDate = doc.due_date
    ? new Date(doc.due_date).toLocaleDateString("en-NG")
    : "—";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; }
  .page { padding: 40px; max-width: 800px; margin: auto; }
  h1 { font-size: 28px; font-weight: 900; letter-spacing: 2px; }
  .biz-header { display:flex; justify-content:space-between; margin-bottom: 24px; }
  .biz-name { font-size: 20px; font-weight: 700; }
  .info-bar { background: #000; color: #fff; display:flex; border-radius: 4px; margin-bottom: 20px; }
  .info-bar-cell { flex:1; padding: 10px 14px; }
  .info-bar-label { font-size: 10px; opacity: 0.6; text-transform: uppercase; }
  .info-bar-value { font-size: 14px; font-weight: 700; margin-top: 2px; }
  .meta-row { display:flex; gap: 40px; margin-bottom: 24px; }
  .meta-block { flex: 1; }
  .meta-label { font-size: 10px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
  .meta-value { font-size: 13px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead tr { background: #000; color: #fff; }
  thead th { padding: 10px 12px; text-align: left; font-size: 12px; }
  thead th:not(:first-child) { text-align: right; }
  .totals-table { width: 280px; margin-left: auto; }
  .totals-table td { padding: 5px 8px; }
  .totals-table .total-row td { font-weight: 700; font-size: 15px; border-top: 2px solid #000; padding-top: 8px; }
  .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 12px; color: #888; font-size: 11px; text-align: center; }
  .notes-box { background: #f9fafb; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; }
</style>
</head>
<body>
<div class="page">
  <div class="biz-header">
    <div>
      ${biz.logo_url ? `<img src="${biz.logo_url}" style="height:50px;margin-bottom:8px"/>` : ""}
      <div class="biz-name">${biz.name ?? ""}</div>
      <div style="color:#666;font-size:12px;margin-top:4px">${biz.address_street ?? ""}${biz.address_city ? `, ${biz.address_city}` : ""}</div>
      ${biz.tax_reg_no ? `<div style="color:#666;font-size:12px">TIN: ${biz.tax_reg_no}</div>` : ""}
    </div>
    <div style="text-align:right">
      <h1>${label}</h1>
    </div>
  </div>

  <div class="info-bar">
    <div class="info-bar-cell">
      <div class="info-bar-label">Document No.</div>
      <div class="info-bar-value">${doc.document_number}</div>
    </div>
    ${doc.reference ? `<div class="info-bar-cell"><div class="info-bar-label">Reference</div><div class="info-bar-value">${doc.reference}</div></div>` : ""}
    <div class="info-bar-cell">
      <div class="info-bar-label">Due Date</div>
      <div class="info-bar-value">${dueDate}</div>
    </div>
    <div class="info-bar-cell" style="text-align:right">
      <div class="info-bar-label">Total Due</div>
      <div class="info-bar-value">${fmt(doc.total)}</div>
    </div>
  </div>

  <div class="meta-row">
    <div class="meta-block">
      <div class="meta-label">Bill To</div>
      <div class="meta-value">${client.name ?? "—"}</div>
      ${client.email ? `<div style="font-size:12px;color:#666">${client.email}</div>` : ""}
      ${client.address_street ? `<div style="font-size:12px;color:#666">${client.address_street}</div>` : ""}
    </div>
    <div class="meta-block">
      <div class="meta-label">Issue Date</div>
      <div class="meta-value">${new Date(doc.issue_date).toLocaleDateString("en-NG")}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left">Description</th>
        <th style="text-align:right">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Tax</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <table class="totals-table">
    <tr><td>Subtotal</td><td style="text-align:right">${fmt(doc.subtotal)}</td></tr>
    ${doc.discount_amount > 0 ? `<tr><td>Discount</td><td style="text-align:right">-${fmt(doc.discount_amount)}</td></tr>` : ""}
    <tr><td>Tax (${(doc.tax_pct / 100).toFixed(1)}%)</td><td style="text-align:right">${fmt(doc.tax_amount)}</td></tr>
    <tr class="total-row"><td>Total</td><td style="text-align:right">${fmt(doc.total)}</td></tr>
  </table>

  ${doc.notes ? `<div class="notes-box"><strong>Notes:</strong> ${doc.notes}</div>` : ""}

  ${biz.signature_url ? `<div style="text-align:right;margin-top:24px"><img src="${biz.signature_url}" style="height:60px"/><div style="font-size:11px;color:#888;margin-top:4px">Authorized Signature</div></div>` : ""}

  <div class="footer">
    ${[biz.phone, biz.website, biz.email].filter(Boolean).join(" | ")}
  </div>
</div>
</body>
</html>`;
}
