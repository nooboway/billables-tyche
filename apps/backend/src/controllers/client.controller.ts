import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase";

export async function listClients(req: Request, res: Response): Promise<void> {
  const { business_id, q } = req.query as Record<string, string>;

  let query = supabaseAdmin
    .from("clients")
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

export async function getClient(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(data);
}

export async function createClient(
  req: Request,
  res: Response
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .insert(req.body)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
}

export async function updateClient(
  req: Request,
  res: Response
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("clients")
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

export async function deleteClient(
  req: Request,
  res: Response
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("clients")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(204).send();
}
