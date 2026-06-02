import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase";

/**
 * Products/Services controller.
 * Maps the old Prisma "ProductService" model to the Supabase "services" table.
 */

export async function listProducts(req: Request, res: Response): Promise<void> {
  const { business_id, q } = req.query as Record<string, string>;

  let query = supabaseAdmin
    .from("services")
    .select("*")
    .order("name", { ascending: true });

  if (business_id) query = query.eq("business_id", business_id);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(data);
}

export async function createProduct(
  req: Request,
  res: Response
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("services")
    .insert(req.body)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
}

export async function updateProduct(
  req: Request,
  res: Response
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("services")
    .update(req.body)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
}

export async function deleteProduct(
  req: Request,
  res: Response
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("services")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(204).send();
}
