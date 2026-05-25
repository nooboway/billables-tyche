import { Request, Response } from "express";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { prisma } from "../prisma";
import { calculateDocumentTotals } from "../services/calculation.service";
import { generateDocumentPdf } from "../templates/document.template";

const DOC_PREFIX: Record<DocumentType, string> = {
  INVOICE: "INV",
  ESTIMATE: "EST",
  PROFORMA: "PRO",
  DELIVERY_NOTE: "DEL",
  PURCHASE_ORDER: "PO",
};

const ALLOWED_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["PAID", "OVERDUE", "CANCELLED"],
  OVERDUE: ["PAID", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
};

async function nextDocumentNumber(businessId: string, type: DocumentType): Promise<string> {
  const count = await prisma.document.count({ where: { business_id: businessId, type } });
  const seq = String(count + 1).padStart(4, "0");
  return `${DOC_PREFIX[type]}-${seq}`;
}

export async function listDocuments(req: Request, res: Response): Promise<void> {
  const { business_id, type, status } = req.query as Record<string, string>;
  const documents = await prisma.document.findMany({
    where: {
      business_id,
      ...(type ? { type: type as DocumentType } : {}),
      ...(status ? { status: status as DocumentStatus } : {}),
    },
    orderBy: { created_at: "desc" },
    include: { client: { select: { id: true, name: true } } },
  });
  res.json(documents);
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  const doc = await prisma.document.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      client: true,
      items: {
        include: { product_service: { select: { id: true, name: true, sku: true, photo_url: true } } },
        orderBy: { sort_order: "asc" },
      },
    },
  });
  res.json(doc);
}

export async function createDocument(req: Request, res: Response): Promise<void> {
  const { business_id, type, client_id, reference, issue_date, due_date, notes,
    payment_method, discount_pct = 0, tax_pct = 750, items = [] } = req.body;

  const document_number = await nextDocumentNumber(business_id, type as DocumentType);
  const totals = calculateDocumentTotals(items, discount_pct, tax_pct);

  const doc = await prisma.document.create({
    data: {
      business_id,
      type,
      client_id: client_id || null,
      document_number,
      reference: reference || null,
      issue_date: issue_date ? new Date(issue_date) : new Date(),
      due_date: due_date ? new Date(due_date) : null,
      notes: notes || null,
      payment_method: payment_method || null,
      discount_pct,
      tax_pct,
      ...totals,
      items: {
        create: items.map((item: any, i: number) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_pct: item.tax_pct ?? 0,
          line_total: item.quantity * item.unit_price,
          product_service_id: item.product_service_id || null,
          sort_order: i,
        })),
      },
    },
    include: { items: true, client: true },
  });
  res.status(201).json(doc);
}

export async function updateDocument(req: Request, res: Response): Promise<void> {
  const existing = await prisma.document.findUniqueOrThrow({ where: { id: req.params.id } });

  if (existing.status !== "DRAFT") {
    res.status(422).json({ error: "Only DRAFT documents can be edited" });
    return;
  }

  const { items, discount_pct = existing.discount_pct, tax_pct = existing.tax_pct, ...fields } = req.body;
  const totals = items ? calculateDocumentTotals(items, discount_pct, tax_pct) : undefined;

  const doc = await prisma.document.update({
    where: { id: req.params.id },
    data: {
      ...fields,
      discount_pct,
      tax_pct,
      ...(totals ?? {}),
      ...(items
        ? {
            items: {
              deleteMany: {},
              create: items.map((item: any, i: number) => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_pct: item.tax_pct ?? 0,
                line_total: item.quantity * item.unit_price,
                product_service_id: item.product_service_id || null,
                sort_order: i,
              })),
            },
          }
        : {}),
    },
    include: { items: true, client: true },
  });
  res.json(doc);
}

export async function updateDocumentStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body as { status: DocumentStatus };
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: req.params.id } });

  if (!ALLOWED_TRANSITIONS[doc.status].includes(status)) {
    res.status(422).json({
      error: `Cannot transition from ${doc.status} to ${status}`,
      allowed: ALLOWED_TRANSITIONS[doc.status],
    });
    return;
  }

  const updated = await prisma.document.update({
    where: { id: req.params.id },
    data: {
      status,
      ...(status === "SENT" ? { sent_at: new Date() } : {}),
      ...(status === "PAID" ? { paid_at: new Date() } : {}),
    },
  });
  res.json(updated);
}

export async function deleteDocument(req: Request, res: Response): Promise<void> {
  await prisma.document.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

export async function getDocumentPdf(req: Request, res: Response): Promise<void> {
  const doc = await prisma.document.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      client: true,
      business: true,
      items: {
        include: { product_service: true },
        orderBy: { sort_order: "asc" },
      },
    },
  });

  const buffer = await generateDocumentPdf(doc as any);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${doc.document_number}.pdf"`);
  res.send(buffer);
}
