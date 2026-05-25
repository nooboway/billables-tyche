import { Request, Response } from "express";
import { prisma } from "../prisma";

const EXPENSE_CATEGORIES = [
  "Office Supplies", "Travel", "Meals", "Software", "Hardware",
  "Marketing", "Utilities", "Rent", "Salaries", "Taxes", "Other",
];

export async function listExpenses(req: Request, res: Response): Promise<void> {
  const { business_id, category } = req.query as Record<string, string>;
  const expenses = await prisma.expense.findMany({
    where: {
      business_id,
      ...(category && category !== "All" ? { category } : {}),
    },
    orderBy: { date: "desc" },
  });
  res.json(expenses);
}

export async function createExpense(req: Request, res: Response): Promise<void> {
  const expense = await prisma.expense.create({ data: req.body });
  res.status(201).json(expense);
}

export async function updateExpense(req: Request, res: Response): Promise<void> {
  const expense = await prisma.expense.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(expense);
}

export async function deleteExpense(req: Request, res: Response): Promise<void> {
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

export async function getCategories(_req: Request, res: Response): Promise<void> {
  res.json(EXPENSE_CATEGORIES);
}
