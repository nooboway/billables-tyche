import { api } from "./api";

export interface Expense {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  amount: number;
  category: string;
  date: string;
  paid: boolean;
  photo_url: string | null;
  tax_pct: number;
  currency: string;
}

export async function fetchExpenses(businessId: string, category?: string): Promise<Expense[]> {
  const params = new URLSearchParams({ business_id: businessId });
  if (category && category !== "All") params.set("category", category);
  const res = await api.get(`/expenses?${params}`);
  return res.data;
}

export async function fetchCategories(): Promise<string[]> {
  const res = await api.get("/expenses/categories");
  return res.data;
}

export async function createExpense(payload: Omit<Expense, "id">): Promise<Expense> {
  const res = await api.post("/expenses", payload);
  return res.data;
}

export async function updateExpense(id: string, payload: Partial<Expense>): Promise<Expense> {
  const res = await api.put(`/expenses/${id}`, payload);
  return res.data;
}

export async function deleteExpense(id: string): Promise<void> {
  await api.delete(`/expenses/${id}`);
}
