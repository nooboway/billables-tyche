import { Request, Response } from "express";
import { prisma } from "../prisma";

export async function listProducts(req: Request, res: Response): Promise<void> {
  const { business_id, q } = req.query as Record<string, string>;
  const products = await prisma.productService.findMany({
    where: {
      business_id,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
  });
  res.json(products);
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const product = await prisma.productService.findUniqueOrThrow({
    where: { id: req.params.id },
  });
  res.json(product);
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const product = await prisma.productService.create({ data: req.body });
  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const product = await prisma.productService.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(product);
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  await prisma.productService.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
