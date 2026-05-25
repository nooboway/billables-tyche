import { Router } from "express";
import { listExpenses, createExpense, updateExpense, deleteExpense, getCategories } from "../controllers/expense.controller";

const router = Router();
router.get("/categories", getCategories);
router.get("/", listExpenses);
router.post("/", createExpense);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);
export default router;
