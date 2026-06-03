import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase";

const STATUS_MAP: Record<string, string> = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "void",
};

const REVERSE_STATUS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_MAP).map(([k, v]) => [v, k])
);

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "void"],
  sent: ["paid", "overdue", "void"],
  overdue: ["paid", "void"],
  paid: [],
  void: [],
};

export async function listDocuments(
  req: Request,
  res: Response
): Promise<void> {
  const { business_id, type, status } = req.query as Record<string, string>;

  let query = supabaseAdmin
    .from("invoices")
    .select("*, clients(id, name)")
    .order("created_at", { ascending: false });

  if (business_id) query = query.eq("business_id", business_id);
  if (status) {
    const mapped = STATUS_MAP[status] ?? status.toLowerCase();
    query = query.eq("status", mapped);
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
}

export async function getDocument(
  req: Request,
  res: Response
): Promise<void> {
  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .select("*, clients(*), invoice_items(*)")
    .eq("id", req.params.id)
    .single();

  if (error) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(invoice);
}

export async function createDocument(
  req: Request,
  res: Response
): Promise<void> {
  const {
    business_id,
    client_id,
    matter_id,
    issue_date,
    due_date,
    notes,
    payment_terms,
    tax = 0,
    items = [],
    status = "draft",
  } = req.body;

  const subtotal = items.reduce(
    (sum: number, it: any) => sum + (it.quantity ?? 1) * (it.rate ?? it.unit_price ?? 0),
    0
  );
  const total = subtotal + (tax ?? 0);

  const { data: numData, error: numErr } = await supabaseAdmin.rpc(
    "next_invoice_number",
    { _business_id: business_id }
  );

  if (numErr) {
    res.status(500).json({ error: numErr.message });
    return;
  }

  const { data: invoice, error: invErr } = await supabaseAdmin
    .from("invoices")
    .insert({
      business_id,
      client_id: client_id || null,
      matter_id: matter_id || null,
      number: numData as string,
      issue_date: issue_date ?? new Date().toISOString().slice(0, 10),
      due_date: due_date || null,
      subtotal,
      tax: tax ?? 0,
      total,
      notes: notes || null,
      payment_terms: payment_terms || null,
      status,
    })
    .select()
    .single();

  if (invErr) {
    res.status(400).json({ error: invErr.message });
    return;
  }

  if (items.length > 0) {
    const lineItems = items.map((it: any, idx: number) => ({
      invoice_id: invoice.id,
      business_id,
      kind: it.kind ?? "service",
      description: it.description,
      quantity: it.quantity ?? 1,
      rate: it.rate ?? it.unit_price ?? 0,
      amount: (it.quantity ?? 1) * (it.rate ?? it.unit_price ?? 0),
      sort_order: idx,
    }));

    const { error: itemErr } = await supabaseAdmin
      .from("invoice_items")
      .insert(lineItems);

    if (itemErr) {
      res.status(400).json({ error: itemErr.message });
      return;
    }
  }

  const { data: full } = await supabaseAdmin
    .from("invoices")
    .select("*, clients(*), invoice_items(*)")
    .eq("id", invoice.id)
    .single();

  res.status(201).json(full);
}

export async function updateDocument(
  req: Request,
  res: Response
): Promise<void> {
  // FIX: include business_id in the select so line-item replacement works correctly
  const { data: existing, error: findErr } = await supabaseAdmin
    .from("invoices")
    .select("status, business_id")
    .eq("id", req.params.id)
    .single();

  if (findErr) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  if (existing.status !== "draft") {
    res.status(422).json({ error: "Only draft documents can be edited" });
    return;
  }

  const { items, ...fields } = req.body;

  const { error: updErr } = await supabaseAdmin
    .from("invoices")
    .update(fields)
    .eq("id", req.params.id);

  if (updErr) {
    res.status(400).json({ error: updErr.message });
    return;
  }

  if (items) {
    await supabaseAdmin
      .from("invoice_items")
      .delete()
      .eq("invoice_id", req.params.id);

    if (items.length > 0) {
      // Now correctly falls back to the fetched existing.business_id
      const business_id = fields.business_id ?? existing.business_id;
      const lineItems = items.map((it: any, idx: number) => ({
        invoice_id: req.params.id,
        business_id,
        kind: it.kind ?? "service",
        description: it.description,
        quantity: it.quantity ?? 1,
        rate: it.rate ?? it.unit_price ?? 0,
        amount: (it.quantity ?? 1) * (it.rate ?? it.unit_price ?? 0),
        sort_order: idx,
      }));

      await supabaseAdmin.from("invoice_items").insert(lineItems);
    }
  }

  const { data: full } = await supabaseAdmin
    .from("invoices")
    .select("*, clients(*), invoice_items(*)")
    .eq("id", req.params.id)
    .single();

  res.json(full);
}

export async function updateDocumentStatus(
  req: Request,
  res: Response
): Promise<void> {
  const rawStatus = req.body.status as string;
  const status = STATUS_MAP[rawStatus] ?? rawStatus.toLowerCase();

  const { data: doc, error: findErr } = await supabaseAdmin
    .from("invoices")
    .select("status")
    .eq("id", req.params.id)
    .single();

  if (findErr) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const allowed = ALLOWED_TRANSITIONS[doc.status] ?? [];
  if (!allowed.includes(status)) {
    res.status(422).json({
      error: `Cannot transition from ${doc.status} to ${status}`,
      allowed,
    });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .update({ status })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
}

export async function deleteDocument(
  req: Request,
  res: Response
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("invoices")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(204).send();
}

export async function getDocumentPdf(
  req: Request,
  res: Response
): Promise<void> {
  res.status(501).json({
    error: "PDF generation is not yet available in this deployment",
  });
}