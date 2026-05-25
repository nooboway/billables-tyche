interface LineItemInput {
  quantity: number;
  unit_price: number;
  tax_pct: number;
}

interface DocumentTotals {
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
}

export function calculateLineItem(item: LineItemInput): number {
  if (!Number.isInteger(item.quantity) || !Number.isInteger(item.unit_price)) {
    throw new Error("quantity and unit_price must be integers (smallest currency unit)");
  }
  return item.quantity * item.unit_price;
}

export function calculateDocumentTotals(
  items: LineItemInput[],
  discount_pct: number,
  doc_tax_pct: number
): DocumentTotals {
  const subtotal = items.reduce((sum, item) => sum + calculateLineItem(item), 0);
  const discount_amount = Math.floor((subtotal * discount_pct) / 10_000);
  const taxable = subtotal - discount_amount;
  const tax_amount = Math.floor((taxable * doc_tax_pct) / 10_000);
  const total = taxable + tax_amount;
  return { subtotal, discount_amount, tax_amount, total };
}

export function centsToDisplay(
  amount: number,
  currency = "NGN",
  locale = "en-NG"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}
