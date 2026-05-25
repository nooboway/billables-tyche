import { Request, Response } from "express";
import { prisma } from "../prisma";

export async function listClients(req: Request, res: Response): Promise<void> {
  const { business_id, q } = req.query as Record<string, string>;
  const clients = await prisma.client.findMany({
    where: {
      business_id,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    include: { _count: { select: { documents: true } } },
  });
  res.json(clients);
}

export async function getClient(req: Request, res: Response): Promise<void> {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      documents: {
        orderBy: { created_at: "desc" },
        take: 20,
        select: {
          id: true, document_number: true, type: true,
          status: true, total: true, created_at: true,
        },
      },
    },
  });
  res.json(client);
}

export async function createClient(req: Request, res: Response): Promise<void> {
  const client = await prisma.client.create({ data: req.body });
  res.status(201).json(client);
}

export async function updateClient(req: Request, res: Response): Promise<void> {
  const client = await prisma.client.update({ where: { id: req.params.id }, data: req.body });
  res.json(client);
}

export async function deleteClient(req: Request, res: Response): Promise<void> {
  await prisma.client.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
