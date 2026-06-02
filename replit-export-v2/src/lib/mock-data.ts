// Premium mock data layer. Single source of truth for the UI shell.
// Swappable with real Cloud queries in the next round.

export type InvoiceStatus = "Paid" | "Pending" | "Overdue" | "Draft";
export type ExpenseCategory =
  | "Software"
  | "Travel"
  | "Marketing"
  | "Office"
  | "Contractors"
  | "Utilities";

export type Invoice = {
  id: string;
  client: string;
  project?: string;
  issued: string;
  due: string;
  amount: number;
  status: InvoiceStatus;
};

export type Client = {
  id: string;
  name: string;
  email: string;
  company: string;
  ltv: number;
  outstanding: number;
  lastActivity: string;
  status: "Active" | "Prospect" | "Inactive";
};

export type Expense = {
  id: string;
  vendor: string;
  category: ExpenseCategory;
  project?: string;
  date: string;
  amount: number;
  method: "Card" | "Bank" | "Cash";
  hasReceipt: boolean;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  unitCost: number;
  price: number;
  stock: number;
  reorderAt: number;
};

export type Project = {
  id: string;
  name: string;
  client: string;
  revenue: number;
  cost: number;
};

export type Alert = {
  id: string;
  kind: "overdue" | "lowstock" | "payment" | "renewal";
  title: string;
  detail: string;
  meta?: string;
};

export const invoices: Invoice[] = [
  { id: "INV-2024-021", client: "Aura Design Studio", project: "Brand refresh", issued: "Oct 22, 2024", due: "Nov 05, 2024", amount: 12400, status: "Paid" },
  { id: "INV-2024-022", client: "Nexus Logistics", project: "Routing API", issued: "Oct 21, 2024", due: "Nov 04, 2024", amount: 8150, status: "Pending" },
  { id: "INV-2024-018", client: "Stellar Cloud Corp", project: "Migration Q3", issued: "Sep 18, 2024", due: "Oct 02, 2024", amount: 2300, status: "Overdue" },
  { id: "INV-2024-019", client: "Ironclad Security", project: "Pentest retainer", issued: "Oct 15, 2024", due: "Oct 29, 2024", amount: 15000, status: "Paid" },
  { id: "INV-2024-020", client: "Brightline Media", project: "Launch campaign", issued: "Oct 12, 2024", due: "Oct 26, 2024", amount: 4850, status: "Pending" },
  { id: "INV-2024-023", client: "Vertex Robotics", issued: "Oct 24, 2024", due: "Nov 07, 2024", amount: 9620, status: "Draft" },
  { id: "INV-2024-017", client: "Aura Design Studio", project: "Brand refresh", issued: "Sep 12, 2024", due: "Sep 26, 2024", amount: 6200, status: "Paid" },
  { id: "INV-2024-016", client: "Helios Energy", issued: "Sep 04, 2024", due: "Sep 18, 2024", amount: 1820, status: "Overdue" },
];

export const clients: Client[] = [
  { id: "c1", name: "Lena Park", email: "lena@aura.studio", company: "Aura Design Studio", ltv: 48200, outstanding: 0, lastActivity: "2d ago", status: "Active" },
  { id: "c2", name: "Marcus Hale", email: "marcus@nexuslog.io", company: "Nexus Logistics", ltv: 31900, outstanding: 8150, lastActivity: "1d ago", status: "Active" },
  { id: "c3", name: "Priya Sahni", email: "priya@stellar.cloud", company: "Stellar Cloud Corp", ltv: 18450, outstanding: 2300, lastActivity: "12d ago", status: "Active" },
  { id: "c4", name: "Jonas Weber", email: "jonas@ironclad.io", company: "Ironclad Security", ltv: 92500, outstanding: 0, lastActivity: "5d ago", status: "Active" },
  { id: "c5", name: "Amelia Brooks", email: "amelia@brightline.tv", company: "Brightline Media", ltv: 14820, outstanding: 4850, lastActivity: "3d ago", status: "Active" },
  { id: "c6", name: "Diego Souza", email: "diego@vertexrobotics.io", company: "Vertex Robotics", ltv: 0, outstanding: 0, lastActivity: "—", status: "Prospect" },
  { id: "c7", name: "Hana Okafor", email: "hana@helios.energy", company: "Helios Energy", ltv: 6420, outstanding: 1820, lastActivity: "21d ago", status: "Inactive" },
];

export const expenses: Expense[] = [
  { id: "e1", vendor: "Linear", category: "Software", date: "Oct 24, 2024", amount: 120, method: "Card", hasReceipt: true },
  { id: "e2", vendor: "Delta Airlines", category: "Travel", project: "Migration Q3", date: "Oct 19, 2024", amount: 642, method: "Card", hasReceipt: true },
  { id: "e3", vendor: "Meta Ads", category: "Marketing", project: "Launch campaign", date: "Oct 18, 2024", amount: 1850, method: "Card", hasReceipt: false },
  { id: "e4", vendor: "WeWork", category: "Office", date: "Oct 15, 2024", amount: 980, method: "Bank", hasReceipt: true },
  { id: "e5", vendor: "Daniel Cho", category: "Contractors", project: "Brand refresh", date: "Oct 12, 2024", amount: 3200, method: "Bank", hasReceipt: true },
  { id: "e6", vendor: "AWS", category: "Software", date: "Oct 09, 2024", amount: 412, method: "Card", hasReceipt: true },
  { id: "e7", vendor: "ConEd", category: "Utilities", date: "Oct 03, 2024", amount: 215, method: "Bank", hasReceipt: false },
];

export const products: Product[] = [
  { id: "p1", sku: "BR-CARD-01", name: "Premium Business Cards (250)", unitCost: 18, price: 65, stock: 142, reorderAt: 40 },
  { id: "p2", sku: "WRK-HR", name: "Workshop Hour", unitCost: 0, price: 220, stock: 999, reorderAt: 0 },
  { id: "p3", sku: "AUD-PKG", name: "Brand Audit Package", unitCost: 0, price: 4800, stock: 999, reorderAt: 0 },
  { id: "p4", sku: "MRC-TEE-M", name: "Studio Merch Tee — M", unitCost: 11, price: 32, stock: 18, reorderAt: 25 },
  { id: "p5", sku: "MRC-TEE-L", name: "Studio Merch Tee — L", unitCost: 11, price: 32, stock: 6, reorderAt: 25 },
  { id: "p6", sku: "POD-CASE", name: "Recording Pod Rental / Day", unitCost: 45, price: 380, stock: 4, reorderAt: 2 },
];

export const projects: Project[] = [
  { id: "pr1", name: "Brand refresh", client: "Aura Design Studio", revenue: 18600, cost: 5240 },
  { id: "pr2", name: "Routing API", client: "Nexus Logistics", revenue: 24800, cost: 9100 },
  { id: "pr3", name: "Migration Q3", client: "Stellar Cloud Corp", revenue: 14200, cost: 8920 },
  { id: "pr4", name: "Pentest retainer", client: "Ironclad Security", revenue: 45000, cost: 12400 },
  { id: "pr5", name: "Launch campaign", client: "Brightline Media", revenue: 9700, cost: 6300 },
];

export const alerts: Alert[] = [
  { id: "a1", kind: "overdue", title: "INV-2024-018 is 8 days overdue", detail: "Stellar Cloud Corp · $2,300.00", meta: "Send reminder" },
  { id: "a2", kind: "overdue", title: "INV-2024-016 is 36 days overdue", detail: "Helios Energy · $1,820.00", meta: "Escalate" },
  { id: "a3", kind: "lowstock", title: "Studio Merch Tee — L below reorder point", detail: "6 in stock · reorder at 25", meta: "Reorder" },
  { id: "a4", kind: "renewal", title: "Pentest retainer renews in 9 days", detail: "Ironclad Security · $15,000.00", meta: "Prepare renewal" },
  { id: "a5", kind: "payment", title: "Payout of $12,400 cleared", detail: "Aura Design Studio · INV-2024-021", meta: "View" },
];

export const revenueExpenseSeries = [
  { m: "Jan", revenue: 32000, expense: 21500 },
  { m: "Feb", revenue: 38000, expense: 23900 },
  { m: "Mar", revenue: 34000, expense: 22100 },
  { m: "Apr", revenue: 46000, expense: 28400 },
  { m: "May", revenue: 52000, expense: 31200 },
  { m: "Jun", revenue: 49000, expense: 29800 },
  { m: "Jul", revenue: 61000, expense: 34600 },
  { m: "Aug", revenue: 58000, expense: 33800 },
  { m: "Sep", revenue: 72000, expense: 41200 },
  { m: "Oct", revenue: 81000, expense: 44500 },
];

export function fmt(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function fmtCents(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export const totals = {
  outstanding: invoices
    .filter((i) => i.status === "Pending" || i.status === "Overdue")
    .reduce((s, i) => s + i.amount, 0),
  paidThisMonth: invoices
    .filter((i) => i.status === "Paid")
    .reduce((s, i) => s + i.amount, 0),
  overdue: invoices
    .filter((i) => i.status === "Overdue")
    .reduce((s, i) => s + i.amount, 0),
  expensesThisMonth: expenses.reduce((s, e) => s + e.amount, 0),
};