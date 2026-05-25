import { api } from "./api";

export interface Client {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address_street: string | null;
  address_city: string | null;
  tax_reg_no: string | null;
  _count?: { documents: number };
}

export interface ClientWithDocs extends Client {
  documents: {
    id: string;
    document_number: string;
    type: string;
    status: string;
    total: number;
    created_at: string;
  }[];
}

export async function fetchClients(businessId: string, q?: string): Promise<Client[]> {
  const params = new URLSearchParams({ business_id: businessId });
  if (q) params.set("q", q);
  const res = await api.get(`/clients?${params}`);
  return res.data;
}

export async function fetchClient(id: string): Promise<ClientWithDocs> {
  const res = await api.get(`/clients/${id}`);
  return res.data;
}

export async function createClient(payload: Omit<Client, "id" | "_count">): Promise<Client> {
  const res = await api.post("/clients", payload);
  return res.data;
}

export async function updateClient(id: string, payload: Partial<Client>): Promise<Client> {
  const res = await api.put(`/clients/${id}`, payload);
  return res.data;
}

export async function deleteClient(id: string): Promise<void> {
  await api.delete(`/clients/${id}`);
}
