import { Request, Response } from "express";

/**
 * Expense controller — STUBBED.
 *
 * The Supabase database schema does not have an `expenses` table yet.
 * These endpoints return empty/stub responses so the mobile app
 * doesn't crash. A migration to add the expenses table can be created later.
 */

const EXPENSE_CATEGORIES = [
  "Office Supplies", "Travel", "Meals", "Software", "Hardware",
  "Marketing", "Utilities", "Rent", "Salaries", "Taxes", "Other",
];

export async function listExpenses(_req: Request, res: Response): Promise<void> {
  res.json([]);
}

export async function createExpense(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: "Expenses are not yet available. A database migration is required." });
}

export async function updateExpense(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: "Expenses are not yet available." });
}

export async function deleteExpense(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: "Expenses are not yet available." });
}

export async function getCategories(_req: Request, res: Response): Promise<void> {
  res.json(EXPENSE_CATEGORIES);
}
